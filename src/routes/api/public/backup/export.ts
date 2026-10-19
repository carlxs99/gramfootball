import { createFileRoute } from "@tanstack/react-router";

/**
 * GET /api/public/backup/export
 * Header: Authorization: Bearer <BACKUP_API_KEY>
 * Returns the full game data as one JSON backup file.
 */
export const Route = createFileRoute("/api/public/backup/export")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { authenticateBackupRequest, exportBackup } = await import("@/lib/backup.server");
        const denied = await authenticateBackupRequest(request);
        if (denied) return denied;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const backup = await exportBackup(supabaseAdmin, new URL(request.url).origin);
          const day = backup.exportedAt.slice(0, 10);
          return new Response(JSON.stringify(backup), {
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Content-Disposition": `attachment; filename="gram-football-backup-${day}.json"`,
              "Cache-Control": "no-store",
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Export failed";
          console.error("Backup export failed", message);
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
