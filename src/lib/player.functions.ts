import { createServerFn } from "@tanstack/react-start";

/** Cloud sync for the Telegram Mini App player profile. */

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
type SyncInput = { initData: string; name?: string; startParam?: string };

/** Public bot handle + Mini App short name, used to build referral deep links. */
export const getBotUsername = createServerFn({ method: "GET" }).handler(async () => {
  const username = (process.env["TELEGRAM_BOT_USERNAME"] ?? "Monstersccjbot").replace("@", "");
  const appName = (process.env["TELEGRAM_APP_NAME"] ?? "app").replace("/", "");
  return { username, appName, base: `https://t.me/${username}/${appName}` };
});

/** Fresh profiles start empty — GRAM only enters the game through deposits. */
const emptyState = () => ({
  gram: 0,
  xp: 0,
  packsOpened: 0,
  owned: {},
  lastClaimAt: Date.now(),
  streak: 0,
  totalEarned: 0,
  tasksClaimed: {},
  referralEarned: { l1: 0, l2: 0, l3: 0 },
});

function codeFor(telegramId: number) {
  return "GR" + String(telegramId % 1000000).padStart(6, "0");
}

export const syncPlayer = createServerFn({ method: "POST" })
  .inputValidator((input: SyncInput) => {
    if (!input || typeof input.initData !== "string") throw new Error("Missing Telegram session");
    return input;
  })
  .handler(async ({ data }) => {
    const { verifyInitData } = await import("./telegram.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await verifyInitData(data.initData);

    const referralCode = codeFor(user.id);
    const startParam = (
      data.startParam ||
      new URLSearchParams(data.initData).get("start_param") ||
      ""
    ).trim().toUpperCase();

    const { data: existing } = await supabaseAdmin
      .from("players")
      .select("state, referred_by, referral_code")
      .eq("telegram_id", user.id)
      .maybeSingle();

    // Resolve the inviter the first time this player shows up.
    let referredBy: number | null = (existing?.referred_by as number | null) ?? null;
    if (!referredBy && /^GR\d{6}$/.test(startParam) && startParam !== referralCode) {
      const { data: inviter } = await supabaseAdmin
        .from("players")
        .select("telegram_id")
        .eq("referral_code", startParam)
        .maybeSingle();
      if (inviter) referredBy = inviter.telegram_id as number;
    }

    // The client is never trusted with balances or progress: it may only read
    // the stored state. All mutations happen in game.functions / wallet.functions.
    const existingState = (existing?.state as Record<string, Json> | null) ?? null;
    const nextState: Json = existingState ?? (emptyState() as Json);

    const { error } = await supabaseAdmin.from("players").upsert(
      {
        telegram_id: user.id,
        username: user.username ?? null,
        first_name: [user.first_name, user.last_name].filter(Boolean).join(" ") || null,
        photo_url: user.photo_url ?? null,
        referral_code: referralCode,
        referred_by: referredBy,
        ...(existingState ? {} : { state: nextState }),
      },
      { onConflict: "telegram_id" },
    );
    if (error) throw new Error(error.message);

    // Referral network: direct invites, then two more levels down.
    const level = async (ids: number[]) => {
      if (!ids.length) return [] as number[];
      const { data: rows } = await supabaseAdmin
        .from("players")
        .select("telegram_id")
        .in("referred_by", ids);
      return (rows ?? []).map((r) => r.telegram_id as number);
    };
    const l1 = await level([user.id]);
    const l2 = await level(l1);
    const l3 = await level(l2);

    return {
      telegramId: user.id,
      name: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || "Collector",
      username: user.username ?? null,
      photoUrl: user.photo_url ?? null,
      referralCode,
      referredBy,
      referrals: { l1: l1.length, l2: l2.length, l3: l3.length },
      state: nextState,
    };
  });

export const fetchLeaderboard = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("players")
    .select("telegram_id, username, first_name, photo_url, state")
    .limit(300);
  return (data ?? []).map((row) => ({
    id: row.telegram_id as number,
    name: (row.first_name as string | null) ?? (row.username as string | null) ?? "Collector",
    photoUrl: row.photo_url as string | null,
    // Only the fields needed to rank players — balances stay private.
    state: (() => {
      const st = (row.state ?? {}) as Record<string, Json>;
      return { owned: st["owned"] ?? {}, xp: st["xp"] ?? 0, packsOpened: st["packsOpened"] ?? 0 } as Json;
    })(),
  }));
});
