import { createFileRoute } from "@tanstack/react-router";
import { announcePayout, PAYOUTS_CHANNEL } from "@/lib/telegram.server";

/** One-off test announcement for the payouts channel. */
export const Route = createFileRoute("/api/public/payouts/test")({
  server: {
    handlers: {
      POST: async () => {
        await announcePayout({ name: "Test Player", amount: 12.3456, hash: "test-transaction-hash" });
        return Response.json({ ok: true, channel: PAYOUTS_CHANNEL });
      },
    },
  },
});
