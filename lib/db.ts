import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "utahon.db");

let db: Database.Database | null = null;

type TableInfoRow = { name: string };

const SAFE_IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function ensureColumn(
  database: Database.Database,
  table: string,
  column: string,
  defSql: string,
  backfillSql?: string
) {
  if (!SAFE_IDENT.test(table) || !SAFE_IDENT.test(column)) {
    throw new Error(`unsafe identifier: ${table}.${column}`);
  }
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

    CREATE TABLE IF NOT EXISTS vocabulary (
      id TEXT PRIMARY KEY,
      surface TEXT NOT NULL,
      furigana TEXT NOT NULL DEFAULT '',
      romaji TEXT NOT NULL DEFAULT '',
      meaning TEXT NOT NULL DEFAULT '',
      pos TEXT NOT NULL DEFAULT '',
      source_song_id TEXT NOT NULL DEFAULT '',
      source_song_title TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      UNIQUE(surface, source_song_id)
    );

    CREATE INDEX IF NOT EXISTS idx_vocab_created_at
      ON vocabulary(created_at DESC);
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

  ensureColumn(
    db,
    "songs",
    "youtube_url",
    "TEXT NOT NULL DEFAULT ''"
  );

  ensureColumn(
    db,
    "songs",
    "youtube_id",
    "TEXT NOT NULL DEFAULT ''"
  );

  ensureColumn(
    db,
    "songs",
    "lrclib_id",
    "INTEGER NOT NULL DEFAULT 0"
  );

  ensureColumn(
    db,
    "songs",
    "original_artist",
    "TEXT NOT NULL DEFAULT ''",
    `UPDATE songs
       SET original_artist = artist
       WHERE original_artist = '' AND artist != '未知'`
  );

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_songs_lrclib_id
      ON songs(lrclib_id) WHERE lrclib_id > 0;
  `);

  return db;
}
