/**
 * Pure PvP battle engine. Shared by the client (rendering) and the server
 * (authoritative resolution). No browser or server-only imports here.
 */
import { CARDS_BY_ID, type Rarity } from "./creatures";
import type { OwnedEntry } from "./progress";

export type BattleAction = "attack" | "defend" | "special";
export const TEAM_SIZE = 3;
/** A player who does not act within this window loses by timeout. */
export const TURN_MS = 90_000;
export const MIN_WAGER = 0.1;

export type Fighter = {
  id: string;
  name: string;
  rarity: Rarity;
  level: number;
  atk: number;
  def: number;
  spd: number;
  hp: number;
  maxHp: number;
  specialUsed: boolean;
};

export type Side = {
  telegramId: number;
  name: string;
  team: Fighter[];
  active: number;
  defending: boolean;
};

export type LogEntry = {
  seq: number;
  actor: number;
  action: BattleAction;
  damage: number;
  miss: boolean;
  heal: number;
  ko: string | null;
  text: string;
};

export type BattleState = {
  seq: number;
  turn: number;
  host: Side;
  guest: Side;
  log: LogEntry[];
  winner: number | null;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function buildFighter(cardId: string, owned?: OwnedEntry): Fighter {
  const card = CARDS_BY_ID[cardId];
  if (!card) throw new Error("Unknown creature");
  const level = clamp(owned?.level ?? 1, 1, 20);
  const scale = 1 + (level - 1) * 0.04;
  const atk = Math.round(card.stats.atk * scale);
  const def = Math.round(card.stats.def * scale);
  const spd = Math.round(card.stats.spd * scale);
  const maxHp = Math.round(70 + def * 2.4 + atk * 0.6);
  return {
    id: card.id,
    name: card.name,
    rarity: card.rarity,
    level,
    atk,
    def,
    spd,
    hp: maxHp,
    maxHp,
    specialUsed: false,
  };
}

export function teamSpeed(team: Fighter[]) {
  return team.reduce((sum, f) => sum + f.spd, 0);
}

export function createBattle(host: Side, guest: Side): BattleState {
  const hostFirst = teamSpeed(host.team) >= teamSpeed(guest.team);
  return {
    seq: 0,
    turn: hostFirst ? host.telegramId : guest.telegramId,
    host,
    guest,
    log: [],
    winner: null,
  };
}

export function sideOf(state: BattleState, telegramId: number): "host" | "guest" | null {
  if (state.host.telegramId === telegramId) return "host";
  if (state.guest.telegramId === telegramId) return "guest";
  return null;
}

const alive = (side: Side) => side.team.some((f) => f.hp > 0);

function nextAlive(side: Side) {
  if (side.team[side.active] && side.team[side.active]!.hp > 0) return;
  const idx = side.team.findIndex((f) => f.hp > 0);
  if (idx >= 0) side.active = idx;
}

/**
 * Resolves one action. `rand` is injected so the server can use a secure
 * source while tests stay deterministic.
 */
export function applyAction(
  state: BattleState,
  telegramId: number,
  action: BattleAction,
  rand: () => number = Math.random,
): BattleState {
  if (state.winner !== null) throw new Error("This battle is already over");
  if (state.turn !== telegramId) throw new Error("It is not your turn");
  const key = sideOf(state, telegramId);
  if (!key) throw new Error("You are not in this battle");

  const next: BattleState = JSON.parse(JSON.stringify(state));
  const me = next[key];
  const foeKey = key === "host" ? "guest" : "host";
  const foe = next[foeKey];
  nextAlive(me);
  nextAlive(foe);

  const attacker = me.team[me.active]!;
  const target = foe.team[foe.active]!;

  let damage = 0;
  let heal = 0;
  let miss = false;
  let ko: string | null = null;
  let text = "";

  if (action === "defend") {
    me.defending = true;
    heal = Math.round(attacker.maxHp * 0.06);
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
    text = `${attacker.name} braces and recovers ${heal} HP.`;
  } else {
    const special = action === "special";
    if (special) {
      if (attacker.specialUsed) throw new Error("Special already used by this creature");
      attacker.specialUsed = true;
    }
    const hitChance = special ? 0.75 : 0.95 - clamp((target.spd - attacker.spd) * 0.004, -0.05, 0.15);
    miss = rand() > hitChance;
    if (miss) {
      text = `${attacker.name} used ${special ? "a special" : "an attack"} — it missed!`;
    } else {
      const power = attacker.atk * (special ? 1.75 : 1) * (0.88 + rand() * 0.24);
      const crit = !special && rand() < 0.08;
      let raw = power * (crit ? 1.5 : 1) - target.def * 0.55;
      if (foe.defending) raw *= 0.5;
      damage = Math.max(3, Math.round(raw));
      target.hp = Math.max(0, target.hp - damage);
      text = `${attacker.name} dealt ${damage} damage${crit ? " (critical!)" : ""} to ${target.name}.`;
      if (target.hp === 0) {
        ko = target.name;
        text += ` ${target.name} is knocked out!`;
      }
    }
    me.defending = false;
  }

  // The defender's shield only lasts until it is hit once.
  if (action !== "defend" && !miss) foe.defending = false;

  nextAlive(foe);
  next.seq = state.seq + 1;
  next.log = [
    ...state.log,
    { seq: next.seq, actor: telegramId, action, damage, miss, heal, ko, text },
  ].slice(-40);

  if (!alive(foe)) {
    next.winner = telegramId;
    next.turn = telegramId;
  } else {
    next.turn = foe.telegramId;
  }
  return next;
}

/** Auto-resolves the turn of a player who ran out of time: they forfeit. */
export function forfeit(state: BattleState, loserId: number): BattleState {
  const key = sideOf(state, loserId);
  if (!key) throw new Error("You are not in this battle");
  const winnerId = key === "host" ? state.guest.telegramId : state.host.telegramId;
  return {
    ...state,
    seq: state.seq + 1,
    winner: winnerId,
    turn: winnerId,
    log: [
      ...state.log,
      {
        seq: state.seq + 1,
        actor: loserId,
        action: "defend" as const,
        damage: 0,
        miss: false,
        heal: 0,
        ko: null,
        text: "Turn timer expired — the battle is forfeited.",
      },
    ].slice(-40),
  };
}
