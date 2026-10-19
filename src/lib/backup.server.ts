/**
 * Portable data backup: export every game table to one JSON document and
 * import it into a fresh copy of the app (a new server with the same schema).
 *
 * Import is refused when the destination already has players, so a backup can
 * never overwrite live balances, cards or withdrawals.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const BACKUP_FORMAT = "gram-football-backup";
export const BACKUP_VERSION = 1;

/** Tables in dependency order (parents before children) with their conflict keys. */
export const BACKUP_TABLES = [
  { name: "players", key: "telegram_id" },
  { name: "custom_tasks", key: "id" },
  { name: "custom_task_progress", key: "id" },
  { name: "player_ips", key: "telegram_id,ip" },
  { name: "ton_scan_state", key: "id" },
  { name: "ton_deposits", key: "id" },
  { name: "withdrawals", key: "id" },
  { name: "pending_payouts", key: "id" },
  { name: "pending_card_deliveries", key: "id" },
  { name: "market_listings", key: "id" },
  { name: "market_trades", key: "id" },
  { name: "referral_tournament_weeks", key: "week_key" },
  { name: "referral_tournament_results", key: "week_key,place" },
  { name: "broadcast_runs", key: "day" },
  { name: "broadcast_sends", key: "day,telegram_id" },
  { name: "channel_post_runs", key: "week_key" },
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number]["name"];

export type Backup = {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  source: string | null;
  counts: Record<string, number>;
  tables: Record<string, Record<string, unknown>[]>;
};

// The generated types are table-specific; this module walks every table generically.
type AnyClient = SupabaseClient<any, any, any>;

const PAGE = 1000;
const CHUNK = 500;

export async function exportBackup(client: AnyClient, source: string | null = null): Promise<Backup> {
  const tables: Backup["tables"] = {};
  const counts: Backup["counts"] = {};
  for (const table of BACKUP_TABLES) {
    const rows: Record<string, unknown>[] = [];
    const order = table.key.split(",");
    for (let from = 0; ; from += PAGE) {
      let query = client.from(table.name).select("*");
      for (const col of order) query = query.order(col, { ascending: true });
      const { data, error } = await query.range(from, from + PAGE - 1);
      if (error) throw new Error(`Export of ${table.name} failed: ${error.message}`);
      rows.push(...((data ?? []) as Record<string, unknown>[]));
      if (!data || data.length < PAGE) break;
    }
    tables[table.name] = rows;
    counts[table.name] = rows.length;
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    source,
    counts,
    tables,
  };
}

/** Checks the shape of an uploaded backup. Returns the parsed backup or throws a readable error. */
export function parseBackup(raw: unknown): Backup {
  const value = typeof raw === "string" ? safeJson(raw) : raw;
  if (!value || typeof value !== "object") throw new Error("The file is not a valid backup");
  const b = value as Partial<Backup>;
  if (b.format !== BACKUP_FORMAT) throw new Error("The file is not a GRAM Football backup");
  if (typeof b.version !== "number" || b.version > BACKUP_VERSION) {
    throw new Error("This backup was made by a newer version of the app");
  }
  if (!b.tables || typeof b.tables !== "object") throw new Error("The backup has no tables");
  const known = new Set<string>(BACKUP_TABLES.map((t) => t.name));
  for (const [name, rows] of Object.entries(b.tables)) {
    if (!known.has(name)) throw new Error(`Unknown table in backup: ${name}`);
    if (!Array.isArray(rows)) throw new Error(`Table ${name} is not a list of rows`);
    for (const row of rows) {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        throw new Error(`Table ${name} contains an invalid row`);
      }
    }
  }
  return b as Backup;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("The file is not valid JSON");
  }
}

/** True when the destination has no players yet (a fresh install). */
export async function destinationIsEmpty(client: AnyClient): Promise<boolean> {
  const { count, error } = await client
    .from("players")
    .select("telegram_id", { count: "exact", head: true });
  if (error) throw new Error(`Could not check the destination: ${error.message}`);
  return (count ?? 0) === 0;
}

export async function importBackup(
  client: AnyClient,
  backup: Backup,
): Promise<{ imported: Record<string, number> }> {
  if (!(await destinationIsEmpty(client))) {
    throw new Error(
      "Import refused: this server already has players. Imports only run on a fresh, empty copy.",
    );
  }
  const imported: Record<string, number> = {};
  for (const table of BACKUP_TABLES) {
    const rows = backup.tables[table.name] ?? [];
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error } = await client
        .from(table.name)
        .upsert(chunk, { onConflict: table.key, ignoreDuplicates: false });
      if (error) {
        throw new Error(
          `Import stopped at ${table.name} (rows ${i + 1}-${i + chunk.length}): ${error.message}`,
        );
      }
    }
    imported[table.name] = rows.length;
  }
  return { imported };
}

/** Constant-time check of the `Authorization: Bearer <BACKUP_API_KEY>` header. */
export async function authenticateBackupRequest(request: Request): Promise<Response | null> {
  const secret = process.env["BACKUP_API_KEY"];
  if (!secret || secret.length < 24) {
    return Response.json({ ok: false, error: "Backup API is not configured" }, { status: 503 });
  }
  const match = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "");
  if (!match) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { createHash, timingSafeEqual } = await import("node:crypto");
  const digest = (v: string) => createHash("sha256").update(v, "utf8").digest();
  if (!timingSafeEqual(digest(match[1]!), digest(secret))) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
