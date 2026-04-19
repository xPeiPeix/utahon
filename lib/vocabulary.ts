import { randomUUID } from "crypto";
import { getDb } from "./db";

export type VocabEntry = {
  id: string;
  surface: string;
  furigana: string;
  romaji: string;
  meaning: string;
  pos: string;
  sourceSongId: string;
  sourceSongTitle: string;
  createdAt: number;
};

type VocabRow = {
  id: string;
  surface: string;
  furigana: string;
  romaji: string;
  meaning: string;
  pos: string;
  source_song_id: string;
  source_song_title: string;
  created_at: number;
};

function rowToEntry(r: VocabRow): VocabEntry {
  return {
    id: r.id,
    surface: r.surface,
    furigana: r.furigana,
    romaji: r.romaji,
    meaning: r.meaning,
    pos: r.pos,
    sourceSongId: r.source_song_id,
    sourceSongTitle: r.source_song_title,
    createdAt: r.created_at,
  };
}

export type AddVocabInput = {
  surface: string;
  furigana?: string;
  romaji?: string;
  meaning?: string;
  pos?: string;
  sourceSongId?: string | null;
  sourceSongTitle?: string;
};

export type AddVocabResult =
  | { kind: "added"; entry: VocabEntry }
  | { kind: "duplicate"; entry: VocabEntry };

export function addVocab(input: AddVocabInput): AddVocabResult {
  const surface = input.surface.trim();
  if (!surface) throw new Error("surface 不能为空");

  const sourceSongId = input.sourceSongId?.trim() ?? "";
  const id = randomUUID();
  const now = Date.now();
  const furigana = input.furigana?.trim() ?? "";
  const romaji = input.romaji?.trim() ?? "";
  const meaning = input.meaning?.trim() ?? "";
  const pos = input.pos?.trim() ?? "";
  const sourceSongTitle = input.sourceSongTitle?.trim() ?? "";

  const result = getDb()
    .prepare(
      `INSERT OR IGNORE INTO vocabulary
         (id, surface, furigana, romaji, meaning, pos,
          source_song_id, source_song_title, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      surface,
      furigana,
      romaji,
      meaning,
      pos,
      sourceSongId,
      sourceSongTitle,
      now
    );

  if (result.changes === 0) {
    const existing = getDb()
      .prepare(
        `SELECT id, surface, furigana, romaji, meaning, pos,
                source_song_id, source_song_title, created_at
         FROM vocabulary
         WHERE surface = ? AND source_song_id = ?`
      )
      .get(surface, sourceSongId) as VocabRow;
    return { kind: "duplicate", entry: rowToEntry(existing) };
  }

  return {
    kind: "added",
    entry: {
      id,
      surface,
      furigana,
      romaji,
      meaning,
      pos,
      sourceSongId,
      sourceSongTitle,
      createdAt: now,
    },
  };
}

export function listVocab(): VocabEntry[] {
  const rows = getDb()
    .prepare(
      `SELECT id, surface, furigana, romaji, meaning, pos,
              source_song_id, source_song_title, created_at
       FROM vocabulary
       ORDER BY created_at DESC`
    )
    .all() as VocabRow[];
  return rows.map(rowToEntry);
}

export function deleteVocab(id: string): boolean {
  const result = getDb().prepare(`DELETE FROM vocabulary WHERE id = ?`).run(id);
  return result.changes > 0;
}
