import { createFileRoute } from "@tanstack/react-router";

/** Local-only maintenance endpoint used to register the Telegram webhook. */
export const Route = createFileRoute("/api/public/telegram/setup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const host = request.headers.get("host") ?? "";
        if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) {
          return new Response("Not found", { status: 404 });
        }
        const { setupTelegramBot } = await import("@/lib/telegram-setup.server");
        const result = await setupTelegramBot();
        return Response.json(result);
      },
    },
  },
});
