import { CREATURES_BY_ID, type Rarity } from "./creatures";
import type { OwnedEntry } from "./store";

/**
 * Daily GRAM production per creature at level 1.
 *
 * Balance target: a full album at level 1 produces ~0.98 GRAM/day, and every
 * pack pays itself back in roughly 24-32 days when its cards are new
 * creatures (30-45 days in practice once duplicates start appearing).
 */
export const RARITY_YIELD: Record<Rarity, number> = {
  common: 0.002,
  rare: 0.006,
  epic: 0.015,
  mythic: 0.04,
  legendary: 0.1,
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
  return RARITY_YIELD[creature.rarity] * levelMultiplier(entry.level);
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
