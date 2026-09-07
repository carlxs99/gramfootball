import { useSyncExternalStore } from "react";
import { CREATURES, CREATURES_BY_ID, RARITIES, RARITY_XP, type Rarity } from "./creatures";

export type OwnedEntry = { qty: number; level: number; xp: number };

export type PlayerState = {
  name: string;
  playerId: string;
  gram: number;
  xp: number;
  packsOpened: number;
  lastPull: string | null;
  lastClaimAt: number;
  totalMined: number;
  owned: Record<string, OwnedEntry>;
};

const KEY = "creature-packs-state-v1";

const initial = (): PlayerState => ({
  name: "Collector",
  playerId: "CP-" + Math.floor(100000 + Math.random() * 899999),
  gram: 25,
  xp: 0,
  packsOpened: 0,
  lastPull: null,
  lastClaimAt: Date.now(),
  totalMined: 0,
  owned: {},
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
    else window.localStorage.setItem(KEY, JSON.stringify(state));
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
    const creature = CREATURES_BY_ID[id]!;
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

export function claimYield(amount: number) {
  const value = Math.max(0, Math.round(amount * 10000) / 10000);
  state = {
    ...state,
    gram: Math.round((state.gram + value) * 10000) / 10000,
    totalMined: Math.round((state.totalMined + value) * 10000) / 10000,
    lastClaimAt: Date.now(),
  };
  emit();
  return value;
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
  for (const c of CREATURES) {
    perRarity[c.rarity].total += 1;
    if (owned[c.id]) perRarity[c.rarity].found += 1;
  }
  const found = Object.keys(owned).length;
  return {
    found,
    total: CREATURES.length,
    percent: Math.round((found / CREATURES.length) * 100),
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
  return Object.keys(owned).reduce((sum, id) => sum + SCORE[CREATURES_BY_ID[id]!.rarity], 0);
}
