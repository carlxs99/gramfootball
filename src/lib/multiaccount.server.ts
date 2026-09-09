/** Server-only multi-account (same network address) detection. */

type Admin = any;

/** More than this many accounts sharing one address = automatic suspension. */
export const MAX_ACCOUNTS_PER_IP = 3;

export const MULTI_ACCOUNT_REASON = "multi_account";

export function clientIp(headers: Headers): string | null {
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-real-ip"),
    (headers.get("x-forwarded-for") ?? "").split(",")[0],
  ];
  for (const value of candidates) {
    const ip = (value ?? "").trim();
    if (ip && ip.length <= 64) return ip;
  }
  return null;
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
    const ids = [...new Set((rows ?? []).map((r: any) => Number(r.telegram_id)))];

    if (ids.length > MAX_ACCOUNTS_PER_IP) {
      await admin
        .from("players")
        .update({ banned: true, ban_reason: MULTI_ACCOUNT_REASON })
        .in("telegram_id", ids);
    }
  }

  const { data: me } = await admin
    .from("players")
    .select("banned, ban_reason")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  return { banned: Boolean(me?.banned), reason: (me?.ban_reason as string | null) ?? null };
}
