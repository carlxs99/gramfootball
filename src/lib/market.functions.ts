import { createServerFn } from "@tanstack/react-start";
import { CARDS_BY_ID, type Rarity } from "./creatures";
import { round4, verifiedPacks, type OwnedEntry, type PlayerState } from "./progress";

/**
 * Player-to-player card market. Fully server authoritative: the card is held in
 * escrow by the listing row (removed from the seller's collection when listed),
 * and the GRAM leg only runs after the listing has been atomically claimed.
 *
 * Open to every player. Set MARKET_PUBLIC to false to close it again (players
 * then see a "coming soon" screen and every server call is rejected).
 */
export const MARKET_PUBLIC = true;

/** Commission kept by the game on every sale (GRAM sink). */
export const MARKET_FEE = 0.03;
export const MAX_ACTIVE_LISTINGS = 10;
export const MAX_ACTIVE_TRADES = 5;

/**
 * Price band per rarity. Caps stop multi-account farms from laundering GRAM by
 * selling a common at legendary prices; floors stop value dumping.
 */
export const PRICE_BAND: Record<Rarity, { min: number; max: number }> = {
  common: { min: 0.01, max: 1 },
  rare: { min: 0.05, max: 4 },
  epic: { min: 0.2, max: 16 },
  mythic: { min: 0.75, max: 50 },
  legendary: { min: 2, max: 160 },
};

/** Suggested price per rarity, shown as a one-tap default when listing. */
export const SUGGESTED_PRICE: Record<Rarity, number> = {
  common: 0.2,
  rare: 0.8,
  epic: 3,
  mythic: 10,
  legendary: 30,
};

/** Listings and swaps older than this are cancelled and the card handed back. */
export const LISTING_TTL_DAYS = 7;

export const MIN_PRICE = PRICE_BAND.common.min;
export const MAX_PRICE = PRICE_BAND.legendary.max;

type Input = { initData: string };

function requireInitData<T extends Input>(input: T) {
  if (!input || typeof input.initData !== "string" || input.initData.length < 10) {
    throw new Error("Missing Telegram session");
  }
  return input;
}

async function ctx(initData: string) {
  const { verifyInitData } = await import("./telegram.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const helpers = await import("./referrals.server");
  const user = await verifyInitData(initData);
  await helpers.assertNotBanned(supabaseAdmin, user.id);
  if (!MARKET_PUBLIC) {
    throw new Error("The market is not open yet");
  }
  return { user, supabaseAdmin, ...helpers };
}

export type Listing = {
  id: string;
  cardId: string;
  price: number;
  sellerId: number;
  sellerName: string;
  mine: boolean;
  createdAt: string;
};

type Row = {
  id: string;
  seller_id: number | string;
  seller_name: string | null;
  card_id: string;
  price: number | string;
  created_at: string;
};

const toListing = (row: Row, viewer: number): Listing => ({
  id: row.id,
  cardId: row.card_id,
  price: Number(row.price),
  sellerId: Number(row.seller_id),
  sellerName: row.seller_name || "Collector",
  mine: Number(row.seller_id) === viewer,
  createdAt: row.created_at,
});

/** Tells the UI whether the market is usable by this player. */
export const marketAccess = createServerFn({ method: "POST" })
  .inputValidator((input: Input) => requireInitData(input))
  .handler(async ({ data }): Promise<{ open: boolean }> => {
    const { verifyInitData } = await import("./telegram.server");
    await verifyInitData(data.initData);
    return { open: MARKET_PUBLIC };
  });

export const marketBrowse = createServerFn({ method: "POST" })
  .inputValidator((input: Input) => requireInitData(input))
  .handler(async ({ data }) => {
    const { user, supabaseAdmin } = await ctx(data.initData);
    await sweepExpired(supabaseAdmin).catch(() => {});
    const { data: rows, error } = await supabaseAdmin
      .from("market_listings")
      .select("id, seller_id, seller_name, card_id, price, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as Row[];
    const blocked = await bannedIds(supabaseAdmin, [...new Set(list.map((r) => Number(r.seller_id)))]);
    return {
      fee: MARKET_FEE,
      listings: list
        .filter((r) => !blocked.has(Number(r.seller_id)) || Number(r.seller_id) === user.id)
        .map((r) => toListing(r, user.id)),
    };
  });

/**
 * Takes one copy out of a collection. Selling your last copy is allowed: it is
 * the player's own decision, and the card simply leaves the album.
 */
function removeSpare(owned: Record<string, OwnedEntry>, cardId: string) {
  const entry = owned[cardId];
  if (!entry || entry.qty < 1) throw new Error("You do not own that card");
  const next = { ...owned };
  if (entry.qty <= 1) delete next[cardId];
  else next[cardId] = { ...entry, qty: entry.qty - 1 };
  return next;
}

function addOne(owned: Record<string, OwnedEntry>, cardId: string) {
  const entry = owned[cardId];
  const next = { ...owned };
  next[cardId] = entry
    ? { ...entry, qty: entry.qty + 1 }
    : { qty: 1, level: 1, xp: 0 };
  return next;
}

/**
 * Hands a card to a player with an optimistic guard so a concurrent write
 * (pack opening, another trade) can never clobber the collection. Retries with
 * fresh state instead of silently dropping the card.
 */
async function giveCard(
  admin: any,
  loadStateRaw: any,
  persistState: any,
  telegramId: number,
  cardId: string,
): Promise<PlayerState> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    const { state } = await loadStateRaw(admin, telegramId);
    try {
      return (await persistState(
        admin,
        telegramId,
        { owned: addOne(state.owned, cardId) },
        0,
        { owned: state.owned } as Record<string, unknown>,
      )) as PlayerState;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Could not deliver the card");
}

/**
 * Cancels listings and swaps older than LISTING_TTL_DAYS and returns every
 * escrowed card to its owner. Idempotent: rows are claimed atomically, so two
 * concurrent sweeps can never refund the same card twice.
 */
async function sweepExpired(admin: any) {
  const helpers = await import("./referrals.server");
  const cutoff = new Date(Date.now() - LISTING_TTL_DAYS * 86400000).toISOString();

  const { data: listings } = await admin
    .from("market_listings")
    .update({ status: "expired" })
    .eq("status", "open")
    .lt("created_at", cutoff)
    .select("id, seller_id, card_id");
  for (const row of (listings ?? []) as { id: string; seller_id: number | string; card_id: string }[]) {
    try {
      await giveCard(admin, helpers.loadStateRaw, helpers.persistState, Number(row.seller_id), row.card_id);
      const { notifyUser } = await import("./telegram.server");
      await notifyUser(
        Number(row.seller_id),
        `\u23F3 Your listing for <b>${CARDS_BY_ID[row.card_id]?.name ?? "a card"}</b> expired after ${LISTING_TTL_DAYS} days. The card is back in your album.`,
      ).catch(() => {});
    } catch (err) {
      // The card could not be returned: reopen the listing so the next sweep
      // retries instead of leaving the card stuck in escrow forever.
      console.error("sweepExpired: listing refund failed", row.id, err);
      await admin.from("market_listings").update({ status: "open" }).eq("id", row.id);
    }
  }

  const { data: trades } = await admin
    .from("market_trades")
    .update({ status: "expired" })
    .eq("status", "open")
    .lt("created_at", cutoff)
    .select("id, owner_id, offer_card_id");
  for (const row of (trades ?? []) as { id: string; owner_id: number | string; offer_card_id: string }[]) {
    try {
      await giveCard(admin, helpers.loadStateRaw, helpers.persistState, Number(row.owner_id), row.offer_card_id);
      const { notifyUser } = await import("./telegram.server");
      await notifyUser(
        Number(row.owner_id),
        `\u23F3 Your swap offering <b>${CARDS_BY_ID[row.offer_card_id]?.name ?? "a card"}</b> expired after ${LISTING_TTL_DAYS} days. The card is back in your album.`,
      ).catch(() => {});
    } catch (err) {
      // Same here: reopen so the card is never lost in escrow.
      console.error("sweepExpired: swap refund failed", row.id, err);
      await admin.from("market_trades").update({ status: "open" }).eq("id", row.id);
    }
  }

  return { listings: (listings ?? []).length, trades: (trades ?? []).length };
}

/** Ids of suspended players, so their listings never appear or pay out. */
async function bannedIds(admin: any, ids: number[]): Promise<Set<number>> {
  if (!ids.length) return new Set();
  const { data } = await admin
    .from("players")
    .select("telegram_id")
    .in("telegram_id", ids)
    .eq("banned", true);
  return new Set(((data ?? []) as { telegram_id: number | string }[]).map((r) => Number(r.telegram_id)));
}

/**
 * Durable payout fallback. If crediting a seller fails (or the seller is
 * suspended), the amount is stored instead of being lost; the sweep below pays
 * it on a later market request.
 */
async function parkPayout(
  admin: any,
  telegramId: number,
  amount: number,
  reason: string,
  lastError?: string,
) {
  if (!(amount > 0)) return;
  const { error } = await admin.from("pending_payouts").insert({
    telegram_id: telegramId,
    amount,
    reason,
    last_error: lastError ?? null,
  });
  if (error) console.error("parkPayout failed", telegramId, amount, reason, error.message);
}

/** Pays a few parked payouts, skipping suspended accounts. Best effort. */
async function sweepPendingPayouts(admin: any) {
  const { data } = await admin
    .from("pending_payouts")
    .select("id, telegram_id, amount, attempts")
    .is("paid_at", null)
    .lt("attempts", 8)
    .order("created_at", { ascending: true })
    .limit(10);
  const rows = (data ?? []) as {
    id: string;
    telegram_id: number | string;
    amount: number | string;
    attempts: number;
  }[];
  if (!rows.length) return;
  for (const row of rows) {
    try {
      // The database locks the payout and credits it in one transaction. Two
      // concurrent market requests can therefore never pay the same row twice.
      const { error } = await admin.rpc("settle_pending_payout", {
        p_payout_id: row.id,
      });
      if (error) throw new Error(error.message);
    } catch (err) {
      console.error("Pending market payout settlement failed", row.id, err);
    }
  }
}



export const marketSell = createServerFn({ method: "POST" })
  .inputValidator((input: Input & { cardId: string; price: number }) => {
    requireInitData(input);
    if (typeof input.cardId !== "string" || !CARDS_BY_ID[input.cardId])
      throw new Error("Unknown card");
    const price = Number(input.price);
    const band = PRICE_BAND[CARDS_BY_ID[input.cardId]!.rarity];
    if (!Number.isFinite(price) || price < band.min || price > band.max)
      throw new Error(`Price for this rarity must be between ${band.min} and ${band.max} GRAM`);
    return { ...input, price: round4(price) };
  })
  .handler(async ({ data }) => {
    const { user, supabaseAdmin, loadStateRaw, persistState } = await ctx(data.initData);
    const { state } = await loadStateRaw(supabaseAdmin, user.id);
    if (verifiedPacks(state) < 1)
      throw new Error("Open your first pack before selling");

    const { count } = await supabaseAdmin
      .from("market_listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", user.id)
      .eq("status", "open");
    if ((count ?? 0) >= MAX_ACTIVE_LISTINGS)
      throw new Error(`You can have ${MAX_ACTIVE_LISTINGS} listings at most`);

    // Escrow: take the card out of the collection first, then publish it.
    const owned = removeSpare(state.owned, data.cardId);
    const saved = await persistState(supabaseAdmin, user.id, { owned }, 0, {
      owned: state.owned,
    } as Record<string, unknown>);

    const sellerName = user.username || user.first_name || state.name;
    const { data: inserted, error } = await supabaseAdmin
      .from("market_listings")
      .insert({
        seller_id: user.id,
        seller_name: sellerName,
        card_id: data.cardId,
        price: data.price,
        fee: round4(data.price * MARKET_FEE),
        status: "open",
      })
      .select("id")
      .maybeSingle();
    if (error) {
      // Publishing failed: hand the card straight back.
      await giveCard(supabaseAdmin, loadStateRaw, persistState, user.id, data.cardId);
      throw new Error(error.message);
    }

    // The count above can be stale when several requests race, so re-check once
    // the row exists and roll this one back if the cap was exceeded.
    const { count: after } = await supabaseAdmin
      .from("market_listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", user.id)
      .eq("status", "open");
    if ((after ?? 0) > MAX_ACTIVE_LISTINGS && inserted?.id) {
      await supabaseAdmin.from("market_listings").delete().eq("id", inserted.id);
      const back = await giveCard(supabaseAdmin, loadStateRaw, persistState, user.id, data.cardId);
      void back;
      throw new Error(`You can have ${MAX_ACTIVE_LISTINGS} listings at most`);
    }
    return { state: saved as PlayerState };
  });

export const marketCancel = createServerFn({ method: "POST" })
  .inputValidator((input: Input & { id: string }) => {
    requireInitData(input);
    if (typeof input.id !== "string" || input.id.length < 10) throw new Error("Unknown listing");
    return input;
  })
  .handler(async ({ data }) => {
    const { user, supabaseAdmin, loadStateRaw, persistState } = await ctx(data.initData);
    // Atomic claim: only the row still open and owned by this seller flips.
    const { data: rows, error } = await supabaseAdmin
      .from("market_listings")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("seller_id", user.id)
      .eq("status", "open")
      .select("card_id");
    if (error) throw new Error(error.message);
    const row = rows?.[0];
    if (!row) throw new Error("That listing is no longer available");

    const saved = await giveCard(supabaseAdmin, loadStateRaw, persistState, user.id, row.card_id);
    return { state: saved };
  });

export const marketBuy = createServerFn({ method: "POST" })
  .inputValidator((input: Input & { id: string }) => {
    requireInitData(input);
    if (typeof input.id !== "string" || input.id.length < 10) throw new Error("Unknown listing");
    return input;
  })
  .handler(async ({ data }) => {
    const { user, supabaseAdmin, loadStateRaw, persistState } = await ctx(data.initData);
    // Pay anything that a previous sale could not credit right away.
    await sweepPendingPayouts(supabaseAdmin);

    const { data: found } = await supabaseAdmin
      .from("market_listings")
      .select("id, seller_id, card_id, price, status")
      .eq("id", data.id)
      .maybeSingle();
    if (!found || found.status !== "open") throw new Error("That listing is no longer available");
    if (Number(found.seller_id) === user.id) throw new Error("You cannot buy your own card");
    if ((await bannedIds(supabaseAdmin, [Number(found.seller_id)])).size)
      throw new Error("That listing is no longer available");

    // Atomic claim so two buyers can never take the same card.
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from("market_listings")
      .update({ status: "sold", buyer_id: user.id, sold_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("status", "open")
      .select("id, seller_id, card_id, price");
    if (claimError) throw new Error(claimError.message);
    const row = claimed?.[0];
    if (!row) throw new Error("That listing is no longer available");

    const price = round4(Number(row.price));
    const fee = round4(price * MARKET_FEE);
    const payout = round4(price - fee);

    let saved: PlayerState;
    try {
      const { state } = await loadStateRaw(supabaseAdmin, user.id);
      if (state.gram < price) throw new Error("Not enough GRAM in your balance");
      saved = await persistState(
        supabaseAdmin,
        user.id,
        { owned: addOne(state.owned, row.card_id) },
        -price,
        { owned: state.owned } as Record<string, unknown>,
      );
    } catch (err) {
      // Buyer was not charged: put the card back on sale.
      await supabaseAdmin
        .from("market_listings")
        .update({ status: "open", buyer_id: null, sold_at: null })
        .eq("id", row.id);
      throw err;
    }

    // Seller leg: the card already left their collection when they listed it.
    // The buyer is charged at this point, so the payout is retried instead of
    // being lost if the write fails once.
    // A banned seller is never paid: the amount is parked for admin review.
    const sellerBanned = (await bannedIds(supabaseAdmin, [Number(row.seller_id)])).size > 0;
    if (sellerBanned) {
      await parkPayout(supabaseAdmin, Number(row.seller_id), payout, `market:${row.id}:banned`);
    } else {
      let paid = false;
      for (let attempt = 0; attempt < 3 && !paid; attempt++) {
        try {
          await persistState(supabaseAdmin, Number(row.seller_id), {}, payout);
          paid = true;
        } catch (err) {
          if (attempt === 2) {
            console.error("Market payout failed", row.id, err);
            // Durable fallback: the seller is credited by the sweep below on a
            // later request, so proceeds can never be silently lost.
            await parkPayout(
              supabaseAdmin,
              Number(row.seller_id),
              payout,
              `market:${row.id}`,
              err instanceof Error ? err.message : String(err),
            );
          } else {
            await new Promise((r) => setTimeout(r, 300));
          }
        }
      }
    }

    try {
      const { notifyUser } = await import("./telegram.server");
      const card = CARDS_BY_ID[row.card_id];
      await notifyUser(
        user.id,
        `🎴 You bought <b>${card?.name ?? "a card"}</b> for <b>${price} GRAM</b>. It is already in your album.`,
      );
      await notifyUser(
        Number(row.seller_id),
        `🛒 Your <b>${card?.name ?? "card"}</b> sold for <b>${price} GRAM</b>. You received <b>${payout} GRAM</b> after the ${Math.round(MARKET_FEE * 100)}% fee.`,
      );
    } catch {
      // A failed notification must never undo a completed sale.
    }

    return { state: saved, cardId: row.card_id, price };
  });

/* ------------------------------------------------------------------ *
 * Card-for-card trades
 *
 * Logic guardrails:
 *  - the offered card is escrowed exactly like a sale listing;
 *  - the requested card must be of the SAME rarity as the offered one,
 *    so trades cannot be used to launder value between accounts;
 *  - an owner cannot request the very card they are offering;
 *  - a trade can request one specific card, or "any card of that rarity".
 * ------------------------------------------------------------------ */

export type Trade = {
  id: string;
  ownerId: number;
  ownerName: string;
  offerCardId: string;
  wantCardId: string | null;
  wantRarity: Rarity;
  mine: boolean;
  createdAt: string;
};

type TradeRow = {
  id: string;
  owner_id: number | string;
  owner_name: string | null;
  offer_card_id: string;
  want_card_id: string | null;
  want_rarity: string;
  created_at: string;
};

const toTrade = (row: TradeRow, viewer: number): Trade => ({
  id: row.id,
  ownerId: Number(row.owner_id),
  ownerName: row.owner_name || "Collector",
  offerCardId: row.offer_card_id,
  wantCardId: row.want_card_id,
  wantRarity: row.want_rarity as Rarity,
  mine: Number(row.owner_id) === viewer,
  createdAt: row.created_at,
});

export const tradeBrowse = createServerFn({ method: "POST" })
  .inputValidator((input: Input) => requireInitData(input))
  .handler(async ({ data }) => {
    const { user, supabaseAdmin } = await ctx(data.initData);
    const { data: rows, error } = await supabaseAdmin
      .from("market_trades")
      .select("id, owner_id, owner_name, offer_card_id, want_card_id, want_rarity, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as TradeRow[];
    const blocked = await bannedIds(supabaseAdmin, [...new Set(list.map((r) => Number(r.owner_id)))]);
    return {
      trades: list
        .filter((r) => !blocked.has(Number(r.owner_id)) || Number(r.owner_id) === user.id)
        .map((r) => toTrade(r, user.id)),
    };
  });

export const tradeCreate = createServerFn({ method: "POST" })
  .inputValidator((input: Input & { offerCardId: string; wantCardId: string | null }) => {
    requireInitData(input);
    const offer = CARDS_BY_ID[input.offerCardId];
    if (!offer) throw new Error("Unknown card");
    const want = input.wantCardId ? CARDS_BY_ID[input.wantCardId] : null;
    if (input.wantCardId && !want) throw new Error("Unknown requested card");
    if (want && want.id === offer.id) throw new Error("Pick a different card to receive");
    if (want && want.rarity !== offer.rarity)
      throw new Error("Trades must be between cards of the same rarity");
    return { initData: input.initData, offerCardId: offer.id, wantCardId: want?.id ?? null };
  })
  .handler(async ({ data }) => {
    const { user, supabaseAdmin, loadStateRaw, persistState } = await ctx(data.initData);
    const { state } = await loadStateRaw(supabaseAdmin, user.id);
    if (verifiedPacks(state) < 1) throw new Error("Open your first pack before trading");

    const { count } = await supabaseAdmin
      .from("market_trades")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .eq("status", "open");
    if ((count ?? 0) >= MAX_ACTIVE_TRADES)
      throw new Error(`You can have ${MAX_ACTIVE_TRADES} open trades at most`);

    const rarity = CARDS_BY_ID[data.offerCardId]!.rarity;
    const owned = removeSpare(state.owned, data.offerCardId);
    const saved = await persistState(supabaseAdmin, user.id, { owned }, 0, {
      owned: state.owned,
    } as Record<string, unknown>);

    const ownerName = user.username || user.first_name || state.name;
    const { data: inserted, error } = await supabaseAdmin
      .from("market_trades")
      .insert({
        owner_id: user.id,
        owner_name: ownerName,
        offer_card_id: data.offerCardId,
        want_card_id: data.wantCardId,
        want_rarity: rarity,
        status: "open",
      })
      .select("id")
      .maybeSingle();
    if (error) {
      await giveCard(supabaseAdmin, loadStateRaw, persistState, user.id, data.offerCardId);
      throw new Error(error.message);
    }

    // Re-check after the insert: concurrent requests can all pass the count above.
    const { count: after } = await supabaseAdmin
      .from("market_trades")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .eq("status", "open");
    if ((after ?? 0) > MAX_ACTIVE_TRADES && inserted?.id) {
      await supabaseAdmin.from("market_trades").delete().eq("id", inserted.id);
      await giveCard(supabaseAdmin, loadStateRaw, persistState, user.id, data.offerCardId);
      throw new Error(`You can have ${MAX_ACTIVE_TRADES} open trades at most`);
    }
    return { state: saved as PlayerState };
  });

export const tradeCancel = createServerFn({ method: "POST" })
  .inputValidator((input: Input & { id: string }) => {
    requireInitData(input);
    if (typeof input.id !== "string" || input.id.length < 10) throw new Error("Unknown trade");
    return input;
  })
  .handler(async ({ data }) => {
    const { user, supabaseAdmin, loadStateRaw, persistState } = await ctx(data.initData);
    const { data: rows, error } = await supabaseAdmin
      .from("market_trades")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("owner_id", user.id)
      .eq("status", "open")
      .select("offer_card_id");
    if (error) throw new Error(error.message);
    const row = rows?.[0];
    if (!row) throw new Error("That trade is no longer available");

    const saved = await giveCard(supabaseAdmin, loadStateRaw, persistState, user.id, row.offer_card_id);
    return { state: saved };
  });

export const tradeAccept = createServerFn({ method: "POST" })
  .inputValidator((input: Input & { id: string; cardId: string }) => {
    requireInitData(input);
    if (typeof input.id !== "string" || input.id.length < 10) throw new Error("Unknown trade");
    if (typeof input.cardId !== "string" || !CARDS_BY_ID[input.cardId])
      throw new Error("Unknown card");
    return input;
  })
  .handler(async ({ data }) => {
    const { user, supabaseAdmin, loadStateRaw, persistState } = await ctx(data.initData);

    const { data: found } = await supabaseAdmin
      .from("market_trades")
      .select("id, owner_id, offer_card_id, want_card_id, want_rarity, status")
      .eq("id", data.id)
      .maybeSingle();
    if (!found || found.status !== "open") throw new Error("That trade is no longer available");
    if (Number(found.owner_id) === user.id) throw new Error("You cannot accept your own trade");
    if ((await bannedIds(supabaseAdmin, [Number(found.owner_id)])).size)
      throw new Error("That trade is no longer available");

    const given = CARDS_BY_ID[data.cardId]!;
    if (found.want_card_id && found.want_card_id !== given.id)
      throw new Error("That trade asks for a different card");
    if (given.rarity !== found.want_rarity)
      throw new Error("The card you give must match the requested rarity");
    if (given.id === found.offer_card_id) throw new Error("Pick a different card");

    // Make sure the taker really owns the card BEFORE claiming the trade.
    const { state } = await loadStateRaw(supabaseAdmin, user.id);
    if (verifiedPacks(state) < 1) throw new Error("Open your first pack before trading");
    if (!state.owned[given.id] || state.owned[given.id]!.qty < 1)
      throw new Error("You do not own that card");

    const { data: claimed, error: claimError } = await supabaseAdmin
      .from("market_trades")
      .update({
        status: "done",
        taker_id: user.id,
        taker_card_id: given.id,
        done_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("status", "open")
      .select("id, owner_id, offer_card_id");
    if (claimError) throw new Error(claimError.message);
    const row = claimed?.[0];
    if (!row) throw new Error("That trade is no longer available");

    let saved: PlayerState;
    try {
      const nextOwned = addOne(removeSpare(state.owned, given.id), row.offer_card_id);
      saved = await persistState(supabaseAdmin, user.id, { owned: nextOwned }, 0, {
        owned: state.owned,
      } as Record<string, unknown>);
    } catch (err) {
      // Taker was not charged a card: reopen the trade.
      await supabaseAdmin
        .from("market_trades")
        .update({ status: "open", taker_id: null, taker_card_id: null, done_at: null })
        .eq("id", row.id);
      throw err;
    }

    // Owner leg: their offered card already left their collection at creation.
    await giveCard(supabaseAdmin, loadStateRaw, persistState, Number(row.owner_id), given.id);

    try {
      const { notifyUser } = await import("./telegram.server");
      await notifyUser(
        Number(row.owner_id),
        `🔄 Your trade went through: you gave <b>${CARDS_BY_ID[row.offer_card_id]?.name ?? "a card"}</b> and received <b>${given.name}</b>.`,
      );
      await notifyUser(
        user.id,
        `🔄 Trade complete: you gave <b>${given.name}</b> and received <b>${CARDS_BY_ID[row.offer_card_id]?.name ?? "a card"}</b>.`,
      );
    } catch {
      // A failed notification must never undo a completed trade.
    }

    return { state: saved, received: row.offer_card_id };
  });
