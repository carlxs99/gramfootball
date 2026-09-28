/** Server-only: weekly referral tournament standings and prize delivery. */
import { PACKS_BY_ID, rollPack } from "./packs";
import { PRIZE_CARD_POOL, TOURNAMENT_ADMIN_ID, prizeFor } from "./tournament";

type Admin = any;

export type Standing = { id: number; referrals: number; lastAt: number };

/**
 * Direct referrals that opened the app this week (suspended multi-accounts
 * never count). Suspended inviters and the admin never rank.
 */
export async function weeklyStandings(admin: Admin, start: Date, end: Date): Promise<Standing[]> {
  const PAGE = 1000;
  const counts = new Map<number, Standing>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from("players")
      .select("telegram_id, referred_by, created_at")
      .not("referred_by", "is", null)
      .eq("banned", false)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .order("telegram_id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    for (const r of data ?? []) {
      const inviter = Number(r.referred_by);
      if (!inviter || inviter === TOURNAMENT_ADMIN_ID) continue;
      const at = new Date(r.created_at as string).getTime();
      const cur = counts.get(inviter) ?? { id: inviter, referrals: 0, lastAt: 0 };
      cur.referrals += 1;
      cur.lastAt = Math.max(cur.lastAt, at);
      counts.set(inviter, cur);
    }
    if (!data || data.length < PAGE) break;
  }
  const ids = [...counts.keys()];
  if (ids.length) {
    for (let i = 0; i < ids.length; i += 200) {
      const { data: banned } = await admin
        .from("players")
        .select("telegram_id")
        .in("telegram_id", ids.slice(i, i + 200))
        .eq("banned", true);
      for (const b of banned ?? []) counts.delete(Number(b.telegram_id));
    }
  }
  // Ties: whoever reached the count first wins.
  return [...counts.values()].sort((a, b) => b.referrals - a.referrals || a.lastAt - b.lastAt);
}

export function rollPrizeCards(place: number): string[] {
  const prize = prizeFor(place);
  if (!prize) return [];
  if (prize.kind === "pack") return PACKS_BY_ID[prize.packId] ? rollPack(prize.packId) : [];
  const buf = new Uint32Array(prize.count);
  crypto.getRandomValues(buf);
  return [...buf].map((n) => PRIZE_CARD_POOL[n % PRIZE_CARD_POOL.length]!.id);
}

/** Idempotent: each card has a unique delivery reason. */
export async function deliverResult(
  admin: Admin,
  row: { week_key: string; place: number; telegram_id: number; cards: string[] },
) {
  for (let i = 0; i < row.cards.length; i++) {
    const reason = `tournament:${row.week_key}:${row.place}:${i}`;
    const { data: d, error } = await admin
      .from("pending_card_deliveries")
      .upsert(
        { telegram_id: row.telegram_id, card_id: row.cards[i], reason },
        { onConflict: "reason" },
      )
      .select("id")
      .single();
    if (error || !d?.id) throw new Error(error?.message ?? "queue failed");
    const { data: res, error: e2 } = await admin.rpc("settle_pending_card_delivery", {
      p_delivery_id: d.id,
    });
    if (e2) throw new Error(e2.message);
    const r = res as { settled?: boolean; reason?: string } | null;
    if (!r?.settled && r?.reason !== "already_delivered") throw new Error(r?.reason ?? "not settled");
  }
}
