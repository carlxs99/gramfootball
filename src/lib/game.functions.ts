import { createServerFn } from "@tanstack/react-start";
import { BY_RARITY, RARITIES, type Rarity } from "./creatures";
import { PACKS_BY_ID } from "./packs";
import { applyPackPure, claimYieldPure } from "./progress";
import { TASKS, taskState } from "./tasks";

/**
 * Authoritative game actions. Balance, odds, collection and rewards are all
 * resolved on the server against the stored profile — the client can only ask
 * for an action, never declare its outcome.
 */

type Input = { initData: string };

function requireInitData<T extends Input>(input: T) {
  if (!input || typeof input.initData !== "string" || input.initData.length < 10) {
    throw new Error("Missing Telegram session");
  }
  return input;
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

export const openPackCloud = createServerFn({ method: "POST" })
  .inputValidator((input: Input & { packId: string }) => {
    requireInitData(input);
    if (typeof input.packId !== "string" || !PACKS_BY_ID[input.packId])
      throw new Error("Unknown pack");
    return input;
  })
  .handler(async ({ data }) => {
    const { user, supabaseAdmin, loadStateRaw, guardFor, persistState, payReferrals } = await ctx(
      data.initData,
    );
    const pack = PACKS_BY_ID[data.packId]!;

    const { state, raw } = await loadStateRaw(supabaseAdmin, user.id);
    if (state.gram < pack.price) throw new Error("Not enough GRAM in your balance");

    const rollRarity = (): Rarity => {
      const roll = secureRandom() * 100;
      let acc = 0;
      for (const r of RARITIES) {
        acc += pack.odds[r];
        if (roll < acc) return r;
      }
      return "common";
    };

    const pulls: string[] = [];
    for (let i = 0; i < pack.cards; i++) {
      const pool = BY_RARITY[rollRarity()];
      pulls.push(pool[Math.floor(secureRandom() * pool.length)]!.id);
    }

    const applied = applyPackPure(state, pack.price, pulls);
    // Guard: if a parallel request already changed the collection, this write
    // is rejected instead of silently overwriting the other pack's cards.
    const saved = await persistState(
      supabaseAdmin,
      user.id,
      applied.state,
      -pack.price,
      guardFor(raw, state, ["packsOpened"]),
    );
    await payReferrals(supabaseAdmin, user.id, pack.price);

    return { packId: pack.id, price: pack.price, pulls, results: applied.results, state: saved };
  });

export const claimYieldCloud = createServerFn({ method: "POST" })
  .inputValidator((input: Input) => requireInitData(input))
  .handler(async ({ data }) => {
    const { user, supabaseAdmin, loadStateRaw, guardFor, persistState } = await ctx(data.initData);
    const { state, raw } = await loadStateRaw(supabaseAdmin, user.id);
    const now = Date.now();
    const applied = claimYieldPure(state.lastClaimAt ? state : { ...state, lastClaimAt: now }, now);
    if (!applied) {
      const saved = await persistState(
        supabaseAdmin,
        user.id,
        { ...state, lastClaimAt: state.lastClaimAt || now },
        0,
      );
      return { result: null, state: saved };
    }
    // Guard on lastClaimAt: two simultaneous claims cannot both be paid.
    const saved = await persistState(
      supabaseAdmin,
      user.id,
      applied.state,
      applied.result.total,
      guardFor(raw, state, ["lastClaimAt"]),
    );
    return { result: applied.result, state: saved };
  });

export const claimTaskCloud = createServerFn({ method: "POST" })
  .inputValidator((input: Input & { taskId: string }) => {
    requireInitData(input);
    if (typeof input.taskId !== "string") throw new Error("Unknown task");
    return input;
  })
  .handler(async ({ data }) => {
    const { user, supabaseAdmin, loadStateRaw, guardFor, persistState } = await ctx(data.initData);
    const task = TASKS.find((t) => t.id === data.taskId);
    if (!task) throw new Error("Unknown task");

    let { state, raw } = await loadStateRaw(supabaseAdmin, user.id);
    // Make sure the claim ledger exists in the stored JSON so the optimistic
    // guard below can compare it (a missing key cannot be compared safely).
    if (!Object.prototype.hasOwnProperty.call(raw, "tasksClaimed")) {
      await persistState(
        supabaseAdmin,
        user.id,
        { ...state, tasksClaimed: state.tasksClaimed ?? {} },
        0,
      );
      ({ state, raw } = await loadStateRaw(supabaseAdmin, user.id));
    }

    // Referral counters live in the players table, not in the client state.
    const ids = async (parents: number[]) => {
      if (!parents.length) return [] as number[];
      const { data: rows } = await supabaseAdmin
        .from("players")
        .select("telegram_id")
        .in("referred_by", parents);
      return (rows ?? []).map((r: { telegram_id: number }) => r.telegram_id);
    };
    const l1 = await ids([user.id]);
    const l2 = await ids(l1);
    const l3 = await ids(l2);
    const checked = { ...state, referrals: { l1: l1.length, l2: l2.length, l3: l3.length } };

    const s = taskState(task, checked);
    if (s.claimed) throw new Error("Reward already claimed");
    if (!s.done) throw new Error("Task not completed yet");

    // Referral counts are derived data, never stored in the player state.
    const next = {
      ...state,
      tasksClaimed: { ...state.tasksClaimed, [task.id]: Date.now() },
    };
    const saved = await persistState(
      supabaseAdmin,
      user.id,
      next,
      task.reward,
      guardFor(raw, state, ["tasksClaimed"]),
    );
    return { reward: task.reward, state: saved };
  });
