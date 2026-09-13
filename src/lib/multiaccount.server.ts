/** Server-only multi-account (shared network address) detection. */

type Admin = any;

/** More than this many accounts sharing one address is a farming signal. */
export const MAX_ACCOUNTS_PER_IP = 3;

export const MULTI_ACCOUNT_REASON = "multi_account";

const ADMIN_TELEGRAM_ID = 6334940213;

/** Accounts created this close together (ms) count as a registration burst. */
const BURST_WINDOW_MS = 60 * 60 * 1000;

/** Risk points at or above which the whole related cluster is suspended. */
const BAN_SCORE = 6;

/** Safety cap so one crowded address can never build an unbounded cluster. */
const MAX_CLUSTER = 80;

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
 * Records the address this player just used, scores the cluster of accounts
 * related to them (shared addresses + referral links) and, when the risk score
 * confirms farming, suspends the whole cluster. Returns this player's state.
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

    await evaluateCluster(admin, telegramId);
  }

  await ensureTrust(admin, telegramId);

  const { data: me } = await admin
    .from("players")
    .select("banned, ban_reason")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  return { banned: Boolean(me?.banned), reason: (me?.ban_reason as string | null) ?? null };
}

/**
 * Legit-player safeguard. Any account that put real value into the game
 * (deposit, withdrawal or an opened pack) is permanently marked as trusted:
 * trusted accounts are never auto-suspended again, and an account that was
 * auto-suspended before earning trust is released automatically.
 */
export async function ensureTrust(admin: Admin, telegramId: number): Promise<boolean> {
  const { data: me } = await admin
    .from("players")
    .select("trusted, banned, ban_reason, state")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  if (!me) return false;
  if (me.trusted) {
    if (me.banned && me.ban_reason === MULTI_ACCOUNT_REASON) {
      await admin
        .from("players")
        .update({ banned: false, ban_reason: null })
        .eq("telegram_id", telegramId);
    }
    return true;
  }

  const packs = Number((me.state ?? {})["packsOpened"] ?? 0) || 0;
  let earned = packs > 0;
  if (!earned) {
    const [{ count: dep }, { count: wit }] = await Promise.all([
      admin
        .from("ton_deposits")
        .select("telegram_id", { count: "exact", head: true })
        .eq("telegram_id", telegramId),
      admin
        .from("withdrawals")
        .select("telegram_id", { count: "exact", head: true })
        .eq("telegram_id", telegramId),
    ]);
    earned = Number(dep ?? 0) > 0 || Number(wit ?? 0) > 0;
  }
  if (!earned) return false;

  const patch: Record<string, unknown> = { trusted: true };
  if (me.banned && me.ban_reason === MULTI_ACCOUNT_REASON) {
    patch["banned"] = false;
    patch["ban_reason"] = null;
  }
  await admin.from("players").update(patch).eq("telegram_id", telegramId);
  return true;
}

type Acc = {
  id: number;
  created: number;
  referredBy: number | null;
  packs: number;
  name: string;
  trusted: boolean;
  ips: Set<string>;
};

function normName(p: any): string {
  return String(p?.username ?? p?.first_name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Two handles that differ by a character or two are almost always one person. */
function nearIdentical(a: string, b: string): boolean {
  if (!a || !b || a.length < 4 || b.length < 4) return false;
  if (a === b) return true;
  const digits = (s: string) => s.replace(/[0-9]/g, "");
  if (digits(a) && digits(a) === digits(b)) return true;
  return a.startsWith(b.slice(0, 5)) || b.startsWith(a.slice(0, 5));
}

/**
 * Builds the cluster around one player: every account that shares an address
 * with them, the accounts those share addresses with (one extra hop), plus
 * direct referral parents/children.
 */
async function buildCluster(admin: Admin, rootId: number): Promise<number[]> {
  const { data: mine } = await admin.from("player_ips").select("ip").eq("telegram_id", rootId);
  const ips = [...new Set((mine ?? []).map((r: any) => String(r.ip)))] as string[];
  const ids = new Set<number>([rootId]);

  for (let hop = 0; hop < 2 && ips.length; hop++) {
    const { data: rows } = await admin
      .from("player_ips")
      .select("telegram_id, ip")
      .in("ip", ips.slice(0, 40));
    const fresh: number[] = [];
    for (const r of rows ?? []) {
      const id = Number(r.telegram_id);
      if (!ids.has(id) && ids.size < MAX_CLUSTER) {
        ids.add(id);
        fresh.push(id);
      }
    }
    if (!fresh.length || hop === 1) break;
    const { data: more } = await admin.from("player_ips").select("ip").in("telegram_id", fresh);
    const next = [...new Set((more ?? []).map((r: any) => String(r.ip)))] as string[];
    ips.length = 0;
    ips.push(...next.filter((x) => !ips.includes(x)));
  }

  // Referral edges: only children that ALSO sit on a network already inside the
  // cluster. A promoter's real audience connects from their own networks and
  // must never be dragged in just for having used an invite link.
  const base = [...ids];
  const { data: kids } = await admin
    .from("players")
    .select("telegram_id")
    .in("referred_by", base.slice(0, 40));
  const kidIds = (kids ?? []).map((k: any) => Number(k.telegram_id)).filter((id: number) => !ids.has(id));
  if (kidIds.length) {
    const { data: kidIps } = await admin
      .from("player_ips")
      .select("telegram_id, ip")
      .in("telegram_id", kidIds.slice(0, 200));
    const clusterIps = new Set<string>();
    const { data: allIps } = await admin.from("player_ips").select("ip").in("telegram_id", base);
    for (const r of allIps ?? []) clusterIps.add(String(r.ip));
    for (const r of kidIps ?? []) {
      if (ids.size >= MAX_CLUSTER) break;
      if (clusterIps.has(String(r.ip))) ids.add(Number(r.telegram_id));
    }
  }

  return [...ids];
}

/** Scores the cluster and suspends every related account when farming is confirmed. */
async function evaluateCluster(admin: Admin, rootId: number): Promise<void> {
  const ids = await buildCluster(admin, rootId);
  if (ids.length <= MAX_ACCOUNTS_PER_IP) return;

  const [{ data: players }, { data: ipRows }, { data: deposits }, { data: withdrawals }] =
    await Promise.all([
      admin
        .from("players")
        .select(
          "telegram_id, username, first_name, created_at, referred_by, state, banned, trusted",
        )
        .in("telegram_id", ids),
      admin.from("player_ips").select("telegram_id, ip").in("telegram_id", ids),
      admin.from("ton_deposits").select("telegram_id").in("telegram_id", ids),
      admin.from("withdrawals").select("telegram_id").in("telegram_id", ids),
    ]);

  const paid = new Set<number>([
    ...(deposits ?? []).map((d: any) => Number(d.telegram_id)),
    ...(withdrawals ?? []).map((w: any) => Number(w.telegram_id)),
  ]);

  const ipsBy = new Map<number, Set<string>>();
  for (const r of ipRows ?? []) {
    const id = Number(r.telegram_id);
    const set = ipsBy.get(id) ?? new Set<string>();
    set.add(String(r.ip));
    ipsBy.set(id, set);
  }

  const group: Acc[] = (players ?? [])
    .map((p: any) => ({
      id: Number(p.telegram_id),
      created: Date.parse(p.created_at ?? "") || 0,
      referredBy: p.referred_by == null ? null : Number(p.referred_by),
      packs: Number((p.state ?? {})["packsOpened"] ?? 0) || 0,
      name: normName(p),
      trusted: Boolean(p.trusted),
      ips: ipsBy.get(Number(p.telegram_id)) ?? new Set<string>(),
    }))
    .filter((a: Acc) => a.id !== ADMIN_TELEGRAM_ID);

  const clusterIps = new Set<string>(group.flatMap((g) => [...g.ips]));

  // Genuine promoters: people who advertised the app and pulled in players from
  // many different networks. Their referrals sit on their own addresses, which
  // is the opposite of a farm run from one device.
  const { data: invited } = await admin
    .from("players")
    .select("telegram_id, referred_by, state")
    .in("referred_by", group.map((g) => g.id).slice(0, 40));
  const invitedIds = (invited ?? []).map((r: any) => Number(r.telegram_id));
  const { data: invitedIps } = invitedIds.length
    ? await admin.from("player_ips").select("telegram_id, ip").in("telegram_id", invitedIds)
    : { data: [] as any[] };
  const ipOf = new Map<number, string[]>();
  for (const r of invitedIps ?? []) {
    const id = Number(r.telegram_id);
    ipOf.set(id, [...(ipOf.get(id) ?? []), String(r.ip)]);
  }
  const outsideNets = new Map<number, Set<string>>();
  for (const r of invited ?? []) {
    const parent = Number(r.referred_by);
    const set = outsideNets.get(parent) ?? new Set<string>();
    for (const ip of ipOf.get(Number(r.telegram_id)) ?? []) {
      if (!clusterIps.has(ip)) set.add(ip);
    }
    outsideNets.set(parent, set);
  }
  /** Invited 5+ people from distinct outside networks and spent real value. */
  const promoter = (acc: Acc) =>
    (outsideNets.get(acc.id)?.size ?? 0) >= 5 && (paid.has(acc.id) || acc.packs > 0);

  const emptyChildren = new Map<number, { total: number; withPack: number }>();
  for (const acc of group) {
    if (acc.referredBy == null) continue;
    const row = emptyChildren.get(acc.referredBy) ?? { total: 0, withPack: 0 };
    row.total++;
    if (acc.packs > 0) row.withPack++;
    emptyChildren.set(acc.referredBy, row);
  }

  /** Accounts that put real value in are never auto-suspended. */
  const protectedAcc = (acc: Acc) =>
    acc.trusted || promoter(acc) || paid.has(acc.id) || acc.packs > 0;

  const scores = new Map<number, number>();
  for (const acc of group) {
    if (protectedAcc(acc)) continue;
    // Must actually share a network with another cluster account; referral
    // links alone are never enough to suspend anyone.
    const shares = group.filter((o) => o.id !== acc.id && [...o.ips].some((x) => acc.ips.has(x)));
    if (!shares.length) continue;
    let score = 0;



    // Shared address beyond the tolerated limit (family, campus, carrier NAT).
    if (group.filter((o) => [...o.ips].some((x) => acc.ips.has(x))).length > MAX_ACCOUNTS_PER_IP) {
      score += 2;
    }
    // Registered in the same burst as another account on the SAME network.
    if (
      shares.some(
        (o) => o.created && acc.created && Math.abs(o.created - acc.created) <= BURST_WINDOW_MS,
      )
    ) {
      score += 2;
    }
    // Invited by, or inviter of, another account on the same network.
    if (
      (acc.referredBy != null && shares.some((o) => o.id === acc.referredBy)) ||
      shares.some((o) => o.referredBy === acc.id)
    ) {
      score += 2;
    }
    // A referral chain where nobody ever bought a pack.
    const kids = emptyChildren.get(acc.id);
    if (kids && kids.total >= 5 && kids.withPack === 0) score += 2;
    // Near-identical handle to another account on the same network.
    if (shares.some((o) => nearIdentical(acc.name, o.name))) score += 1;
    // Uses more than one address that another cluster account also uses.
    if (
      [...acc.ips].filter((x) => group.some((o) => o.id !== acc.id && o.ips.has(x))).length >= 2
    ) {
      score += 1;
    }
    // No real spend at all.
    if (!paid.has(acc.id) && acc.packs === 0) score += 1;

    scores.set(acc.id, score);
  }

  // Only the accounts that individually reach the threshold are suspended, and
  // only when at least two of them do — a lone account is never a farm.
  const targets = [...scores.entries()].filter(([, s]) => s >= BAN_SCORE).map(([id]) => id);
  if (targets.length < 2) return;
  await admin
    .from("players")
    .update({ banned: true, ban_reason: MULTI_ACCOUNT_REASON })
    .in("telegram_id", targets);
}
