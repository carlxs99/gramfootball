import { createFileRoute } from "@tanstack/react-router";

/** Telegram bot webhook: commands + Mini App launch button. */

const APP_URL = "https://gramfootball.lovable.app";

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
        // Fail closed: without the shared secret anybody could forge updates
        // and impersonate any Telegram user.
        const { timingSafeEqualStr } = await import("@/lib/telegram.server");
        if (!secret || !timingSafeEqualStr(request.headers.get("x-telegram-bot-api-secret-token") ?? "", secret)) {
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
          inline_keyboard: [[{ text: "⚽ Play GRAM Football", web_app: { url: APP_URL } }]],
        };

        const send = (payload: Record<string, unknown>) =>
          fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, parse_mode: "HTML", ...payload }),
          });

        if (command === "/start") {
          const name = message.from?.first_name ? `, ${message.from.first_name}` : "";
          await send({
            text:
              `🏟️ <b>WELCOME TO GRAM FOOTBALL${name.toUpperCase()}!</b>\n\n` +
              "Your journey to football greatness starts now. Build your dream squad, collect exclusive players and turn every signing into daily GRAM.\n\n" +
              "⚽ <b>Sign elite players and legendary coaches</b>\n" +
              "🎴 Open packs and discover 205 unique cards\n" +
              "💰 Earn GRAM every day with your collection\n" +
              "🤝 Trade cards in the transfer market\n" +
              "🏆 Rise through the global rankings\n" +
              "🎁 Invite friends and earn across 3 referral levels\n\n" +
              "🔥 <b>Your first signing is waiting.</b> Step onto the pitch now!",
            reply_markup: playButton,
          });

        } else if (command === "/invite") {
          const code = codeFor(userId);
          const botName = (process.env["TELEGRAM_BOT_USERNAME"] ?? "Gramfotballbot").replace(
            "@",
            "",
          );
          const appName = (process.env["TELEGRAM_APP_NAME"] ?? "app").replace("/", "");
          const link = `https://t.me/${botName}/${appName}?startapp=${code}`;
          await send({
            text:
              `<b>Your invite link</b>\n<code>${link}</code>\n\n` +
              "You earn 10% of level 1 friends, 5% of level 2 and 1% of level 3 on every purchase they make.",
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
            text: "/start — open the game\n/stats — your collection\n/invite — your referral link\n/help — this message",
            reply_markup: playButton,
          });
        } else {
          await send({ text: "Tap below to open GRAM Football.", reply_markup: playButton });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
