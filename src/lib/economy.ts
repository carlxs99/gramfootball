import { CARDS_BY_ID, type Rarity } from "./creatures";
import { CARD_MAX_LEVEL, type OwnedEntry } from "./progress";

/**
 * Each collectible card has its own daily GRAM production (see `dailyGram` in
 * creatures.ts). Raw rarity bands before the global YIELD_SCALE (0.9):
 *   common    0.0002 – 0.002
 *   rare      0.007  – 0.022
 *   epic      0.035  – 0.09
 *   mythic    0.135  – 0.27
 *   legendary 0.35   – 0.9
 * Pack prices (0.5 / 1 / 3 / 5 / 7 / 16 / 24 / 33 / 55 GRAM) and card counts
 * (3 / 3 / 4 / 5 / 6 / 7 / 8) are tuned against the scaled numbers so a
 * pack pays itself back in ~30-45 days, with level bonuses
 * pushing active collectors toward the lower end of that range. The
 * Legendary pack is priced high enough that it no longer pays back faster
 * than the cheaper tiers.
 */
export const RARITY_YIELD_RANGE: Record<Rarity, [number, number]> = {
  common: [0.0002, 0.002],
  rare: [0.007, 0.022],
  epic: [0.035, 0.09],
  mythic: [0.135, 0.27],
  legendary: [0.35, 0.9],
};

/** Soft level scaling: +2% per level, x1.38 at level 20. */
export const LEVEL_BONUS = 0.02;

export const CLAIM_CAP_HOURS = 24;
export const CLAIM_CAP_MS = CLAIM_CAP_HOURS * 3600_000;

export function levelMultiplier(level: number) {
  const safeLevel = Number.isFinite(level) ? Math.min(CARD_MAX_LEVEL, Math.max(1, level)) : 1;
  return 1 + LEVEL_BONUS * (safeLevel - 1);
}

export function creatureYield(creatureId: string, entry: OwnedEntry | undefined) {
  const card = CARDS_BY_ID[creatureId];
  if (!card || !entry) return 0;
  return card.dailyGram * levelMultiplier(entry.level);
}

export function dailyYield(owned: Record<string, OwnedEntry>) {
  return Object.keys(owned).reduce((sum, id) => sum + creatureYield(id, owned[id]), 0);
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
