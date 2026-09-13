import { createServerFn } from "@tanstack/react-start";
import {
  applyAction,
  buildFighter,
  createBattle as createEngine,
  forfeit,
  MIN_WAGER,
  sideOf,
  TEAM_SIZE,
  TURN_MS,
  type BattleAction,
  type BattleState,
} from "./battle";
import { round4 } from "./progress";

/**
 * Authoritative PvP battles. Wagers are held by the server the moment a room
 * is created or joined, every turn is resolved server-side, and the pot is
 * paid to the winner. The client can never declare a result.
 */

type Input = { initData: string };

export type BattleRoom = {
  id: string;
  wager: number;
  status: string;
  hostId: number;
  hostName: string;
  guestId: number | null;
  guestName: string | null;
  winnerId: number | null;
  team: string[];
  createdAt: string;
  turnAt: string;
};

export type BattleView = BattleRoom & { state: BattleState | null; turnMs: number };

function requireInitData<T extends Input>(input: T) {
  if (!input || typeof input.initData !== "string" || input.initData.length < 10) {
    throw new Error("Missing Telegram session");
  }
  return input;
}

function validTeam(team: unknown): string[] {
  if (!Array.isArray(team) || team.length !== TEAM_SIZE) throw new Error("Pick 3 creatures");
  const ids = team.map((id) => {
    if (typeof id !== "string" || !id) throw new Error("Pick 3 creatures");
    return id;
  });
  if (new Set(ids).size !== TEAM_SIZE) throw new Error("Pick 3 different creatures");
  return ids;
}

function validWager(wager: unknown): number {
  const n = Number(wager);
  if (!Number.isFinite(n) || n < MIN_WAGER - 1e-9) throw new Error("Wager is too small");
  return round4(n);
}

async function ctx(initData: string) {
  const { verifyInitData } = await import("./telegram.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const helpers = await import("./referrals.server");
  const user = await verifyInitData(initData);
  await helpers.assertNotBanned(supabaseAdmin, user.id);
  return { user, supabaseAdmin, ...helpers };
}

function secureRandom() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! / 2 ** 32;
}

async function displayName(admin: any, telegramId: number) {
  const { data } = await admin
    .from("players")
    .select("username, first_name")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  return (data?.first_name || data?.username || `Player ${telegramId}`) as string;
}

/** Collusion guard: no self-farming through a second account (self or same IP). */
async function assertFairMatch(admin: any, a: number, b: number) {
  if (a === b) throw new Error("You cannot battle yourself");

  const { data: ips } = await admin.from("player_ips").select("telegram_id, ip").in("telegram_id", [a, b]);
  const setA = new Set((ips ?? []).filter((r: any) => Number(r.telegram_id) === a).map((r: any) => r.ip));
  const shared = (ips ?? []).some((r: any) => Number(r.telegram_id) === b && setA.has(r.ip));
  if (shared) throw new Error("Both players share the same network — battle blocked");
}

function toRoom(row: any): BattleRoom {
  return {
    id: row.id,
    wager: Number(row.wager),
    status: row.status,
    hostId: Number(row.host_id),
    hostName: row.battle?.host?.name ?? row.host_name ?? "Player",
    guestId: row.guest_id ? Number(row.guest_id) : null,
    guestName: row.battle?.guest?.name ?? null,
    winnerId: row.winner_id ? Number(row.winner_id) : null,
    team: (row.host_team ?? []) as string[],
    createdAt: row.created_at,
    turnAt: row.turn_at,
  };
}

function toView(row: any): BattleView {
  const state = (row.battle && row.battle.host ? (row.battle as BattleState) : null) ?? null;
  return { ...toRoom(row), state, turnMs: TURN_MS };
}

async function assertOwnsTeam(admin: any, telegramId: number, team: string[]) {
  const { loadState } = await import("./referrals.server");
  const state = await loadState(admin, telegramId);
  for (const id of team) {
    if (!state.owned[id]) throw new Error("You do not own one of the selected creatures");
  }
  return state;
}

/** Lobby: open rooms, my live battle and my recent results. */
export const listBattlesCloud = createServerFn({ method: "POST" })
  .inputValidator((input: Input) => requireInitData(input))
  .handler(async ({ data }) => {
    const { user, supabaseAdmin } = await ctx(data.initData);

    const { data: openRows } = await supabaseAdmin
      .from("battles")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(40);

    const { data: mineRowsRaw } = await supabaseAdmin
      .from("battles")
      .select("*")
      .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(20);

    const mineRows = mineRowsRaw ?? [];

    const names = new Map<number, string>();
    for (const row of [...(openRows ?? []), ...(mineRows ?? [])]) {
      for (const id of [row.host_id, row.guest_id]) {
        if (id && !names.has(Number(id))) names.set(Number(id), "");
      }
    }
    if (names.size) {
      const { data: players } = await supabaseAdmin
        .from("players")
        .select("telegram_id, username, first_name")
        .in("telegram_id", [...names.keys()]);
      for (const p of players ?? []) {
        names.set(
          Number(p.telegram_id),
          (p.first_name || p.username || `Player ${p.telegram_id}`) as string,
        );
      }
    }
    const withNames = (row: any) => {
      const view = toView(row);
      return {
        ...view,
        hostName: names.get(view.hostId) || view.hostName,
        guestName: view.guestId ? names.get(view.guestId) || view.guestName : null,
      };
    };

    const mine = (mineRows ?? []).map(withNames);
    return {
      me: user.id,
      open: (openRows ?? []).map(withNames).filter((r) => r.hostId !== user.id),
      myOpen: mine.filter((r) => r.status === "open"),
      active: mine.find((r) => r.status === "active") ?? null,
      history: mine.filter((r) => r.status === "finished").slice(0, 10),
    };
  });

/** Opens a room and holds the wager. */
export const createBattleCloud = createServerFn({ method: "POST" })
  .inputValidator((input: Input & { wager: number; team: string[] }) => {
    requireInitData(input);
    return { ...input, wager: validWager(input.wager), team: validTeam(input.team) };
  })
  .handler(async ({ data }) => {
    const { user, supabaseAdmin, guardFor, loadStateRaw, persistState } = await ctx(data.initData);

    const { data: existing } = await supabaseAdmin
      .from("battles")
      .select("id")
      .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
      .in("status", ["open", "active"])
      .limit(1);
    if (existing?.length) throw new Error("You already have a battle in progress");

    const { state, raw } = await loadStateRaw(supabaseAdmin, user.id);
    for (const id of data.team) {
      if (!state.owned[id]) throw new Error("You do not own one of the selected creatures");
    }
    if (state.gram + 1e-9 < data.wager) throw new Error("Not enough GRAM in your balance");

    // The wager leaves the balance right away, so it cannot be spent twice.
    await persistState(supabaseAdmin, user.id, state, -data.wager, guardFor(raw, state, ["gram"]));

    const { data: row, error } = await supabaseAdmin
      .from("battles")
      .insert({
        host_id: user.id,
        wager: data.wager,
        status: "open",
        host_team: data.team,
      })
      .select("*")
      .single();
    if (error) {
      await persistState(supabaseAdmin, user.id, state, data.wager);
      throw new Error(error.message);
    }
    return toView(row);
  });

/** Cancels an open room and refunds the held wager. */
export const cancelBattleCloud = createServerFn({ method: "POST" })
  .inputValidator((input: Input & { id: string }) => {
    requireInitData(input);
    if (typeof input.id !== "string") throw new Error("Unknown battle");
    return input;
  })
  .handler(async ({ data }) => {
    const { user, supabaseAdmin, loadState, persistState } = await ctx(data.initData);
    // Only an untouched open room can be cancelled, so the refund runs once.
    const { data: rows } = await supabaseAdmin
      .from("battles")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("host_id", user.id)
      .eq("status", "open")
      .select("*");
    const row = rows?.[0];
    if (!row) throw new Error("This room can no longer be cancelled");
    const state = await loadState(supabaseAdmin, user.id);
    await persistState(supabaseAdmin, user.id, state, Number(row.wager));
    return { refunded: Number(row.wager) };
  });

/** Joins an open room: holds the wager and starts the fight. */
export const joinBattleCloud = createServerFn({ method: "POST" })
  .inputValidator((input: Input & { id: string; team: string[] }) => {
    requireInitData(input);
    if (typeof input.id !== "string") throw new Error("Unknown battle");
    return { ...input, team: validTeam(input.team) };
  })
  .handler(async ({ data }) => {
    const { user, supabaseAdmin, guardFor, loadStateRaw, persistState } = await ctx(data.initData);

    const { data: busy } = await supabaseAdmin
      .from("battles")
      .select("id")
      .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
      .in("status", ["open", "active"])
      .limit(1);
    if (busy?.length) throw new Error("You already have a battle in progress");

    const { data: room } = await supabaseAdmin
      .from("battles")
      .select("*")
      .eq("id", data.id)
      .eq("status", "open")
      .maybeSingle();
    if (!room) throw new Error("This room is no longer available");
    const hostId = Number(room.host_id);
    await assertFairMatch(supabaseAdmin, hostId, user.id);

    const { state, raw } = await loadStateRaw(supabaseAdmin, user.id);
    for (const id of data.team) {
      if (!state.owned[id]) throw new Error("You do not own one of the selected creatures");
    }
    const wager = Number(room.wager);
    if (state.gram + 1e-9 < wager) throw new Error("Not enough GRAM in your balance");

    const hostState = await (await import("./referrals.server")).loadState(supabaseAdmin, hostId);
    const engine = createEngine(
      {
        telegramId: hostId,
        name: await displayName(supabaseAdmin, hostId),
        team: (room.host_team as string[]).map((id) => buildFighter(id, hostState.owned[id])),
        active: 0,
        defending: false,
      },
      {
        telegramId: user.id,
        name: user.first_name || user.username || `Player ${user.id}`,
        team: data.team.map((id) => buildFighter(id, state.owned[id])),
        active: 0,
        defending: false,
      },
    );

    // Atomic claim: only one guest can flip the room from open to active.
    const { data: claimed } = await supabaseAdmin
      .from("battles")
      .update({
        guest_id: user.id,
        guest_team: data.team,
        status: "active",
        battle: engine,
        turn_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("status", "open")
      .is("guest_id", null)
      .select("*");
    const row = claimed?.[0];
    if (!row) throw new Error("This room is no longer available");

    await persistState(supabaseAdmin, user.id, state, -wager, guardFor(raw, state, ["gram"]));

    const { notifyUser } = await import("./telegram.server");
    await notifyUser(
      hostId,
      `⚔️ <b>Your battle started!</b>\n${engine.guest.name} accepted your ${wager} GRAM duel. Open the app and take your turn.`,
    );
    return toView(row);
  });


/** Reads the live battle. */
export const getBattleCloud = createServerFn({ method: "POST" })
  .inputValidator((input: Input & { id: string }) => {
    requireInitData(input);
    if (typeof input.id !== "string") throw new Error("Unknown battle");
    return input;
  })
  .handler(async ({ data }) => {
    const { user, supabaseAdmin } = await ctx(data.initData);
    const { data: rowRaw } = await supabaseAdmin
      .from("battles")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!rowRaw) throw new Error("Battle not found");
    if (Number(rowRaw.host_id) !== user.id && Number(rowRaw.guest_id) !== user.id)
      throw new Error("You are not in this battle");
    const row = rowRaw;
    return toView(row);
  });

async function settle(admin: any, row: any, state: BattleState) {
  const { creditGram } = await import("./referrals.server");
  const pot = round4(Number(row.wager) * 2);
  const winnerId = state.winner!;
  const loserId = winnerId === Number(row.host_id) ? Number(row.guest_id) : Number(row.host_id);

  const { data: settled } = await admin
    .from("battles")
    .update({ status: "finished", winner_id: winnerId, battle: state })
    .eq("id", row.id)
    .eq("status", "active")
    .select("*");
  const finished = settled?.[0];
  // The status guard makes sure the pot is only ever paid once.
  if (!finished) return null;

  if (pot > 0) {
    // Balance-only credit: paying the pot must never overwrite cards or task
    // claims the winner earned while the battle was running.
    await creditGram(admin, winnerId, pot);


    const { notifyUser } = await import("./telegram.server");
    await notifyUser(winnerId, `🏆 <b>Battle won!</b>\nYou collected ${pot.toFixed(4)} GRAM.`);
    await notifyUser(
      loserId,
      `💀 <b>Battle lost.</b>\nYour ${Number(row.wager)} GRAM wager is gone. Rematch?`,
    );
  }
  return finished;
}

/** Plays one turn. */
export const battleActionCloud = createServerFn({ method: "POST" })
  .inputValidator(
    (input: Input & { id: string; action: BattleAction; target?: number; self?: number }) => {
      requireInitData(input);
      if (typeof input.id !== "string") throw new Error("Unknown battle");
      if (!["attack", "defend", "special"].includes(input.action as string))
        throw new Error("Unknown action");
      for (const idx of [input.target, input.self]) {
        if (idx === undefined) continue;
        if (!Number.isInteger(idx) || idx < 0 || idx >= TEAM_SIZE)
          throw new Error("Unknown creature");
      }
      return input;
    },
  )

  .handler(async ({ data }) => {
    const { user, supabaseAdmin } = await ctx(data.initData);
    const { data: row } = await supabaseAdmin
      .from("battles")
      .select("*")
      .eq("id", data.id)
      .eq("status", "active")
      .maybeSingle();
    if (!row) throw new Error("Battle not found");
    const state = row.battle as BattleState;
    if (!sideOf(state, user.id)) throw new Error("You are not in this battle");

    const turnStarted = Date.parse(row.turn_at);
    if (Number.isFinite(turnStarted) && Date.now() - turnStarted > TURN_MS && state.turn !== user.id) {
      // The opponent ran out of time: this call closes the battle in my favour.
      const ended = forfeit(state, state.turn);
      const finished = await settle(supabaseAdmin, row, ended);
      return toView(finished ?? { ...row, battle: ended, status: "finished" });
    }

    let next = applyAction(state, user.id, data.action, secureRandom, data.target, data.self);
    // The opponent plays their own turn; the client refreshes to see it.

    // Optimistic guard on the turn counter: a double tap cannot play twice.
    const { data: updated } = await supabaseAdmin
      .from("battles")
      .update({ battle: next, turn_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("status", "active")
      .filter("battle->>seq", "eq", String(state.seq))
      .select("*");
    const saved = updated?.[0];
    if (!saved) throw new Error("Please try again");

    if (next.winner !== null) {
      const finished = await settle(supabaseAdmin, saved, next);
      return toView(finished ?? saved);
    }
    return toView(saved);
  });

/** Claims the win when the opponent let the turn timer run out. */
export const battleTimeoutCloud = createServerFn({ method: "POST" })
  .inputValidator((input: Input & { id: string }) => {
    requireInitData(input);
    if (typeof input.id !== "string") throw new Error("Unknown battle");
    return input;
  })
  .handler(async ({ data }) => {
    const { user, supabaseAdmin } = await ctx(data.initData);
    const { data: row } = await supabaseAdmin
      .from("battles")
      .select("*")
      .eq("id", data.id)
      .eq("status", "active")
      .maybeSingle();
    if (!row) throw new Error("Battle not found");
    const state = row.battle as BattleState;
    if (!sideOf(state, user.id)) throw new Error("You are not in this battle");
    if (state.turn === user.id) throw new Error("It is your turn");
    const turnStarted = Date.parse(row.turn_at);
    if (!Number.isFinite(turnStarted) || Date.now() - turnStarted <= TURN_MS)
      throw new Error("The opponent still has time");

    const ended = forfeit(state, state.turn);
    const finished = await settle(supabaseAdmin, row, ended);
    return toView(finished ?? { ...row, battle: ended, status: "finished" });
  });

