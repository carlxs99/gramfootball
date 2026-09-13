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
