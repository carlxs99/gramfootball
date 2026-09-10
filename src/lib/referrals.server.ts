/** Server-only helpers for player state persistence and referral commissions. */
import { initialState, REFERRAL_RATES, round4, type PlayerState } from "./progress";

type Admin = any;

export function mergeState(raw: unknown): PlayerState {
  const base = initialState();
  if (!raw || typeof raw !== "object") return base;
  return { ...base, ...(raw as Partial<PlayerState>) };
}

export async function loadState(admin: Admin, telegramId: number) {
  return (await loadStateRaw(admin, telegramId)).state;
}

/** Same as loadState, but also returns the untouched stored JSON. */
export async function loadStateRaw(admin: Admin, telegramId: number) {
  const { data } = await admin
    .from("players")
    .select("state")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  const raw = (data?.state ?? {}) as Record<string, unknown>;
  return { state: mergeState(data?.state), raw };
}

/**
 * Builds the optimistic guard for persistState from the fields that really
 * exist in the stored JSON (missing keys cannot be compared safely).
 */
export function guardFor(
  raw: Record<string, unknown>,
  state: PlayerState,
  keys: Array<keyof PlayerState>,
) {
  const guard: Record<string, unknown> = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) guard[key as string] = state[key];
  }
  return Object.keys(guard).length ? guard : null;
}

/**
 * Atomic write: the balance delta is applied under a row lock in Postgres, so
 * concurrent requests can never spend the same GRAM twice.
 */
export async function persistState(
  admin: Admin,
  telegramId: number,
  next: PlayerState,
  gramDelta: number,
  /**
   * Optional optimistic guard: the listed fields must still hold these exact
   * values at lock time, so two concurrent requests can never pay the same
   * reward twice (double claim of yield or of a task).
   */
  expect?: Record<string, unknown> | null,
): Promise<PlayerState> {
  const { gram: _ignored, ...rest } = next;
  const { data, error } = await admin.rpc("apply_player_progress", {
    p_telegram_id: telegramId,
    p_state: rest,
    p_gram_delta: round4(gramDelta),
    p_expect: expect ?? null,
  });
  if (error) {
    if (/insufficient balance/i.test(error.message))
      throw new Error("Not enough GRAM in your balance");
    if (/stale state/i.test(error.message)) throw new Error("Please try again");
    throw new Error(error.message);
  }
  return mergeState(data);
}

/** Blocks suspended accounts from any balance-changing action. */
export async function assertNotBanned(admin: Admin, telegramId: number) {
  const { data } = await admin
    .from("players")
    .select("banned")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  if (data?.banned) throw new Error("Your account has been suspended");
}

/** Pays 10% / 5% / 1% up the referral chain for a deposit or purchase. */
export async function payReferrals(admin: Admin, telegramId: number, spend: number) {
  if (!(spend > 0)) return;
  const levels: Array<keyof typeof REFERRAL_RATES> = ["l1", "l2", "l3"];
  let currentId: number | null = telegramId;
  // Never pay the same account twice, and never walk a referral cycle.
  const seen = new Set<number>([telegramId]);

  for (const level of levels) {
    const { data: row } = (await admin
      .from("players")
      .select("referred_by")
      .eq("telegram_id", currentId)
      .maybeSingle()) as { data: { referred_by: number | null } | null };
    const inviter: number | null = (row?.referred_by as number | null) ?? null;
    if (!inviter || seen.has(inviter)) return;
    seen.add(inviter);

    const amount = round4(spend * REFERRAL_RATES[level]);
    if (amount > 0) {
      const inviterState = await loadState(admin, inviter);
      const nextEarned = {
        ...inviterState.referralEarned,
        [level]: round4(inviterState.referralEarned[level] + amount),
      };
      try {
        await persistState(admin, inviter, { ...inviterState, referralEarned: nextEarned }, amount);
        const { notifyUser } = await import("./telegram.server");
        await notifyUser(
          inviter,
          `🎁 <b>Referral commission</b>\n+${amount.toFixed(4)} GRAM from a level ${level.slice(1)} friend (${Math.round(
            REFERRAL_RATES[level] * 100,
          )}%).`,
        );
      } catch (error) {
        console.error("Referral payout failed", error);
      }
    }
    currentId = inviter;
  }
}
