import { createFileRoute } from "@tanstack/react-router";

/**
 * One-off welcome post for the @gramfootballnews channel. The first call
 * claims a row in channel_post_runs; every later call is a no-op, so this
 * can never spam the channel even if invoked repeatedly.
 */

const CHANNEL = "@gramfootballnews";
const RUN_KEY = "manual-welcome-2026-09";
const APP_URL = "https://t.me/Gramfotballbot/app";

const CAPTION =
  "🏟️ <b>HOW GRAM FOOTBALL WORKS</b>\n\n" +
  "1️⃣ <b>Open packs</b> — sign from 205 players and 35 coaches\n" +
  "2️⃣ <b>Earn daily</b> — your squad produces GRAM every 24 hours\n" +
  "3️⃣ <b>Trade</b> — buy and sell cards in the transfer market\n" +
  "4️⃣ <b>Cash out</b> — deposit and withdraw TON straight from your wallet\n" +
  "5️⃣ <b>Invite friends</b> — earn 10% / 5% / 1% across 3 referral levels\n\n" +
  "⚽ Tap <b>Play</b> and make your first signing today!";

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export const Route = createFileRoute("/api/public/news/welcome")({
  server: {
    handlers: {
      POST: async () => {
        const token = process.env["TELEGRAM_BOT_TOKEN"];
        if (!token) return new Response("Not configured", { status: 500 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Claim the one-off run; the primary key makes repeats a no-op.
        const { data: claimed, error: claimError } = await supabaseAdmin
          .from("channel_post_runs")
          .insert({ week_key: RUN_KEY, post_index: -1 })
          .select("week_key")
          .maybeSingle();

        if (claimError || !claimed) {
          return Response.json({ ok: true, skipped: "already sent" });
        }

        const { NEWS_IMAGE_B64 } = await import("@/lib/news-image.b64");

        const form = new FormData();
        form.append("chat_id", CHANNEL);
        form.append("caption", CAPTION);
        form.append("parse_mode", "HTML");
        form.append(
          "photo",
          new Blob([b64ToBytes(NEWS_IMAGE_B64).buffer as ArrayBuffer], { type: "image/jpeg" }),
          "how-it-works.jpg",
        );
        form.append(
          "reply_markup",
          JSON.stringify({
            inline_keyboard: [
              [{ text: "⚽ Play GRAM Football", url: APP_URL }],
              [
                {
                  text: "🤝 Invite & Earn",
                  url: `https://t.me/share/url?url=${encodeURIComponent(APP_URL)}&text=${encodeURIComponent(
                    "Build your dream squad and earn GRAM daily — join GRAM Football!",
                  )}`,
                },
              ],
            ],
          }),
        );

        try {
          const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: "POST",
            body: form,
          });
          const json = (await res.json()) as {
            ok: boolean;
            description?: string;
            result?: { message_id?: number };
          };

          if (!json.ok) {
            await supabaseAdmin.from("channel_post_runs").delete().eq("week_key", RUN_KEY);
            console.error("welcome channel post failed", json.description);
            return Response.json({ ok: false, error: json.description }, { status: 502 });
          }

          await supabaseAdmin
            .from("channel_post_runs")
            .update({ message_id: json.result?.message_id ?? null })
            .eq("week_key", RUN_KEY);

          return Response.json({ ok: true, message_id: json.result?.message_id });
        } catch (error) {
          await supabaseAdmin.from("channel_post_runs").delete().eq("week_key", RUN_KEY);
          console.error("welcome channel post error", error);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
