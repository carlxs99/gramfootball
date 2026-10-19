import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const PullSchema = z.object({
  from: z
    .string()
    .url()
    .max(300)
    .refine((u) => u.startsWith("https://"), "Source must use https"),
});

/**
 * POST /api/public/backup/import
 * Header: Authorization: Bearer <BACKUP_API_KEY>
 * Body: either a backup file produced by /api/public/backup/export, or
 *       { "from": "https://old-app.example" } to pull it straight from another copy
 *       (that copy is called with BACKUP_SOURCE_KEY, or BACKUP_API_KEY when unset).
 * Only runs on an empty destination, so live data can never be overwritten.
 */
export const Route = createFileRoute("/api/public/backup/import")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const backupLib = await import("@/lib/backup.server");
        const denied = await backupLib.authenticateBackupRequest(request);
        if (denied) return denied;
        try {
          const body = (await request.json().catch(() => null)) as unknown;
          let raw: unknown = body;
          const pull = PullSchema.safeParse(body);
          if (pull.success) {
            const key = process.env["BACKUP_SOURCE_KEY"] || process.env["BACKUP_API_KEY"];
            const source = new URL("/api/public/backup/export", pull.data.from);
            const res = await fetch(source, { headers: { Authorization: `Bearer ${key}` } });
            if (!res.ok) {
              return Response.json(
                { ok: false, error: `The source answered ${res.status}` },
                { status: 502 },
              );
            }
            raw = await res.json();
          }
          const backup = backupLib.parseBackup(raw);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const result = await backupLib.importBackup(supabaseAdmin, backup);
          return Response.json({ ok: true, exportedAt: backup.exportedAt, ...result });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Import failed";
          console.error("Backup import failed", message);
          return Response.json({ ok: false, error: message }, { status: 400 });
        }
      },
    },
  },
});
