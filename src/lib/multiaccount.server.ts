/** Server-only multi-account (same network address) detection. */

type Admin = any;

/** More than this many accounts sharing one address = automatic suspension. */
export const MAX_ACCOUNTS_PER_IP = 3;

export const MULTI_ACCOUNT_REASON = "multi_account";

export function clientIp(headers: Headers): string | null {
  // Only the edge-set header is trusted: x-forwarded-for / x-real-ip can be
  // forged by the caller, which would let people dodge the limit or get other
  // players auto-banned.
  const ip = (headers.get("cf-connecting-ip") ?? "").trim();
  if (!ip || ip.length > 45) return null;
  if (!/^[0-9a-fA-F:.]+$/.test(ip)) return null;
  return ip;
}

/**
 * Records the address this player just used and suspends every account sharing
 * it once the limit is exceeded. Returns the ban state for this player.
 */
export async function trackIp(
  admin: Admin,
  telegramId: number,
  ip: string | null,
): Promise<{ banned: boolean; reason: string | null }> {
  if (ip) {
    const { data: seen } = await admin
      .from("player_ips")
      .select("hits")
      .eq("telegram_id", telegramId)
      .eq("ip", ip)
      .maybeSingle();

    await admin.from("player_ips").upsert(
      {
        telegram_id: telegramId,
        ip,
        last_seen: new Date().toISOString(),
        hits: Number(seen?.hits ?? 0) + 1,
      },
      { onConflict: "telegram_id,ip" },
    );

    const { data: rows } = await admin.from("player_ips").select("telegram_id").eq("ip", ip);
    const ids = [...new Set((rows ?? []).map((r: any) => Number(r.telegram_id)))] as number[];

    if (ids.length > MAX_ACCOUNTS_PER_IP) {
      const guilty = await corroborate(admin, ids);
      if (guilty.length) {
        await admin
          .from("players")
          .update({ banned: true, ban_reason: MULTI_ACCOUNT_REASON })
          .in("telegram_id", guilty);
      }
    }

  }

  const { data: me } = await admin
    .from("players")
    .select("banned, ban_reason")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  return { banned: Boolean(me?.banned), reason: (me?.ban_reason as string | null) ?? null };
}

/** Accounts created this close together (ms) count as a registration burst. */
const BURST_WINDOW_MS = 60 * 60 * 1000;

/**
 * A shared address alone is not proof of farming (family, campus, mobile
 * carrier NAT). Only accounts that ALSO show farming signals are suspended:
 * never a paying account, and never a lone account with an organic history.
 */
async function corroborate(admin: Admin, ids: number[]): Promise<number[]> {
  const { data: players } = await admin
    .from("players")
    .select("telegram_id, created_at, referred_by, state, banned")
    .in("telegram_id", ids);

  const { data: deposits } = await admin
    .from("ton_deposits")
    .select("telegram_id")
    .in("telegram_id", ids);

  const { data: withdrawals } = await admin
    .from("withdrawals")
    .select("telegram_id")
    .in("telegram_id", ids);

  const paid = new Set<number>([
    ...(deposits ?? []).map((d: any) => Number(d.telegram_id)),
    ...(withdrawals ?? []).map((w: any) => Number(w.telegram_id)),
  ]);

  const group = (players ?? []).map((p: any) => ({
    id: Number(p.telegram_id),
    created: Date.parse(p.created_at ?? "") || 0,
    referredBy: p.referred_by == null ? null : Number(p.referred_by),
    packs: Number((p.state ?? {})["packsOpened"] ?? 0) || 0,
  }));
  const inGroup = new Set(group.map((g) => g.id));

  const guilty: number[] = [];
  for (const acc of group) {
    // Signal 0: real money activity or a bought pack = treat as a real player.
    if (paid.has(acc.id) || acc.packs > 0) continue;

    let signals = 0;
    // Signal 1: registered in the same burst as another account here.
    if (
      group.some(
        (o) => o.id !== acc.id && o.created && acc.created &&
          Math.abs(o.created - acc.created) <= BURST_WINDOW_MS,
      )
    ) signals++;
    // Signal 2: invited by, or inviter of, another account on this address.
    if (
      (acc.referredBy != null && inGroup.has(acc.referredBy)) ||
      group.some((o) => o.referredBy === acc.id)
    ) signals++;

    if (signals >= 2) guilty.push(acc.id);
  }
  return guilty;
}
