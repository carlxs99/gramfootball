/**
 * Pure game rules shared by the client store and the authoritative server
 * functions. This module must stay free of browser/server-only imports.
 */
import { CARDS, CARDS_BY_ID, RARITIES, RARITY_XP, type Rarity } from "./creatures";
import { accrued } from "./economy";

export type OwnedEntry = { qty: number; level: number; xp: number };

export type PlayerState = {
  name: string;
  playerId: string;
  gram: number;
  xp: number;
  packsOpened: number;
  lastPull: string | null;
  owned: Record<string, OwnedEntry>;
  lastClaimAt: number;
  totalEarned: number;
  tasksClaimed: Record<string, number>;
  referralCode: string;
  referredBy: string | null;
  referrals: { l1: number; l2: number; l3: number };
  /** Referrals that already bought their first pack (invite tasks use these). */
  referralsQualified: { l1: number; l2: number; l3: number };
  referralEarned: { l1: number; l2: number; l3: number };
};

export const initialState = (playerId = "CP-000000"): PlayerState => ({
  name: "Collector",
  playerId,
  gram: 0,
  xp: 0,
  packsOpened: 0,
  lastPull: null,
  owned: {},
  lastClaimAt: 0,
  totalEarned: 0,
  tasksClaimed: {},
  referralCode: playerId.replace("CP-", "GR"),
  referredBy: null,
  referrals: { l1: 0, l2: 0, l3: 0 },
  referralsQualified: { l1: 0, l2: 0, l3: 0 },
  referralEarned: { l1: 0, l2: 0, l3: 0 },
});

/** Commission paid on every deposit or pack purchase made by a referral. */
export const REFERRAL_RATES = { l1: 0.1, l2: 0.05, l3: 0.01 } as const;
export type ReferralLevel = keyof typeof REFERRAL_RATES;

export const round4 = (n: number) => Math.round(n * 10000) / 10000;
export const round6 = (n: number) => Math.round(n * 1000000) / 1000000;

/**
 * Smallest pack is 3 cards and the cheapest card grants 10 XP, so every pack
 * that was really opened leaves at least this much XP behind.
 */
export const MIN_XP_PER_PACK = 30;

/**
 * Packs the stored profile can actually prove it opened. `packsOpened` is a
 * plain counter, while XP is only ever granted by resolving real pulls and is
 * never spent, so the XP trail is what a pack-count reward must be paid on.
 * A counter inflated without real pulls therefore earns nothing.
 */
export function verifiedPacks(p: Pick<PlayerState, "packsOpened" | "xp">) {
  const counter = Number.isFinite(p.packsOpened) ? Math.max(0, Math.floor(p.packsOpened)) : 0;
  const byXp = Number.isFinite(p.xp) ? Math.floor(Math.max(0, p.xp) / MIN_XP_PER_PACK) : 0;
  return Math.min(counter, byXp);
}

export function playerLevel(xp: number) {
  return 1 + Math.floor(xp / 500);
}

export function collectionStats(owned: Record<string, OwnedEntry>) {
  const perRarity = RARITIES.reduce(
    (acc, r) => {
      acc[r] = { found: 0, total: 0 };
      return acc;
    },
    {} as Record<Rarity, { found: number; total: number }>,
  );
  for (const c of CARDS) {
    perRarity[c.rarity].total += 1;
    if (owned[c.id]) perRarity[c.rarity].found += 1;
  }
  const found = CARDS.filter((card) => owned[card.id]).length;
  const creaturesFound = CARDS.filter((card) => card.kind === "creature" && owned[card.id]).length;
  const trainersFound = CARDS.filter((card) => card.kind === "trainer" && owned[card.id]).length;
  return {
    found,
    total: CARDS.length,
    percent: Math.round((found / CARDS.length) * 100),
    creaturesFound,
    trainersFound,
    perRarity,
  };
}

const SCORE: Record<Rarity, number> = {
  common: 10,
  rare: 25,
  epic: 60,
  mythic: 150,
  legendary: 400,
};

export function collectionScore(owned: Record<string, OwnedEntry>) {
  return Object.keys(owned).reduce((sum, id) => {
    const card = CARDS_BY_ID[id];
    return sum + (card ? SCORE[card.rarity] : 0);
  }, 0);
}

export type PullResult = { creatureId: string; duplicate: boolean; rarity: Rarity };

/** Applies a resolved pack (price already validated) to a player state. */
export function applyPackPure(state: PlayerState, price: number, pulls: string[]) {
  const owned = { ...state.owned };
  const results: PullResult[] = [];
  let xpGain = 0;

  for (const id of pulls) {
    const card = CARDS_BY_ID[id];
    if (!card) continue;
    const prev = owned[id];
    const duplicate = Boolean(prev);
    const gained = RARITY_XP[card.rarity];
    xpGain += gained;
    if (prev) {
      const xp = prev.xp + gained;
      const level = Math.min(20, 1 + Math.floor(xp / 100));
      owned[id] = { qty: prev.qty + 1, level, xp };
    } else {
      owned[id] = { qty: 1, level: 1, xp: 0 };
    }
    results.push({ creatureId: id, duplicate, rarity: card.rarity });
  }

  const next: PlayerState = {
    ...state,
    owned,
    xp: state.xp + xpGain,
    gram: round4(state.gram - price),
    packsOpened: state.packsOpened + 1,
    lastPull: pulls[pulls.length - 1] ?? state.lastPull,
  };
  return { state: next, results };
}

export type ClaimResult = { base: number; total: number };

/** Collects the GRAM produced by the collection since the last claim. */
export function claimYieldPure(state: PlayerState, now: number) {
  // A corrupted or missing timestamp must not turn into an unbounded payout.
  const last = Number.isFinite(state.lastClaimAt) ? state.lastClaimAt : now;
  const base = accrued(state.owned, last > now ? now : last, now);
  if (base <= 0) return null;

  const total = round6(base);

  const next: PlayerState = {
    ...state,
    gram: round6(state.gram + total),
    totalEarned: round6(state.totalEarned + total),
    lastClaimAt: now,
  };
  return { state: next, result: { base, total } as ClaimResult };
}
