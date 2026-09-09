import { createServerFn } from "@tanstack/react-start";

/** TON wallet: deposits (auto-detected by memo tag) and instant withdrawals. */

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type WalletSummary = {
  memo: string;
  depositAddress: string;
  tonAddress: string | null;
  gram: number;
  feeRate: number;
  minWithdraw: number;
  minDeposit: number;
  deposits: Array<{ id: string; amount: number; hash: string; at: string }>;
  withdrawals: Array<{ id: string; amount: number; net: number; status: string; hash: string | null; at: string }>;
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
    .select("last_lt")
    .eq("id", "deposits")
    .maybeSingle();
  const sinceLt = Number(cursor?.last_lt ?? 0);

  let incoming: Awaited<ReturnType<typeof fetchIncoming>> = [];
  try {
    incoming = await fetchIncoming(sinceLt);
  } catch (error) {
    console.error("Deposit scan failed", error);
    return;
  }
  if (!incoming.length) return;

  let maxLt = sinceLt;
  for (const tx of incoming) {
    maxLt = Math.max(maxLt, tx.lt);
    if (tx.amount < MIN_DEPOSIT || !tx.memo) continue;

    const { data: player } = await supabaseAdmin
      .from("players")
      .select("telegram_id, state")
      .eq("memo_tag", tx.memo.toUpperCase())
      .maybeSingle();
    if (!player) continue;

    const { error } = await supabaseAdmin.from("ton_deposits").insert({
      telegram_id: player.telegram_id,
      tx_hash: tx.hash,
      lt: tx.lt,
      amount: tx.amount,
      memo: tx.memo,
      from_address: tx.from,
    });
    if (error) continue; // duplicate transaction, already credited

    const { loadState, persistState, payReferrals } = await import("./referrals.server");
    const { notifyUser } = await import("./telegram.server");
    const state = await loadState(supabaseAdmin, player.telegram_id);
    const credited = await persistState(supabaseAdmin, player.telegram_id, state, tx.amount);
    await payReferrals(supabaseAdmin, player.telegram_id, tx.amount);
    await notifyUser(
      player.telegram_id,
      `✅ <b>Deposit confirmed</b>\n+${tx.amount.toFixed(2)} GRAM\n\nNew balance: <b>${Number(credited.gram).toFixed(2)} GRAM</b>`,
    );
  }

  await supabaseAdmin
    .from("ton_scan_state")
    .upsert({ id: "deposits", last_lt: maxLt }, { onConflict: "id" });
}

async function summary(supabaseAdmin: any, telegramId: number): Promise<WalletSummary> {
  const { DEPOSIT_ADDRESS, WITHDRAW_FEE_RATE, MIN_WITHDRAW, MIN_DEPOSIT } = await import("./ton.server");

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
    .limit(20);

  const { data: withdrawals } = await supabaseAdmin
    .from("withdrawals")
    .select("id, amount, net, status, tx_hash, created_at")
    .eq("telegram_id", telegramId)
    .order("created_at", { ascending: false })
    .limit(20);

  const state = (player?.state ?? {}) as Record<string, Json>;

  return {
    memo: (player?.memo_tag as string | null) ?? "MC" + telegramId,
    depositAddress: DEPOSIT_ADDRESS,
    tonAddress: (player?.ton_address as string | null) ?? null,
    gram: Number(state["gram"] ?? 0) || 0,
    feeRate: WITHDRAW_FEE_RATE,
    minWithdraw: MIN_WITHDRAW,
    minDeposit: MIN_DEPOSIT,
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
    // Make sure the player row (and its memo tag) exists before scanning.
    await supabaseAdmin
      .from("players")
      .update({ memo_tag: "MC" + user.id })
      .eq("telegram_id", user.id)
      .is("memo_tag", null);
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
    if (address && !(await isValidAddress(address))) throw new Error("That TON address is not valid");
    await supabaseAdmin.from("players").update({ ton_address: address }).eq("telegram_id", user.id);
    return { tonAddress: address };
  });

export const requestWithdrawal = createServerFn({ method: "POST" })
  .inputValidator((input: { initData: string; amount: number; address: string }) => {
    if (!input || typeof input.initData !== "string") throw new Error("Missing Telegram session");
    if (!Number.isFinite(input.amount)) throw new Error("Invalid amount");
    return input;
  })
  .handler(async ({ data }) => {
    const { user, supabaseAdmin } = await ctx(data.initData);
    const { sendTon, isValidAddress, WITHDRAW_FEE_RATE, MIN_WITHDRAW } = await import("./ton.server");

    const address = data.address.trim();
    if (!(await isValidAddress(address))) throw new Error("That TON address is not valid");

    const amount = Math.round(data.amount * 10000) / 10000;
    if (amount < MIN_WITHDRAW) throw new Error(`Minimum withdrawal is ${MIN_WITHDRAW} GRAM`);

    const { loadState, persistState } = await import("./referrals.server");
    const state = await loadState(supabaseAdmin, user.id);

    const fee = Math.round(amount * WITHDRAW_FEE_RATE * 10000) / 10000;
    const net = Math.round((amount - fee) * 10000) / 10000;

    // Debit first (atomically, under a row lock) so a retry cannot double-spend.
    const debited = await persistState(supabaseAdmin, user.id, state, -amount);
    const gram = debited.gram;

    const { data: row, error } = await supabaseAdmin
      .from("withdrawals")
      .insert({ telegram_id: user.id, amount, fee, net, to_address: address, status: "sending" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    try {
      const hash = await sendTon(address, net, "Monsters CCJ withdrawal");
      await supabaseAdmin
        .from("withdrawals")
        .update({ status: "sent", tx_hash: hash })
        .eq("id", row.id);
      const { notifyUser, announcePayout } = await import("./telegram.server");
      await announcePayout({
        name: user.username ? `@${user.username}` : [user.first_name, user.last_name].filter(Boolean).join(" "),
        amount: net,
        hash,
      });
      await notifyUser(
        user.id,
        `💸 <b>Withdrawal sent</b>\n-${amount.toFixed(2)} GRAM (fee ${fee.toFixed(2)})\nReceived: <b>${net.toFixed(2)} GRAM</b>\n\nNew balance: ${Number(gram).toFixed(2)} GRAM`,
      );
      return { ok: true as const, gram, net, hash };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payout failed";
      console.error("Withdrawal failed", message);
      // Refund the debit when the payout could not be broadcast.
      await persistState(supabaseAdmin, user.id, debited, amount);
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
  });
