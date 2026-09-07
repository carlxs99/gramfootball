import { CREATURES, CREATURES_BY_ID, RARITIES, type Rarity } from "./creatures";
import type { OwnedEntry } from "./store";

/**
 * Daily GRAM production per creature copy.
 * Tuned so a pack pays itself back in ~31-38 days (balanced target).
 */
export const RARITY_YIELD: Record<Rarity, number> = {
  common: 0.0015,
  rare: 0.0035,
  epic: 0.011,
  mythic: 0.035,
  legendary: 0.1,
};

/** Extra % on total production for owning every creature of a rarity. */
export const SET_BONUS: Record<Rarity, number> = {
  common: 0.03,
  rare: 0.05,
  epic: 0.08,
  mythic: 0.12,
  legendary: 0.2,
};

/** Extra % for completing all 30 creatures. */
export const MASTER_BONUS = 0.25;

/** Production is capped after this many hours without claiming. */
export const CLAIM_CAP_HOURS = 24;

export type SetBonusInfo = {
  rarity: Rarity;
  found: number;
  total: number;
  complete: boolean;
  bonus: number;
};

export type Yield = {
  basePerDay: number;
  perDay: number;
  perHour: number;
  bonusPercent: number;
  sets: SetBonusInfo[];
  master: boolean;
  capPerClaim: number;
};

export function creatureYield(rarity: Rarity, qty: number) {
  return RARITY_YIELD[rarity] * qty;
}

export function computeYield(owned: Record<string, OwnedEntry>): Yield {
  let basePerDay = 0;
  const found: Record<Rarity, number> = {
    common: 0,
    rare: 0,
    epic: 0,
    mythic: 0,
    legendary: 0,
  };
  const totals: Record<Rarity, number> = {
    common: 0,
    rare: 0,
    epic: 0,
    mythic: 0,
    legendary: 0,
  };
  for (const c of CREATURES) totals[c.rarity] += 1;

  for (const [id, entry] of Object.entries(owned)) {
    const creature = CREATURES_BY_ID[id];
    if (!creature) continue;
    basePerDay += creatureYield(creature.rarity, entry.qty);
    found[creature.rarity] += 1;
  }

  const sets: SetBonusInfo[] = RARITIES.map((r) => ({
    rarity: r,
    found: found[r],
    total: totals[r],
    complete: found[r] >= totals[r],
    bonus: SET_BONUS[r],
  }));

  const master = sets.every((s) => s.complete);
  const bonus =
    sets.reduce((sum, s) => sum + (s.complete ? s.bonus : 0), 0) + (master ? MASTER_BONUS : 0);

  const perDay = basePerDay * (1 + bonus);
  return {
    basePerDay,
    perDay,
    perHour: perDay / 24,
    bonusPercent: Math.round(bonus * 100),
    sets,
    master,
    capPerClaim: (perDay / 24) * CLAIM_CAP_HOURS,
  };
}

export function pendingGram(perDay: number, lastClaimAt: number, now: number) {
  const hours = Math.max(0, (now - lastClaimAt) / 3_600_000);
  const capped = Math.min(hours, CLAIM_CAP_HOURS);
  return (perDay / 24) * capped;
}

export function fmtGram(v: number) {
  if (v === 0) return "0";
  if (v < 0.01) return v.toFixed(4);
  if (v < 1) return v.toFixed(3);
  return v.toFixed(2);
}
