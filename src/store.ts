import type { PipelineEvent } from "./lib/types";

const MAX_EVENTS = 50;

let schemaReady = false;

function assertDb(db: D1Database | undefined): asserts db is D1Database {
  if (!db) {
    throw new Error(
      "D1 binding 'DB' is missing. Add a d1_databases entry with binding=\"DB\" to wrangler.jsonc (or wrangler.toml) and restart wrangler dev.",
    );
  }
}

async function ensureSchema(db: D1Database): Promise<void> {
  if (schemaReady) return;
  await db.batch([
    db.prepare(
      "CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, timestamp TEXT NOT NULL, data TEXT NOT NULL)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events (timestamp DESC)",
    ),
  ]);
  schemaReady = true;
}

export async function addEvent(
  db: D1Database,
  event: PipelineEvent,
): Promise<void> {
  assertDb(db);
  await ensureSchema(db);
  await db
    .prepare(
      "INSERT OR REPLACE INTO events (id, timestamp, data) VALUES (?, ?, ?)",
    )
    .bind(event.id, event.timestamp, JSON.stringify(event))
    .run();
  // Trim to MAX_EVENTS newest rows
  await db
    .prepare(
      "DELETE FROM events WHERE id NOT IN (SELECT id FROM events ORDER BY timestamp DESC LIMIT ?)",
    )
    .bind(MAX_EVENTS)
    .run();
}

export async function updateEvent(
  db: D1Database,
  id: string,
  patch: Partial<PipelineEvent>,
): Promise<void> {
  assertDb(db);
  await ensureSchema(db);
  const row = await db
    .prepare("SELECT data FROM events WHERE id = ?")
    .bind(id)
    .first<{ data: string }>();
  if (!row) return;
  const merged: PipelineEvent = { ...JSON.parse(row.data), ...patch };
  await db
    .prepare("UPDATE events SET data = ? WHERE id = ?")
    .bind(JSON.stringify(merged), id)
    .run();
}

export async function getEvents(db: D1Database): Promise<PipelineEvent[]> {
  assertDb(db);
  await ensureSchema(db);
  const { results } = await db
    .prepare("SELECT data FROM events ORDER BY timestamp DESC LIMIT ?")
    .bind(MAX_EVENTS)
    .all<{ data: string }>();
  return results.map((r) => JSON.parse(r.data) as PipelineEvent);
}
