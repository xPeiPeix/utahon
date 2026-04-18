import { randomUUID } from "crypto";
import { getDb } from "./db";
import type { AnalyzedSong, SongMeta, SongFull } from "@/types/lyrics";

type SongListRow = {
  id: string;
  title: string;
  artist: string;
  lines_count: number;
  created_at: number;
};

type SongDetailRow = SongListRow & {
  lyrics: string;
  analyzed: string;
};

function parseAnalyzed(raw: string, id: string): AnalyzedSong | null {
  try {
    return JSON.parse(raw) as AnalyzedSong;
  } catch (e) {
    console.error(`[utahon] corrupt analyzed JSON for song id=${id}:`, e);
    return null;
  }
}

export function createSong(data: {
  title: string;
  artist: string;
  lyrics: string;
  analyzed: AnalyzedSong;
}): string {
  const id = randomUUID();
  const now = Date.now();
  const title = data.title?.trim() || "未命名";
  const artist = data.artist?.trim() || "未知";
  const linesCount = data.analyzed.lines.length;

  getDb()
    .prepare(
      `INSERT INTO songs (id, title, artist, lyrics, analyzed, lines_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      title,
      artist,
      data.lyrics,
      JSON.stringify(data.analyzed),
      linesCount,
      now,
      now
    );
  return id;
}

export function listSongs(): SongMeta[] {
  const rows = getDb()
    .prepare(
      `SELECT id, title, artist, lines_count, created_at
       FROM songs
       ORDER BY created_at DESC`
    )
    .all() as SongListRow[];

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    artist: r.artist,
    linesCount: r.lines_count,
    createdAt: r.created_at,
  }));
}

export function getSong(id: string): SongFull | null {
  const row = getDb()
    .prepare(
      `SELECT id, title, artist, lyrics, analyzed, lines_count, created_at
       FROM songs WHERE id = ?`
    )
    .get(id) as SongDetailRow | undefined;

  if (!row) return null;
  const analyzed = parseAnalyzed(row.analyzed, row.id);
  if (!analyzed) return null;

  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    lyrics: row.lyrics,
    linesCount: row.lines_count,
    createdAt: row.created_at,
    analyzed,
  };
}

export function deleteSong(id: string): boolean {
  const result = getDb().prepare(`DELETE FROM songs WHERE id = ?`).run(id);
  return result.changes > 0;
}
