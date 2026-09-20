import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/**
 * Daily reminder broadcast. Called hourly by pg_cron; it only starts one run
 * per UTC day and sends a bounded batch per invocation so a large player base
 * is drained across several runs without hitting Telegram rate limits.
 */

const BATCH = 150;
const CHUNK = 20;
const CHUNK_PAUSE_MS = 1100;
const LOCK_MS = 3 * 60 * 1000;

const APP_URL = "https://t.me/Gramfotballbot/app";

const TEXT =
  "\u23f1 <b>Your GRAM Football vault is filling</b>\n\n" +
  "Your player and coach cards have kept producing while you were away.\n" +
  "Open the app and claim before the 24-hour vault reaches its limit.\n" +
  "Then check your tasks, packs and the Market for your next signing.\n\n" +
  "Tap below to open your club.";

export const Route = createFileRoute("/api/public/broadcast/daily")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;

        const token = process.env["TELEGRAM_BOT_TOKEN"];
        if (!token) return new Response("Not configured", { status: 500 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const day = new Date().toISOString().slice(0, 10);
        const nowIso = new Date().toISOString();
        const lockIso = new Date(Date.now() + LOCK_MS).toISOString();

        // Create today's run (idempotent) then take the single-flight lease.
        await supabaseAdmin.from("broadcast_runs").insert({ day }).select().maybeSingle();

        const { data: run } = await supabaseAdmin
          .from("broadcast_runs")
          .select("day, done, sent_count")
          .eq("day", day)
          .maybeSingle();
        if (!run || run.done) return Response.json({ ok: true, skipped: "done" });

        const { data: leased } = await supabaseAdmin
          .from("broadcast_runs")
          .update({ lock_until: lockIso })
          .eq("day", day)
          .or(`lock_until.is.null,lock_until.lt.${nowIso}`)
          .select("day")
          .maybeSingle();
        if (!leased) return Response.json({ ok: true, skipped: "locked" });

        const { data: sentRows } = await supabaseAdmin
          .from("broadcast_sends")
          .select("telegram_id")
          .eq("day", day);
        const already = new Set((sentRows ?? []).map((r) => Number(r.telegram_id)));

        const { data: players } = await supabaseAdmin
          .from("players")
          .select("telegram_id")
          .eq("banned", false)
          .order("telegram_id", { ascending: true });

        const targets = (players ?? [])
          .map((p) => Number(p.telegram_id))
          .filter((id) => id > 0 && !already.has(id))
          .slice(0, BATCH);

        if (targets.length === 0) {
          await supabaseAdmin
            .from("broadcast_runs")
            .update({ done: true, lock_until: null })
            .eq("day", day);
          return Response.json({ ok: true, sent: 0, finished: true });
        }

        const reply_markup = {
          inline_keyboard: [[{ text: "Open GRAM Football", url: APP_URL }]],
        };

        let sent = 0;
        for (let i = 0; i < targets.length; i += CHUNK) {
          const chunk = targets.slice(i, i + CHUNK);
          await Promise.all(
            chunk.map(async (chatId) => {
              try {
                const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chat_id: chatId,
                    text: TEXT,
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                    reply_markup,
                  }),
                });
                const body = (await res.json()) as { ok: boolean; description?: string };
                // Blocked / deleted chats are permanent: mark them so we skip
                // them for the rest of the day instead of retrying forever.
                const permanent =
                  body.ok || /blocked|deactivated|chat not found|can't initiate/i.test(
                    body.description ?? "",
                  );
                if (permanent) {
                  await supabaseAdmin
                    .from("broadcast_sends")
                    .upsert({ day, telegram_id: chatId }, { onConflict: "day,telegram_id" });
                  if (body.ok) sent += 1;
                }
              } catch (error) {
                console.error("broadcast send failed", chatId, error);
              }
            }),
          );
          if (i + CHUNK < targets.length)
            await new Promise((r) => setTimeout(r, CHUNK_PAUSE_MS));
        }

        await supabaseAdmin
          .from("broadcast_runs")
          .update({ sent_count: (run.sent_count ?? 0) + sent, lock_until: null })
          .eq("day", day);

        return Response.json({ ok: true, sent, batch: targets.length });
      },
    },
  },
});
