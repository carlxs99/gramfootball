import { useSyncExternalStore } from "react";
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
};

const KEY = "creature-packs-state-v1";

const initial = (): PlayerState => ({
  name: "Collector",
  playerId: "CP-" + Math.floor(100000 + Math.random() * 899999),
  gram: 25,
  xp: 0,
  packsOpened: 0,
  lastPull: null,
  owned: {},
  lastClaimAt: 0,
  streak: 0,
  totalEarned: 0,
});

let state: PlayerState = initial();
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...initial(), ...(JSON.parse(raw) as PlayerState) };
    if (!state.lastClaimAt) state = { ...state, lastClaimAt: Date.now() };
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function emit() {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((l) => l());
}

const serverSnapshot = initial();

export function usePlayer(): PlayerState {
  return useSyncExternalStore(
    (cb) => {
      load();
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => {
      load();
      return state;
    },
    () => serverSnapshot,
  );
}

export function setName(name: string) {
  state = { ...state, name };
  emit();
}

export function addGram(amount: number) {
  state = { ...state, gram: Math.round((state.gram + amount) * 100) / 100 };
  emit();
}

export type PullResult = { creatureId: string; duplicate: boolean; rarity: Rarity };

export function applyPack(price: number, pulls: string[]): PullResult[] {
  const owned = { ...state.owned };
  const results: PullResult[] = [];
  let xpGain = 0;

  for (const id of pulls) {
    const creature = CARDS_BY_ID[id];
    if (!creature) continue;
    const prev = owned[id];
    const duplicate = Boolean(prev);
    const gained = RARITY_XP[creature.rarity];
    xpGain += gained;
    if (prev) {
      const xp = prev.xp + gained;
      const level = Math.min(20, 1 + Math.floor(xp / 100));
      owned[id] = { qty: prev.qty + 1, level, xp };
    } else {
      owned[id] = { qty: 1, level: 1, xp: 0 };
    }
    results.push({ creatureId: id, duplicate, rarity: creature.rarity });
  }

  state = {
    ...state,
    owned,
    xp: state.xp + xpGain,
    gram: Math.round((state.gram - price) * 100) / 100,
    packsOpened: state.packsOpened + 1,
    lastPull: pulls[pulls.length - 1] ?? state.lastPull,
  };
  emit();
  return results;
}

export type ClaimResult = { base: number; bonus: number; total: number; streak: number };

/** Collect the GRAM produced by the collection since the last claim. */
export function claimYield(now = Date.now()): ClaimResult | null {
  const base = accrued(state.owned, state.lastClaimAt, now);
  if (base <= 0) return null;

  const withinStreak = now - state.lastClaimAt <= 48 * 3600_000;
  const streak = withinStreak ? state.streak + 1 : 1;
  const bonus = base * streakBonus(streak);
  const total = Math.round((base + bonus) * 10000) / 10000;

  state = {
    ...state,
    gram: Math.round((state.gram + total) * 10000) / 10000,
    totalEarned: Math.round((state.totalEarned + total) * 10000) / 10000,
    lastClaimAt: now,
    streak,
  };
  emit();
  return { base, bonus, total, streak };
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
