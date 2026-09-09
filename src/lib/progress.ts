/**
 * Pure game rules shared by the client store and the authoritative server
 * functions. This module must stay free of browser/server-only imports.
 */
import { CARDS, CARDS_BY_ID, RARITIES, RARITY_XP, type Rarity } from "./creatures";
import { accrued, streakBonus } from "./economy";

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
  streak: number;
  totalEarned: number;
  tasksClaimed: Record<string, number>;
  referralCode: string;
  referredBy: string | null;
  referrals: { l1: number; l2: number; l3: number };
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
  streak: 0,
  totalEarned: 0,
  tasksClaimed: {},
  referralCode: playerId.replace("CP-", "GR"),
  referredBy: null,
  referrals: { l1: 0, l2: 0, l3: 0 },
  referralEarned: { l1: 0, l2: 0, l3: 0 },
});

/** Commission paid on every deposit or pack purchase made by a referral. */
export const REFERRAL_RATES = { l1: 0.1, l2: 0.05, l3: 0.01 } as const;
export type ReferralLevel = keyof typeof REFERRAL_RATES;

export const round4 = (n: number) => Math.round(n * 10000) / 10000;

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

export type ClaimResult = { base: number; bonus: number; total: number; streak: number };

/** Collects the GRAM produced by the collection since the last claim. */
export function claimYieldPure(state: PlayerState, now: number) {
  const base = accrued(state.owned, state.lastClaimAt, now);
  if (base <= 0) return null;

  const withinStreak = now - state.lastClaimAt <= 48 * 3600_000;
  const streak = withinStreak ? state.streak + 1 : 1;
  const bonus = base * streakBonus(streak);
  const total = round4(base + bonus);

  const next: PlayerState = {
    ...state,
    gram: round4(state.gram + total),
    totalEarned: round4(state.totalEarned + total),
    lastClaimAt: now,
    streak,
  };
  return { state: next, result: { base, bonus, total, streak } as ClaimResult };
}
