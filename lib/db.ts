import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "utahon.db");

let db: Database.Database | null = null;

type TableInfoRow = { name: string };

function ensureColumn(
  database: Database.Database,
  table: string,
  column: string,
  defSql: string,
  backfillSql?: string
) {
  const cols = database.pragma(`table_info(${table})`) as TableInfoRow[];
  if (cols.some((c) => c.name === column)) return;
  database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${defSql}`);
  if (backfillSql) database.exec(backfillSql);
}

export function getDb(): Database.Database {
  if (db) return db;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      lyrics TEXT NOT NULL,
      analyzed TEXT NOT NULL,
      lines_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_songs_created_at
      ON songs(created_at DESC);
  `);

  ensureColumn(
    db,
    "songs",
    "lines_count",
    "INTEGER NOT NULL DEFAULT 0",
    `UPDATE songs
       SET lines_count = COALESCE(json_array_length(analyzed, '$.lines'), 0)
       WHERE lines_count = 0`
  );

  return db;
}
