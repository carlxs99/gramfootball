import { createServerFn } from "@tanstack/react-start";
import { CARDS_BY_ID, type Rarity } from "./creatures";
import { round4, type OwnedEntry, type PlayerState } from "./progress";
import { ADMIN_TELEGRAM_ID } from "./admin.functions";

/**
 * Player-to-player card market. Fully server authoritative: the card is held in
 * escrow by the listing row (removed from the seller's collection when listed),
 * and the GRAM leg only runs after the listing has been atomically claimed.
 *
 * While MARKET_PUBLIC is false only the admin can use it; everybody else sees a
 * "coming soon" screen and every server call is rejected.
 */
export const MARKET_PUBLIC = false;

/** Commission kept by the game on every sale (GRAM sink). */
export const MARKET_FEE = 0.07;
export const MAX_ACTIVE_LISTINGS = 10;
export const MAX_ACTIVE_TRADES = 5;

/**
 * Price band per rarity. Caps stop multi-account farms from laundering GRAM by
 * selling a common at legendary prices; floors stop value dumping.
 */
export const PRICE_BAND: Record<Rarity, { min: number; max: number }> = {
  common: { min: 0.01, max: 0.5 },
  rare: { min: 0.05, max: 2 },
  epic: { min: 0.2, max: 8 },
  mythic: { min: 0.75, max: 25 },
  legendary: { min: 2, max: 80 },
};

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
  if (!MARKET_PUBLIC && user.id !== ADMIN_TELEGRAM_ID) {
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
  .handler(async ({ data }): Promise<{ open: boolean; admin: boolean }> => {
    const { verifyInitData } = await import("./telegram.server");
    const user = await verifyInitData(data.initData);
    const admin = user.id === ADMIN_TELEGRAM_ID;
    return { open: MARKET_PUBLIC || admin, admin };
  });

export const marketBrowse = createServerFn({ method: "POST" })
  .inputValidator((input: Input) => requireInitData(input))
  .handler(async ({ data }) => {
    const { user, supabaseAdmin } = await ctx(data.initData);
    const { data: rows, error } = await supabaseAdmin
      .from("market_listings")
      .select("id, seller_id, seller_name, card_id, price, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return {
      fee: MARKET_FEE,
      listings: ((rows ?? []) as Row[]).map((r) => toListing(r, user.id)),
    };
  });

function removeOne(owned: Record<string, OwnedEntry>, cardId: string) {
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
    if ((state.packsOpened ?? 0) < 1)
      throw new Error("Open your first pack before selling");

    const { count } = await supabaseAdmin
      .from("market_listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", user.id)
      .eq("status", "open");
    if ((count ?? 0) >= MAX_ACTIVE_LISTINGS)
      throw new Error(`You can have ${MAX_ACTIVE_LISTINGS} listings at most`);

    // Escrow: take the card out of the collection first, then publish it.
    const owned = removeOne(state.owned, data.cardId);
    const saved = await persistState(supabaseAdmin, user.id, { owned }, 0, {
      owned: state.owned,
    } as Record<string, unknown>);

    const { error } = await supabaseAdmin.from("market_listings").insert({
      seller_id: user.id,
      seller_name: state.name ?? "Collector",
      card_id: data.cardId,
      price: data.price,
      fee: round4(data.price * MARKET_FEE),
      status: "open",
    });
    if (error) {
      // Publishing failed: hand the card straight back.
      const { state: fresh } = await loadStateRaw(supabaseAdmin, user.id);
      await persistState(supabaseAdmin, user.id, { owned: addOne(fresh.owned, data.cardId) }, 0);
      throw new Error(error.message);
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

    const { state } = await loadStateRaw(supabaseAdmin, user.id);
    const saved = await persistState(
      supabaseAdmin,
      user.id,
      { owned: addOne(state.owned, row.card_id) },
      0,
    );
    return { state: saved as PlayerState };
  });

export const marketBuy = createServerFn({ method: "POST" })
  .inputValidator((input: Input & { id: string }) => {
    requireInitData(input);
    if (typeof input.id !== "string" || input.id.length < 10) throw new Error("Unknown listing");
    return input;
  })
  .handler(async ({ data }) => {
    const { user, supabaseAdmin, loadStateRaw, persistState } = await ctx(data.initData);

    const { data: found } = await supabaseAdmin
      .from("market_listings")
      .select("id, seller_id, card_id, price, status")
      .eq("id", data.id)
      .maybeSingle();
    if (!found || found.status !== "open") throw new Error("That listing is no longer available");
    if (Number(found.seller_id) === user.id) throw new Error("You cannot buy your own card");

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
    await persistState(supabaseAdmin, Number(row.seller_id), {}, payout);

    try {
      const { notifyUser } = await import("./telegram.server");
      const card = CARDS_BY_ID[row.card_id];
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
    return { trades: ((rows ?? []) as TradeRow[]).map((r) => toTrade(r, user.id)) };
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
    if ((state.packsOpened ?? 0) < 1) throw new Error("Open your first pack before trading");

    const { count } = await supabaseAdmin
      .from("market_trades")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .eq("status", "open");
    if ((count ?? 0) >= MAX_ACTIVE_TRADES)
      throw new Error(`You can have ${MAX_ACTIVE_TRADES} open trades at most`);

    const rarity = CARDS_BY_ID[data.offerCardId]!.rarity;
    const owned = removeOne(state.owned, data.offerCardId);
    const saved = await persistState(supabaseAdmin, user.id, { owned }, 0, {
      owned: state.owned,
    } as Record<string, unknown>);

    const { error } = await supabaseAdmin.from("market_trades").insert({
      owner_id: user.id,
      owner_name: state.name ?? "Collector",
      offer_card_id: data.offerCardId,
      want_card_id: data.wantCardId,
      want_rarity: rarity,
      status: "open",
    });
    if (error) {
      const { state: fresh } = await loadStateRaw(supabaseAdmin, user.id);
      await persistState(supabaseAdmin, user.id, { owned: addOne(fresh.owned, data.offerCardId) }, 0);
      throw new Error(error.message);
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

    const { state } = await loadStateRaw(supabaseAdmin, user.id);
    const saved = await persistState(
      supabaseAdmin,
      user.id,
      { owned: addOne(state.owned, row.offer_card_id) },
      0,
    );
    return { state: saved as PlayerState };
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

    const given = CARDS_BY_ID[data.cardId]!;
    if (found.want_card_id && found.want_card_id !== given.id)
      throw new Error("That trade asks for a different card");
    if (given.rarity !== found.want_rarity)
      throw new Error("The card you give must match the requested rarity");
    if (given.id === found.offer_card_id) throw new Error("Pick a different card");

    // Make sure the taker really owns the card BEFORE claiming the trade.
    const { state } = await loadStateRaw(supabaseAdmin, user.id);
    if ((state.packsOpened ?? 0) < 1) throw new Error("Open your first pack before trading");
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
      const nextOwned = addOne(removeOne(state.owned, given.id), row.offer_card_id);
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
    const { state: ownerState } = await loadStateRaw(supabaseAdmin, Number(row.owner_id));
    await persistState(
      supabaseAdmin,
      Number(row.owner_id),
      { owned: addOne(ownerState.owned, given.id) },
      0,
    );

    try {
      const { notifyUser } = await import("./telegram.server");
      await notifyUser(
        Number(row.owner_id),
        `🔄 Your trade went through: you gave <b>${CARDS_BY_ID[row.offer_card_id]?.name ?? "a card"}</b> and received <b>${given.name}</b>.`,
      );
    } catch {
      // A failed notification must never undo a completed trade.
    }

    return { state: saved, received: row.offer_card_id };
  });
