import { createFileRoute } from "@tanstack/react-router";

/** Telegram bot webhook: commands + Mini App launch button. */

const APP_URL = "https://project--e2fc5d41-efed-457b-8a8a-3840e26bbe3e-dev.lovable.app";

type Update = {
  update_id: number;
  message?: {
    chat: { id: number };
    from?: { id: number; first_name?: string; username?: string };
    text?: string;
  };
};

function codeFor(id: number) {
  return "GR" + String(id % 1000000).padStart(6, "0");
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env["TELEGRAM_BOT_TOKEN"];
        const secret = process.env["TELEGRAM_WEBHOOK_SECRET"];
        if (!token) return new Response("Not configured", { status: 500 });
        if (secret && request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const update = (await request.json()) as Update;
        const message = update.message;
        if (!message?.chat?.id) return Response.json({ ok: true });

        const chatId = message.chat.id;
        const userId = message.from?.id ?? chatId;
        const text = (message.text ?? "").trim();
        const command = text.split(/\s+/)[0]?.toLowerCase().replace(/@.*$/, "") ?? "";
        const playButton = {
          inline_keyboard: [[{ text: "🎴 Play Monsters CCJ", web_app: { url: APP_URL } }]],
        };

        const send = (payload: Record<string, unknown>) =>
          fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, parse_mode: "HTML", ...payload }),
          });

        if (command === "/start") {
          await send({
            text:
              "<b>Monsters CCJ</b>\ncollect them all.\n\n" +
              "Open packs, grow your album and earn GRAM every day.\n" +
              "Tap the button below to start playing.",
            reply_markup: playButton,
          });
        } else if (command === "/invite") {
          const code = codeFor(userId);
          const link = `https://t.me/${(process.env["TELEGRAM_BOT_USERNAME"] ?? "").replace("@", "")}?start=${code}`;
          await send({
            text:
              `<b>Your invite code:</b> <code>${code}</code>\n\n` +
              "You earn 10% of level 1 friends, 5% of level 2 and 1% of level 3 on every purchase they make.\n" +
              (process.env["TELEGRAM_BOT_USERNAME"] ? `\n${link}` : ""),
            reply_markup: playButton,
          });
        } else if (command === "/stats") {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await supabaseAdmin
            .from("players")
            .select("state")
            .eq("telegram_id", userId)
            .maybeSingle();
          const st = (data?.state ?? {}) as { gram?: number; packsOpened?: number; owned?: object };
          await send({
            text:
              "<b>Your collection</b>\n" +
              `GRAM: ${Number(st.gram ?? 0).toFixed(2)}\n` +
              `Cards: ${Object.keys(st.owned ?? {}).length}\n` +
              `Packs opened: ${st.packsOpened ?? 0}`,
            reply_markup: playButton,
          });
        } else if (command === "/help") {
          await send({
            text: "/start — open the game\n/stats — your collection\n/invite — your referral code\n/help — this message",
            reply_markup: playButton,
          });
        } else {
          await send({ text: "Tap below to open Monsters CCJ.", reply_markup: playButton });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
