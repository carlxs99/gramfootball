import { createServerFn } from "@tanstack/react-start";

/**
 * Admin-created tasks: join a channel, join a group, or open a bot.
 * Channel/group rewards are only paid when the bot confirms membership;
 * bot tasks require the player to stay in the bot for `wait_seconds`.
 */

export type CustomTaskView = {
  id: string;
  kind: "channel" | "group" | "bot";
  title: string;
  description: string;
  url: string;
  reward: number;
  waitSeconds: number;
  startedAt: string | null;
  claimed: boolean;
};

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
  const user = await verifyInitData(initData);
  const { assertNotBanned } = await import("./referrals.server");
  await assertNotBanned(supabaseAdmin, user.id);
  return { user, supabaseAdmin };
}

export const listCustomTasks = createServerFn({ method: "POST" })
  .inputValidator((input: Input) => requireInitData(input))
  .handler(async ({ data }): Promise<CustomTaskView[]> => {
    const { user, supabaseAdmin } = await ctx(data.initData);

    const { data: tasks } = await supabaseAdmin
      .from("custom_tasks")
      .select("id, kind, title, description, url, reward, wait_seconds")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    const { data: progress } = await supabaseAdmin
      .from("custom_task_progress")
      .select("task_id, started_at, claimed_at")
      .eq("telegram_id", user.id);

    const byTask = new Map<string, { started_at: string | null; claimed_at: string | null }>();
    for (const row of progress ?? []) byTask.set(row.task_id as string, row as never);

    return (tasks ?? []).map((t: any) => {
      const p = byTask.get(t.id as string);
      return {
        id: t.id as string,
        kind: t.kind as CustomTaskView["kind"],
        title: t.title as string,
        description: (t.description as string) ?? "",
        url: t.url as string,
        reward: Number(t.reward),
        waitSeconds: Number(t.wait_seconds),
        startedAt: p?.started_at ?? null,
        claimed: Boolean(p?.claimed_at),
      };
    });
  });

/** Marks the moment the player opened the link (starts the bot-task timer). */
export const startCustomTask = createServerFn({ method: "POST" })
  .inputValidator((input: Input & { taskId: string }) => {
    requireInitData(input);
    if (typeof input.taskId !== "string" || !input.taskId) throw new Error("Unknown task");
    return input;
  })
  .handler(async ({ data }) => {
    const { user, supabaseAdmin } = await ctx(data.initData);

    const { data: existing } = await supabaseAdmin
      .from("custom_task_progress")
      .select("id, started_at, claimed_at")
      .eq("task_id", data.taskId)
      .eq("telegram_id", user.id)
      .maybeSingle();

    if (existing?.claimed_at) return { startedAt: existing.started_at as string };
    if (existing?.started_at) return { startedAt: existing.started_at as string };

    const startedAt = new Date().toISOString();
    await supabaseAdmin
      .from("custom_task_progress")
      .upsert(
        { task_id: data.taskId, telegram_id: user.id, started_at: startedAt },
        { onConflict: "task_id,telegram_id" },
      );
    return { startedAt };
  });

export const claimCustomTask = createServerFn({ method: "POST" })
  .inputValidator((input: Input & { taskId: string }) => {
    requireInitData(input);
    if (typeof input.taskId !== "string" || !input.taskId) throw new Error("Unknown task");
    return input;
  })
  .handler(async ({ data }) => {
    const { user, supabaseAdmin } = await ctx(data.initData);

    const { data: task } = await supabaseAdmin
      .from("custom_tasks")
      .select("id, kind, chat_ref, reward, wait_seconds, active")
      .eq("id", data.taskId)
      .maybeSingle();
    if (!task || !task.active) throw new Error("This task is no longer available");

    const { data: progress } = await supabaseAdmin
      .from("custom_task_progress")
      .select("started_at, claimed_at")
      .eq("task_id", task.id)
      .eq("telegram_id", user.id)
      .maybeSingle();
    if (progress?.claimed_at) throw new Error("Reward already claimed");

    if (task.kind === "channel" || task.kind === "group") {
      const chat = (task.chat_ref as string | null)?.trim();
      if (!chat) throw new Error("This task is not configured correctly");
      const { botApi } = await import("./telegram.server");
      const res = (await botApi("getChatMember", { chat_id: chat, user_id: user.id })) as {
        ok: boolean;
        result?: { status?: string };
      };
      const status = res.result?.status ?? "";
      if (!res.ok || !["member", "administrator", "creator", "restricted"].includes(status)) {
        throw new Error("Join first, then claim your reward");
      }
    } else {
      const wait = Number(task.wait_seconds ?? 15);
      const started = progress?.started_at ? Date.parse(progress.started_at as string) : 0;
      if (!started) throw new Error("Open the bot first");
      const elapsed = (Date.now() - started) / 1000;
      if (elapsed < wait) throw new Error(`Wait ${Math.ceil(wait - elapsed)}s more`);
    }

    // Claim the row atomically: the update only matches while it is unclaimed.
    const { data: locked, error: lockError } = await supabaseAdmin
      .from("custom_task_progress")
      .update({ claimed_at: new Date().toISOString() })
      .eq("task_id", task.id)
      .eq("telegram_id", user.id)
      .is("claimed_at", null)
      .select("id");
    if (lockError) throw new Error(lockError.message);
    if (!locked || locked.length === 0) {
      if (progress) throw new Error("Reward already claimed");
      // No row yet (membership tasks skip "start"): the unique constraint on
      // (task_id, telegram_id) makes this insert the single winner of any race.
      const { error: insertError } = await supabaseAdmin.from("custom_task_progress").insert({
        task_id: task.id,
        telegram_id: user.id,
        started_at: new Date().toISOString(),
        claimed_at: new Date().toISOString(),
      });
      if (insertError) throw new Error("Reward already claimed");
    }

    const reward = Number(task.reward) || 0;
    // Balance-only movement: writing the whole snapshot here could roll back a
    // pack opening or task claim that committed in parallel.
    const { creditGram } = await import("./referrals.server");
    const saved = await creditGram(supabaseAdmin, user.id, reward);
    return { reward, state: saved };
  });
