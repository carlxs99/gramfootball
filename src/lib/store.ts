import { useSyncExternalStore } from "react";
import { initData, isTelegram, startParam } from "./telegram";
import { syncPlayer } from "./player.functions";
import { claimTaskCloud, claimYieldCloud, openPackCloud } from "./game.functions";
import {
  applyPackPure,
  claimYieldPure,
  initialState,
  type ClaimResult,
  type OwnedEntry,
  type PlayerState,
  type PullResult,
  type ReferralLevel,
  REFERRAL_RATES,
  round4,
} from "./progress";

export type { OwnedEntry, PlayerState, PullResult, ClaimResult, ReferralLevel };
export { REFERRAL_RATES };
export { collectionStats, collectionScore, playerLevel } from "./progress";

const KEY = "creature-packs-state-v1";

let state: PlayerState = initialState();
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...initialState(), ...(JSON.parse(raw) as PlayerState) };
    // New players start with an empty balance: GRAM only comes from deposits,
    // yield, tasks and referrals. No free starting credit.
    else state = { ...initialState("CP-" + Math.floor(100000 + Math.random() * 899999)), gram: 0 };
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
    scheduleCloudPush();
  }
  listeners.forEach((l) => l());
}

const serverSnapshot = initialState();

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
  state = { ...state, name: name.trim().slice(0, 32) };
  emit();
}

/** Overwrites the local mirror with the authoritative cloud state. */
export function applyServerState(remote: unknown) {
  if (!remote || typeof remote !== "object") return;
  state = { ...state, ...(remote as Partial<PlayerState>) };
  emit();
}

/** Overwrites the balance with the authoritative value coming from the cloud. */
export function setGram(value: number) {
  if (!Number.isFinite(value) || Math.abs(state.gram - value) < 0.00005) return;
  state = { ...state, gram: round4(value) };
  emit();
}

/* --------------------------------- Packs ---------------------------------- */

/**
 * Buys and opens a pack. Signed-in Telegram players are resolved entirely on
 * the server (balance check, odds, collection update); the local reducer is
 * only a sandbox fallback for the browser preview.
 */
export async function purchasePack(packId: string, price: number, pulls?: string[]) {
  if (cloudReady) {
    const res = await openPackCloud({ data: { initData: initData(), packId } });
    applyServerState(res.state);
    return res.results as PullResult[];
  }
  if (state.gram < price) throw new Error("Not enough GRAM in your balance");
  let rolled = pulls;
  if (!rolled?.length) {
    const { rollPack } = await import("./packs");
    rolled = rollPack(packId);
  }
  const applied = applyPackPure(state, price, rolled);
  state = applied.state;
  emit();
  return applied.results;
}

/* --------------------------------- Yield ---------------------------------- */

export async function claimYield(now = Date.now()): Promise<ClaimResult | null> {
  if (cloudReady) {
    const res = await claimYieldCloud({ data: { initData: initData() } });
    if (!res.result) return null;
    applyServerState(res.state);
    return res.result;
  }
  const applied = claimYieldPure(state, now);
  if (!applied) return null;
  state = applied.state;
  emit();
  return applied.result;
}

/* ---------------------------------- Tasks --------------------------------- */

export async function claimTask(id: string) {
  if (cloudReady) {
    const res = await claimTaskCloud({ data: { initData: initData(), taskId: id } });
    applyServerState(res.state);
    return res.reward;
  }
  const { TASKS, taskState } = await import("./tasks");
  const task = TASKS.find((t) => t.id === id);
  if (!task) return 0;
  const s = taskState(task, state);
  if (!s.done || s.claimed) return 0;
  state = {
    ...state,
    gram: round4(state.gram + task.reward),
    tasksClaimed: { ...state.tasksClaimed, [id]: Date.now() },
  };
  emit();
  return task.reward;
}

/* -------------------------------- Referrals -------------------------------- */

export function referralTotals(player: PlayerState) {
  const people = player.referrals.l1 + player.referrals.l2 + player.referrals.l3;
  const earned = player.referralEarned.l1 + player.referralEarned.l2 + player.referralEarned.l3;
  return { people, earned };
}

/* ------------------------------ Telegram cloud ----------------------------- */

let cloudReady = false;

/* ------------------------------ Ban state ------------------------------ */

export type BanState = { banned: boolean; reason: string | null };
const NOT_BANNED: BanState = { banned: false, reason: null };
let ban: BanState = NOT_BANNED;
const banListeners = new Set<() => void>();

function setBan(next: BanState) {
  if (ban.banned === next.banned && ban.reason === next.reason) return;
  ban = next;
  banListeners.forEach((l) => l());
}

export function useBanState(): BanState {
  return useSyncExternalStore(
    (cb) => {
      banListeners.add(cb);
      return () => banListeners.delete(cb);
    },
    () => ban,
    () => NOT_BANNED,
  );
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;

async function push() {
  try {
    const res = await syncPlayer({ data: { initData: initData(), name: state.name } });
    setBan({ banned: Boolean(res?.banned), reason: res?.banReason ?? null });
    if (res?.state) applyServerStateSilently(res.state);
  } catch (error) {
    console.error("Cloud sync failed", error);
  }
}

function applyServerStateSilently(remote: unknown) {
  if (!remote || typeof remote !== "object") return;
  state = { ...state, ...(remote as Partial<PlayerState>) };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((l) => l());
}

/** Debounced profile refresh (progress itself is written by server functions). */
export function scheduleCloudPush() {
  if (!cloudReady) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(push, 1500);
}

/** Loads the cloud profile for the current Telegram account (once per session). */
export async function connectTelegram() {
  if (typeof window === "undefined" || cloudReady || !isTelegram()) return null;
  load();
  try {
    const res = await syncPlayer({
      data: { initData: initData(), startParam: startParam(), name: state.name },
    });
    const remote = (res.state as Partial<PlayerState> | null) ?? {};
    state = {
      ...initialState(),
      ...remote,
      name: res.name,
      playerId: "TG-" + res.telegramId,
      referralCode: res.referralCode,
      referredBy: res.referredBy ? "GR" + String(res.referredBy % 1000000).padStart(6, "0") : null,
      referrals: res.referrals,
    };
    setBan({ banned: Boolean(res.banned), reason: res.banReason ?? null });
    cloudReady = true;
    listeners.forEach((l) => l());
    return res;
  } catch (error) {
    console.error("Telegram sign-in failed", error);
    return null;
  }
}

export function cloudConnected() {
  return cloudReady;
}
