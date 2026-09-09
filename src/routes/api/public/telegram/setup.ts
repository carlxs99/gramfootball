import { createFileRoute } from "@tanstack/react-router";

/** Maintenance endpoint used once to register the Telegram webhook. */
export const Route = createFileRoute("/api/public/telegram/setup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // The Host header is client-controlled, so the only gate is the shared
        // secret. Without it configured the endpoint stays closed.
        const secret = process.env["TELEGRAM_WEBHOOK_SECRET"];
        if (!secret || request.headers.get("x-setup-secret") !== secret) {
          return new Response("Not found", { status: 404 });
        }
        const { setupTelegramBot } = await import("@/lib/telegram-setup.server");
        const result = await setupTelegramBot();
        return Response.json(result);
      },
    },
  },
});
