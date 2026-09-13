import { createFileRoute } from "@tanstack/react-router";

/** Temporary local-only helper used once to register the broadcast cron job. */
export const Route = createFileRoute("/api/public/broadcast/setup-tmp")({
  server: {
    handlers: {
      POST: async () => {
        const secret = process.env["LOVABLE_CRON_SECRET"];
        if (!secret) return new Response("No secret", { status: 500 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("schedule_daily_broadcast", {
          p_secret: secret,
          p_url: "https://monstersccj.lovable.app/api/public/broadcast/daily",
        });
        return Response.json({ data, error: error?.message ?? null });
      },
    },
  },
});
