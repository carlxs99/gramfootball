import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/wallet/scan-deposits")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;

        try {
          const [{ supabaseAdmin }, { scanDeposits }] = await Promise.all([
            import("@/integrations/supabase/client.server"),
            import("@/lib/wallet.functions"),
          ]);
          await scanDeposits(supabaseAdmin);
          return Response.json({ ok: true });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Deposit scan failed";
          console.error("Automatic deposit scan failed", message);
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});