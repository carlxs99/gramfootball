import { useSyncExternalStore } from "react";
import { CARDS, CARDS_BY_ID, RARITIES, RARITY_XP, type Rarity } from "./creatures";
import { accrued, streakBonus } from "./economy";
import { initData, isTelegram } from "./telegram";
import { syncPlayer } from "./player.functions";

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

const KEY = "creature-packs-state-v1";

const initial = (playerId = "CP-000000"): PlayerState => ({
  name: "Collector",
  playerId,
  gram: 25,
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

let state: PlayerState = initial();
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...initial(), ...(JSON.parse(raw) as PlayerState) };
    else state = initial("CP-" + Math.floor(100000 + Math.random() * 899999));
    if (!state.lastClaimAt) state = { ...state, lastClaimAt: Date.now() };
    if (!state.referralCode || state.referralCode === "GR000000") {
      state = { ...state, referralCode: state.playerId.replace("CP-", "GR") };
    }
    if (!state.tasksClaimed) state = { ...state, tasksClaimed: {} };
    if (!state.referrals) state = { ...state, referrals: { l1: 0, l2: 0, l3: 0 } };
    if (!state.referralEarned) state = { ...state, referralEarned: { l1: 0, l2: 0, l3: 0 } };
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

/* ---------------------------------- Tasks --------------------------------- */

export function claimTask(id: string, reward: number) {
  if (state.tasksClaimed[id]) return false;
  state = {
    ...state,
    gram: Math.round((state.gram + reward) * 10000) / 10000,
    tasksClaimed: { ...state.tasksClaimed, [id]: Date.now() },
  };
  emit();
  return true;
}

/* -------------------------------- Referrals -------------------------------- */

/** Commission paid on every deposit or pack purchase made by a referral. */
export const REFERRAL_RATES = { l1: 0.1, l2: 0.05, l3: 0.01 } as const;
export type ReferralLevel = keyof typeof REFERRAL_RATES;

export function applyReferralCode(code: string) {
  const clean = code.trim().toUpperCase();
  if (state.referredBy) return { ok: false, error: "You already used an invite code." };
  if (!/^GR\d{6}$/.test(clean)) return { ok: false, error: "Invalid code format (GR123456)." };
  if (clean === state.referralCode) return { ok: false, error: "You cannot invite yourself." };
  state = { ...state, referredBy: clean };
  emit();
  return { ok: true as const };
}

/** Credit a commission from a referral's deposit or purchase. */
export function creditReferral(level: ReferralLevel, spend: number) {
  const amount = Math.round(spend * REFERRAL_RATES[level] * 10000) / 10000;
  if (amount <= 0) return 0;
  state = {
    ...state,
    gram: Math.round((state.gram + amount) * 10000) / 10000,
    referralEarned: { ...state.referralEarned, [level]: Math.round((state.referralEarned[level] + amount) * 10000) / 10000 },
  };
  emit();
  return amount;
}

/** Register a new member joining under this player at the given depth. */
export function registerReferral(level: ReferralLevel) {
  state = { ...state, referrals: { ...state.referrals, [level]: state.referrals[level] + 1 } };
  emit();
}

export function referralTotals(player: PlayerState) {
  const people = player.referrals.l1 + player.referrals.l2 + player.referrals.l3;
  const earned = player.referralEarned.l1 + player.referralEarned.l2 + player.referralEarned.l3;
  return { people, earned };
}
