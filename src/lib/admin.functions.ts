import { createServerFn } from "@tanstack/react-start";

/** Admin panel back end. Only the hard-coded admin Telegram ID may call these. */

export const ADMIN_TELEGRAM_ID = 6334940213;

type Input = { initData: string };

function requireInitData<T extends Input>(input: T) {
  if (!input || typeof input.initData !== "string" || input.initData.length < 10) {
    throw new Error("Missing Telegram session");
  }
  return input;
}

async function adminCtx(initData: string) {
  const { verifyInitData } = await import("./telegram.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const user = await verifyInitData(initData);
  if (user.id !== ADMIN_TELEGRAM_ID) throw new Error("Not authorised");
  return { user, supabaseAdmin };
}

export const adminCheck = createServerFn({ method: "POST" })
  .inputValidator((input: Input) => requireInitData(input))
  .handler(async ({ data }) => {
    const { verifyInitData } = await import("./telegram.server");
    const user = await verifyInitData(data.initData);
    return { isAdmin: user.id === ADMIN_TELEGRAM_ID };
  });

export type AdminOverview = {
  players: number;
  newToday: number;
  banned: number;
  gramCirculating: number;
  packsOpened: number;
  deposits: { count: number; total: number };
  withdrawals: { count: number; total: number; pending: number };
  activeTasks: number;
};

export const adminOverview = createServerFn({ method: "POST" })
  .inputValidator((input: Input) => requireInitData(input))
  .handler(async ({ data }): Promise<AdminOverview> => {
    const { supabaseAdmin } = await adminCtx(data.initData);
    const since = new Date(Date.now() - 86400000).toISOString();

    const [players, newToday, banned, tasks, deposits, withdrawals, states] = await Promise.all([
      supabaseAdmin.from("players").select("telegram_id", { count: "exact", head: true }),
      supabaseAdmin.from("players").select("telegram_id", { count: "exact", head: true }).gte("created_at", since),
      supabaseAdmin.from("players").select("telegram_id", { count: "exact", head: true }).eq("banned", true),
      supabaseAdmin.from("custom_tasks").select("id", { count: "exact", head: true }).eq("active", true),
      supabaseAdmin.from("ton_deposits").select("amount"),
      supabaseAdmin.from("withdrawals").select("amount, status"),
      supabaseAdmin.from("players").select("state"),
    ]);

    let gram = 0;
    let packs = 0;
    for (const row of states.data ?? []) {
      const s = (row.state ?? {}) as { gram?: number; packsOpened?: number };
      gram += Number(s.gram ?? 0) || 0;
      packs += Number(s.packsOpened ?? 0) || 0;
    }

    const dep = deposits.data ?? [];
    const wds = withdrawals.data ?? [];

    return {
      players: players.count ?? 0,
      newToday: newToday.count ?? 0,
      banned: banned.count ?? 0,
      gramCirculating: Math.round(gram * 100) / 100,
      packsOpened: packs,
      deposits: {
        count: dep.length,
        total: Math.round(dep.reduce((a: number, d: any) => a + Number(d.amount || 0), 0) * 100) / 100,
      },
      withdrawals: {
        count: wds.length,
        total: Math.round(wds.reduce((a: number, w: any) => a + Number(w.amount || 0), 0) * 100) / 100,
        pending: wds.filter((w: any) => w.status !== "sent").length,
      },
      activeTasks: tasks.count ?? 0,
    };
  });

export type AdminPlayer = {
  telegramId: number;
  username: string | null;
  firstName: string | null;
  gram: number;
  packsOpened: number;
  cards: number;
  referredBy: number | null;
  banned: boolean;
  createdAt: string;
};

export const adminPlayers = createServerFn({ method: "POST" })
  .inputValidator((input: Input & { search?: string }) => requireInitData(input))
  .handler(async ({ data }): Promise<AdminPlayer[]> => {
    const { supabaseAdmin } = await adminCtx(data.initData);
    let query = supabaseAdmin
      .from("players")
      .select("telegram_id, username, first_name, state, referred_by, banned, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    const search = (data.search ?? "").trim();
    if (search) {
      const numeric = Number(search);
      query = Number.isFinite(numeric) && search.match(/^\d+$/)
        ? query.eq("telegram_id", numeric)
        : query.ilike("username", `%${search.replace("@", "")}%`);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    return (rows ?? []).map((r: any) => {
      const s = (r.state ?? {}) as { gram?: number; packsOpened?: number; owned?: object };
      return {
        telegramId: Number(r.telegram_id),
        username: r.username ?? null,
        firstName: r.first_name ?? null,
        gram: Math.round((Number(s.gram ?? 0) || 0) * 100) / 100,
        packsOpened: Number(s.packsOpened ?? 0) || 0,
        cards: Object.keys(s.owned ?? {}).length,
        referredBy: r.referred_by ?? null,
        banned: Boolean(r.banned),
        createdAt: r.created_at as string,
      };
    });
  });

export const adminAdjustGram = createServerFn({ method: "POST" })
  .inputValidator((input: Input & { telegramId: number; amount: number; note?: string }) => {
    requireInitData(input);
    if (!Number.isFinite(input.telegramId) || !Number.isFinite(input.amount)) throw new Error("Invalid input");
    if (Math.abs(input.amount) > 100000) throw new Error("Amount out of range");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await adminCtx(data.initData);
    const { loadState, persistState } = await import("./referrals.server");
    const state = await loadState(supabaseAdmin, data.telegramId);
    const saved = await persistState(supabaseAdmin, data.telegramId, state, data.amount);

    const { notifyUser } = await import("./telegram.server");
    await notifyUser(
      data.telegramId,
      data.amount >= 0
        ? `🎉 <b>Balance credited</b>\n+${data.amount.toFixed(2)} GRAM\nNew balance: <b>${saved.gram.toFixed(2)} GRAM</b>`
        : `ℹ️ <b>Balance adjusted</b>\n${data.amount.toFixed(2)} GRAM\nNew balance: <b>${saved.gram.toFixed(2)} GRAM</b>`,
    );
    return { gram: saved.gram };
  });

export const adminSetBanned = createServerFn({ method: "POST" })
  .inputValidator((input: Input & { telegramId: number; banned: boolean }) => {
    requireInitData(input);
    if (!Number.isFinite(input.telegramId)) throw new Error("Invalid player");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await adminCtx(data.initData);
    const { error } = await supabaseAdmin
      .from("players")
      .update({ banned: data.banned, ban_reason: data.banned ? "admin" : null })
      .eq("telegram_id", data.telegramId);
    if (error) throw new Error(error.message);
    return { banned: data.banned };
  });

export type AdminTask = {
  id: string;
  kind: "channel" | "group" | "bot";
  title: string;
  description: string;
  url: string;
  chatRef: string | null;
  reward: number;
  waitSeconds: number;
  active: boolean;
  sortOrder: number;
  completions: number;
};

export const adminTasks = createServerFn({ method: "POST" })
  .inputValidator((input: Input) => requireInitData(input))
  .handler(async ({ data }): Promise<AdminTask[]> => {
    const { supabaseAdmin } = await adminCtx(data.initData);
    const { data: rows } = await supabaseAdmin
      .from("custom_tasks")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    const { data: done } = await supabaseAdmin
      .from("custom_task_progress")
      .select("task_id")
      .not("claimed_at", "is", null);

    const counts = new Map<string, number>();
    for (const row of done ?? []) {
      const id = row.task_id as string;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }

    return (rows ?? []).map((r: any) => ({
      id: r.id as string,
      kind: r.kind as AdminTask["kind"],
      title: r.title as string,
      description: (r.description as string) ?? "",
      url: r.url as string,
      chatRef: (r.chat_ref as string | null) ?? null,
      reward: Number(r.reward),
      waitSeconds: Number(r.wait_seconds),
      active: Boolean(r.active),
      sortOrder: Number(r.sort_order),
      completions: counts.get(r.id as string) ?? 0,
    }));
  });

export const adminSaveTask = createServerFn({ method: "POST" })
  .inputValidator(
    (input: Input & {
      id?: string | null;
      kind: "channel" | "group" | "bot";
      title: string;
      description?: string;
      url: string;
      chatRef?: string | null;
      reward: number;
      waitSeconds?: number;
      active?: boolean;
      sortOrder?: number;
    }) => {
      requireInitData(input);
      if (!["channel", "group", "bot"].includes(input.kind)) throw new Error("Invalid task type");
      if (!input.title?.trim()) throw new Error("Title is required");
      if (!/^https?:\/\//i.test(input.url ?? "")) throw new Error("Link must start with https://");
      if (!Number.isFinite(input.reward) || input.reward < 0 || input.reward > 1000) {
        throw new Error("Invalid reward");
      }
      if (input.kind !== "bot" && !input.chatRef?.trim()) {
        throw new Error("Channel/group tasks need the @username or chat ID");
      }
      return input;
    },
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await adminCtx(data.initData);
    const row = {
      kind: data.kind,
      title: data.title.trim().slice(0, 120),
      description: (data.description ?? "").trim().slice(0, 300),
      url: data.url.trim(),
      chat_ref: data.kind === "bot" ? null : (data.chatRef ?? "").trim(),
      reward: Math.round(data.reward * 10000) / 10000,
      wait_seconds: Math.max(0, Math.min(600, Math.round(data.waitSeconds ?? 15))),
      active: data.active ?? true,
      sort_order: Math.round(data.sortOrder ?? 0),
    };

    if (data.id) {
      const { error } = await supabaseAdmin.from("custom_tasks").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: created, error } = await supabaseAdmin
      .from("custom_tasks")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id as string };
  });

export const adminDeleteTask = createServerFn({ method: "POST" })
  .inputValidator((input: Input & { id: string }) => {
    requireInitData(input);
    if (!input.id) throw new Error("Unknown task");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await adminCtx(data.initData);
    const { error } = await supabaseAdmin.from("custom_tasks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export type AdminMovement = {
  id: string;
  telegramId: number;
  amount: number;
  net?: number;
  status?: string;
  hash: string | null;
  at: string;
};

export const adminMovements = createServerFn({ method: "POST" })
  .inputValidator((input: Input) => requireInitData(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await adminCtx(data.initData);
    const [{ data: deposits }, { data: withdrawals }] = await Promise.all([
      supabaseAdmin
        .from("ton_deposits")
        .select("id, telegram_id, amount, tx_hash, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("withdrawals")
        .select("id, telegram_id, amount, net, status, tx_hash, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    return {
      deposits: (deposits ?? []).map((d: any) => ({
        id: d.id as string,
        telegramId: Number(d.telegram_id),
        amount: Number(d.amount),
        hash: (d.tx_hash as string | null) ?? null,
        at: d.created_at as string,
      })) as AdminMovement[],
      withdrawals: (withdrawals ?? []).map((w: any) => ({
        id: w.id as string,
        telegramId: Number(w.telegram_id),
        amount: Number(w.amount),
        net: Number(w.net),
        status: w.status as string,
        hash: (w.tx_hash as string | null) ?? null,
        at: w.created_at as string,
      })) as AdminMovement[],
    };
  });

export const adminBroadcast = createServerFn({ method: "POST" })
  .inputValidator((input: Input & { text: string }) => {
    requireInitData(input);
    if (!input.text?.trim()) throw new Error("Message is empty");
    if (input.text.length > 3500) throw new Error("Message is too long");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await adminCtx(data.initData);
    const { notifyUser } = await import("./telegram.server");

    const { data: rows } = await supabaseAdmin
      .from("players")
      .select("telegram_id")
      .eq("banned", false)
      .limit(5000);

    let sent = 0;
    for (const row of rows ?? []) {
      await notifyUser(Number(row.telegram_id), data.text);
      sent += 1;
      // Telegram allows ~30 messages/second for broadcasts.
      if (sent % 25 === 0) await new Promise((r) => setTimeout(r, 1000));
    }
    return { sent };
  });

export type AdminIpGroup = {
  ip: string;
  accounts: Array<{
    telegramId: number;
    username: string | null;
    firstName: string | null;
    banned: boolean;
    lastSeen: string;
  }>;
};

/** Groups of accounts sharing the same network address (multi-account watch). */
export const adminMultiAccounts = createServerFn({ method: "POST" })
  .inputValidator((input: Input) => requireInitData(input))
  .handler(async ({ data }): Promise<AdminIpGroup[]> => {
    const { supabaseAdmin } = await adminCtx(data.initData);

    const { data: rows } = await supabaseAdmin
      .from("player_ips")
      .select("ip, telegram_id, last_seen")
      .order("last_seen", { ascending: false })
      .limit(3000);

    const byIp = new Map<string, Array<{ telegramId: number; lastSeen: string }>>();
    for (const row of rows ?? []) {
      const ip = row.ip as string;
      const list = byIp.get(ip) ?? [];
      if (!list.some((x) => x.telegramId === Number(row.telegram_id))) {
        list.push({ telegramId: Number(row.telegram_id), lastSeen: row.last_seen as string });
      }
      byIp.set(ip, list);
    }

    const shared = [...byIp.entries()].filter(([, list]) => list.length > 1);
    const ids = [...new Set(shared.flatMap(([, list]) => list.map((x) => x.telegramId)))];
    if (!ids.length) return [];

    const { data: players } = await supabaseAdmin
      .from("players")
      .select("telegram_id, username, first_name, banned")
      .in("telegram_id", ids);

    const info = new Map<number, any>();
    for (const p of players ?? []) info.set(Number(p.telegram_id), p);

    return shared
      .map(([ip, list]) => ({
        ip,
        accounts: list.map((x) => {
          const p = info.get(x.telegramId);
          return {
            telegramId: x.telegramId,
            username: (p?.username as string | null) ?? null,
            firstName: (p?.first_name as string | null) ?? null,
            banned: Boolean(p?.banned),
            lastSeen: x.lastSeen,
          };
        }),
      }))
      .sort((a, b) => b.accounts.length - a.accounts.length)
      .slice(0, 100);
  });
