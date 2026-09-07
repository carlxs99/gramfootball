import { CREATURES_BY_ID, type Rarity } from "./creatures";
import type { OwnedEntry } from "./store";

/**
 * Each creature has its own daily GRAM production (see `dailyGram` in
 * creatures.ts), spread inside its rarity band:
 *   common    0.0002 – 0.002
 *   rare      0.007  – 0.022
 *   epic      0.035  – 0.09
 *   mythic    0.135  – 0.27
 *   legendary 0.35   – 0.9
 * Pack prices (1 / 3 / 7 / 16 / 35 GRAM) and card counts (3 / 4 / 5 / 6 / 8)
 * are tuned against these numbers so a pack pays itself back in ~25-35 days,
 * with the bigger packs slightly more efficient. A full album at level 1
 * produces ~5.3 GRAM/day before the level bonus.
 */
export const RARITY_YIELD_RANGE: Record<Rarity, [number, number]> = {
  common: [0.0002, 0.002],
  rare: [0.007, 0.022],
  epic: [0.035, 0.09],
  mythic: [0.135, 0.27],
  legendary: [0.35, 0.9],
};

/** Soft level scaling: +6% per level, x2.14 at level 20. */
export const LEVEL_BONUS = 0.06;


export const CLAIM_CAP_HOURS = 24;
export const CLAIM_CAP_MS = CLAIM_CAP_HOURS * 3600_000;
export const STREAK_STEP = 0.05;
export const STREAK_MAX_STEPS = 5;

export function levelMultiplier(level: number) {
  return 1 + LEVEL_BONUS * (Math.max(1, level) - 1);
}

export function creatureYield(creatureId: string, entry: OwnedEntry | undefined) {
  const creature = CREATURES_BY_ID[creatureId];
  if (!creature || !entry) return 0;
  return creature.dailyGram * levelMultiplier(entry.level);
}

export function dailyYield(owned: Record<string, OwnedEntry>) {
  return Object.keys(owned).reduce((sum, id) => sum + creatureYield(id, owned[id]), 0);
}

export function streakBonus(streak: number) {
  return Math.min(Math.max(streak - 1, 0), STREAK_MAX_STEPS) * STREAK_STEP;
}

export function accrued(owned: Record<string, OwnedEntry>, lastClaimAt: number, now: number) {
  if (!lastClaimAt) return 0;
  const elapsed = Math.min(Math.max(now - lastClaimAt, 0), CLAIM_CAP_MS);
  return (dailyYield(owned) * elapsed) / 86_400_000;
}

export function vaultFill(lastClaimAt: number, now: number) {
  if (!lastClaimAt) return 0;
  return Math.min(Math.max(now - lastClaimAt, 0) / CLAIM_CAP_MS, 1);
}

export function formatGram(n: number) {
  if (n >= 100) return n.toFixed(1);
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}
