import { createServerFn } from "@tanstack/react-start";

/** TON wallet: deposits (auto-detected by memo tag) and instant withdrawals. */

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

const DEPOSIT_MEMO_PREFIX = "GF-";
const PAYOUT_MEMO = "GRAM Football Payout";

function newDepositMemo() {
  return DEPOSIT_MEMO_PREFIX + crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
}

async function ensureDepositMemo(supabaseAdmin: any, telegramId: number): Promise<string> {
  const { data: current } = await supabaseAdmin
    .from("players")
    .select("memo_tag")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  const existing = current?.memo_tag as string | null;
  if (existing?.startsWith(DEPOSIT_MEMO_PREFIX)) return existing;

  for (let attempt = 0; attempt < 5; attempt++) {
    const memo = newDepositMemo();
    const { data, error } = await supabaseAdmin
      .from("players")
      .update({ memo_tag: memo })
      .eq("telegram_id", telegramId)
      .select("memo_tag")
      .single();
    if (!error && data?.memo_tag) return data.memo_tag as string;
    if (error && error.code !== "23505") throw new Error(error.message);
  }
  throw new Error("Could not create a unique deposit memo");
}

export type WalletSummary = {
  memo: string;
  depositAddress: string;
  tonAddress: string | null;
  gram: number;
  feeRate: number;
  minWithdraw: number;
  minDeposit: number;
  packsOpened: number;
  deposits: Array<{ id: string; amount: number; hash: string; at: string }>;
  withdrawals: Array<{
    id: string;
    amount: number;
    net: number;
    status: string;
    hash: string | null;
    at: string;
  }>;
};

async function ctx(initData: string) {
  const { verifyInitData } = await import("./telegram.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const user = await verifyInitData(initData);
  const { assertNotBanned } = await import("./referrals.server");
  await assertNotBanned(supabaseAdmin, user.id);
  return { user, supabaseAdmin };
}

/** Reads the chain once and credits every deposit that carries a known memo tag. */
async function scanDeposits(supabaseAdmin: any) {
  const { fetchIncoming, MIN_DEPOSIT } = await import("./ton.server");

  const { data: cursor } = await supabaseAdmin
    .from("ton_scan_state")
    .select("last_lt, updated_at")
    .eq("id", "deposits")
    .maybeSingle();

  // Throttle: one chain scan every 10s no matter how many players are online,
  // so nobody can hammer the chain API by refreshing the wallet screen.
  const lastScan = cursor?.updated_at ? Date.parse(cursor.updated_at as string) : 0;
  if (lastScan && Date.now() - lastScan < 10000) return;

  const sinceLt = Number(cursor?.last_lt ?? 0);

  let incoming: Awaited<ReturnType<typeof fetchIncoming>> = [];
  try {
    incoming = await fetchIncoming(sinceLt);
  } catch (error) {
    console.error("Deposit scan failed", error);
    return;
  }
  await supabaseAdmin
    .from("ton_scan_state")
    .upsert(
      { id: "deposits", last_lt: sinceLt, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    );

  if (!incoming.length) return;

  let maxLt = sinceLt;
  for (const tx of incoming) {
    maxLt = Math.max(maxLt, tx.lt);
    if (tx.amount < MIN_DEPOSIT || !tx.memo) continue;

    // Some wallets decorate comments with surrounding text. Extract exactly
    // one GRAM Football memo while keeping the stored chain comment untouched.
    const memoMatch = tx.memo.toUpperCase().match(/(?:^|\s)(GF-[A-F0-9]{12})(?=$|\s)/);
    const memo = memoMatch?.[1];
    if (!memo) continue;

    const { data: player } = await supabaseAdmin
      .from("players")
      .select("telegram_id, state, banned")
      .eq("memo_tag", memo)
      .maybeSingle();
    if (!player) continue;

    // Register and credit in one database transaction. A crash can no longer
    // leave a deposit recorded without its balance, or vice versa.
    const { data: result, error } = await supabaseAdmin.rpc("process_ton_deposit", {
      p_telegram_id: player.telegram_id,
      p_tx_hash: tx.hash,
      p_lt: tx.lt,
      p_amount: tx.amount,
      p_memo: tx.memo,
      p_from_address: tx.from,
    });
    if (error) {
      console.error("Deposit processing failed", tx.hash, error.message);
      // Never move the cursor past a deposit that failed to persist.
      throw new Error(error.message);
    }
    const processed = result as { credited?: boolean; gram?: number } | null;
    if (!processed?.credited) continue; // duplicate transaction, already credited

    const { payReferrals } = await import("./referrals.server");
    const { notifyUser } = await import("./telegram.server");
    // Deposits from suspended accounts are credited but pay no commission.
    if (!player.banned) await payReferrals(supabaseAdmin, player.telegram_id, tx.amount);
    await notifyUser(
      player.telegram_id,
      `✅ <b>Deposit confirmed</b>\n+${tx.amount.toFixed(2)} GRAM\n\nNew balance: <b>${Number(processed.gram).toFixed(2)} GRAM</b>`,
    );
  }

  await supabaseAdmin
    .from("ton_scan_state")
    .upsert(
      { id: "deposits", last_lt: maxLt, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    );
}

async function summary(supabaseAdmin: any, telegramId: number): Promise<WalletSummary> {
  const { DEPOSIT_ADDRESS, WITHDRAW_FEE_RATE, MIN_WITHDRAW, MIN_DEPOSIT } =
    await import("./ton.server");

  const { data: player } = await supabaseAdmin
    .from("players")
    .select("state, memo_tag, ton_address")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  const { data: deposits } = await supabaseAdmin
    .from("ton_deposits")
    .select("id, amount, tx_hash, created_at")
    .eq("telegram_id", telegramId)
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: withdrawals } = await supabaseAdmin
    .from("withdrawals")
    .select("id, amount, net, status, tx_hash, created_at")
    .eq("telegram_id", telegramId)
    .order("created_at", { ascending: false })
    .limit(100);

  const state = (player?.state ?? {}) as Record<string, Json>;

  return {
    memo: (player?.memo_tag as string | null) ?? "",
    depositAddress: DEPOSIT_ADDRESS,
    tonAddress: (player?.ton_address as string | null) ?? null,
    gram: Number(state["gram"] ?? 0) || 0,
    feeRate: WITHDRAW_FEE_RATE,
    minWithdraw: MIN_WITHDRAW,
    minDeposit: MIN_DEPOSIT,
    packsOpened: (await import("./progress")).verifiedPacks({
      packsOpened: Number(state["packsOpened"] ?? 0) || 0,
      xp: Number(state["xp"] ?? 0) || 0,
    }),
    deposits: (deposits ?? []).map((d: any) => ({
      id: d.id as string,
      amount: Number(d.amount),
      hash: d.tx_hash as string,
      at: d.created_at as string,
    })),
    withdrawals: (withdrawals ?? []).map((w: any) => ({
      id: w.id as string,
      amount: Number(w.amount),
      net: Number(w.net),
      status: w.status as string,
      hash: (w.tx_hash as string | null) ?? null,
      at: w.created_at as string,
    })),
  };
}

export const getWallet = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string; scan?: boolean }) => {
    if (!input || typeof input.initData !== "string") throw new Error("Missing Telegram session");
    return input;
  })
  .handler(async ({ data }) => {
    const { user, supabaseAdmin } = await ctx(data.initData);
    // Every player receives an opaque, unique GRAM Football deposit memo.
    await ensureDepositMemo(supabaseAdmin, user.id);
    if (data.scan !== false) await scanDeposits(supabaseAdmin);
    return summary(supabaseAdmin, user.id);
  });

export const saveTonAddress = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string; address: string | null }) => {
    if (!input || typeof input.initData !== "string") throw new Error("Missing Telegram session");
    return input;
  })
  .handler(async ({ data }) => {
    const { user, supabaseAdmin } = await ctx(data.initData);
    const { isValidAddress } = await import("./ton.server");
    const address = data.address?.trim() || null;
    if (address && !(await isValidAddress(address)))
      throw new Error("That TON address is not valid");
    await supabaseAdmin.from("players").update({ ton_address: address }).eq("telegram_id", user.id);
    return { tonAddress: address };
  });

export const requestWithdrawal = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string; amount: number; address: string }) => {
    if (!input || typeof input.initData !== "string") throw new Error("Missing Telegram session");
    if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Invalid amount");
    if (typeof input.address !== "string" || input.address.length > 128)
      throw new Error("That TON address is not valid");
    return input;
  })
  .handler(async ({ data }) => {
    const { user, supabaseAdmin } = await ctx(data.initData);
    const { sendTon, isValidAddress, WITHDRAW_FEE_RATE, MIN_WITHDRAW, MAX_WITHDRAW } =
      await import("./ton.server");

    const address = data.address.trim();
    if (!(await isValidAddress(address))) throw new Error("That TON address is not valid");

    const amount = Math.round(data.amount * 10000) / 10000;
    if (amount < MIN_WITHDRAW - 1e-9) throw new Error(`Minimum withdrawal is ${MIN_WITHDRAW} GRAM`);
    if (amount > MAX_WITHDRAW) throw new Error(`Maximum withdrawal is ${MAX_WITHDRAW} GRAM`);

    // One payout at a time per player: prevents parallel requests from racing
    // the hot wallet and keeps refunds unambiguous.
    const { count: inFlight } = await supabaseAdmin
      .from("withdrawals")
      .select("id", { count: "exact", head: true })
      .eq("telegram_id", user.id)
      .eq("status", "sending");
    if ((inFlight ?? 0) > 0) throw new Error("A withdrawal is already being processed");

    const fee = Math.round(amount * WITHDRAW_FEE_RATE * 10000) / 10000;
    const net = Math.round((amount - fee) * 10000) / 10000;

    // Reserve the row and debit GRAM in one database transaction. If another
    // payout is already active, neither the withdrawal nor the debit commits.
    const { data: reservation, error: reserveError } = await supabaseAdmin.rpc(
      "reserve_withdrawal",
      {
        p_telegram_id: user.id,
        p_amount: amount,
        p_fee: fee,
        p_net: net,
        p_to_address: address,
      },
    );
    if (reserveError) {
      if (/first pack required/i.test(reserveError.message)) throw new Error("NEEDS_FIRST_PACK");
      if (/duplicate key|withdrawals_one_sending/i.test(reserveError.message))
        throw new Error("A withdrawal is already being processed");
      if (/insufficient balance/i.test(reserveError.message))
        throw new Error("Not enough GRAM in your balance");
      throw new Error(reserveError.message);
    }
    const reserved = reservation as { id?: string; gram?: number } | null;
    if (!reserved?.id || !Number.isFinite(Number(reserved.gram)))
      throw new Error("Could not reserve the withdrawal");
    const row = { id: reserved.id };
    const gram = Number(reserved.gram);
    const { creditGram } = await import("./referrals.server");

    let hash: string;
    try {
      hash = await sendTon(address, net, PAYOUT_MEMO);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payout failed";
      const { TonSendUncertainError } = await import("./ton.server");
      if (err instanceof TonSendUncertainError) {
        // The transfer may already be on chain: refunding here could pay twice.
        console.error("Withdrawal broadcast unclear, left for review", row.id, message);
        await supabaseAdmin
          .from("withdrawals")
          .update({ status: "review", error: message })
          .eq("id", row.id);
        const { notifyUser } = await import("./telegram.server");
        await notifyUser(
          user.id,
          `⏳ <b>Withdrawal under review</b>\nWe could not confirm your payout yet. It will be completed or refunded shortly.`,
        ).catch(() => {});
        throw new Error("Your withdrawal is being reviewed");
      }
      // Only a rejected broadcast is refundable: the coins never left the wallet.
      console.error("Withdrawal broadcast failed", message);
      await creditGram(supabaseAdmin, user.id, amount);
      await supabaseAdmin
        .from("withdrawals")
        .update({ status: "failed", error: message })
        .eq("id", row.id);
      const { notifyUser } = await import("./telegram.server");
      await notifyUser(
        user.id,
        `⚠️ <b>Withdrawal failed</b>\nYour ${amount.toFixed(2)} GRAM were refunded to your balance.`,
      );
      throw new Error(message);
    }

    // From here the TON is already on chain. Never refund: a later failure is
    // only a bookkeeping/notification problem, and refunding would pay twice.
    try {
      await supabaseAdmin
        .from("withdrawals")
        .update({ status: "sent", tx_hash: hash })
        .eq("id", row.id);
      const { notifyUser, announcePayout } = await import("./telegram.server");
      await announcePayout({
        name: user.username
          ? `@${user.username}`
          : [user.first_name, user.last_name].filter(Boolean).join(" "),
        amount: net,
        hash,
      });
      await notifyUser(
        user.id,
        `💸 <b>Withdrawal sent</b>\n-${amount.toFixed(2)} GRAM (fee ${fee.toFixed(2)})\nReceived: <b>${net.toFixed(2)} GRAM</b>\n\nNew balance: ${Number(gram).toFixed(2)} GRAM`,
      );
    } catch (err) {
      console.error("Withdrawal sent but bookkeeping failed", hash, err);
      await supabaseAdmin
        .from("withdrawals")
        .update({ status: "sent", tx_hash: hash })
        .eq("id", row.id);
    }
    return { ok: true as const, gram, net, hash };
  });
