import { createSong, existsByLrclibId, existsByYoutubeId } from "@/lib/songs";
import { extractYoutubeId } from "@/lib/youtube";
import type { PendingInsert, Placeholder } from "@/lib/ingest";
import type { AnalyzedSong } from "@/types/lyrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InsertedRow = {
  videoId: string;
  songId: string;
  title: string;
  placeholder?: boolean;
};

type SkippedRow = {
  videoId: string;
  title: string;
  reason: string;
};

type CommitResult = {
  inserted: InsertedRow[];
  skipped: SkippedRow[];
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | {
        pendingInserts?: PendingInsert[];
        placeholders?: Placeholder[];
      }
    | null;

  if (!body || typeof body !== "object") {
    return Response.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  const result: CommitResult = { inserted: [], skipped: [] };

  for (const p of body.pendingInserts ?? []) {
    if (!p || typeof p !== "object" || !p.videoId) continue;

    if (existsByYoutubeId(p.videoId)) {
      result.skipped.push({
        videoId: p.videoId,
        title: p.title,
        reason: "已入库 (youtube_id)",
      });
      continue;
    }
    if (p.lrclibId > 0 && existsByLrclibId(p.lrclibId)) {
      result.skipped.push({
        videoId: p.videoId,
        title: p.title,
        reason: "已入库 (lrclib_id)",
      });
      continue;
    }

    try {
      const songId = createSong({
        title: p.title,
        artist: p.artist,
        originalArtist: p.originalArtist,
        lyrics: p.lyrics,
        analyzed: p.analyzed,
        youtubeUrl: p.youtubeUrl,
        lrclibId: p.lrclibId,
      });
      result.inserted.push({ videoId: p.videoId, songId, title: p.title });
    } catch (err) {
      result.skipped.push({
        videoId: p.videoId,
        title: p.title,
        reason: err instanceof Error ? err.message : "入库失败",
      });
    }
  }

  for (const ph of body.placeholders ?? []) {
    if (!ph || typeof ph !== "object" || !ph.videoId) continue;

    if (existsByYoutubeId(ph.videoId)) {
      result.skipped.push({
        videoId: ph.videoId,
        title: ph.title,
        reason: "已入库 (youtube_id)",
      });
      continue;
    }

    try {
      const youtubeId = extractYoutubeId(ph.youtubeUrl);
      const emptyAnalyzed: AnalyzedSong = {
        title: ph.title,
        artist: "",
        youtubeUrl: ph.youtubeUrl,
        youtubeId,
        lines: [],
      };
      const songId = createSong({
        title: ph.title,
        artist: "",
        lyrics: "",
        analyzed: emptyAnalyzed,
        youtubeUrl: ph.youtubeUrl,
      });
      result.inserted.push({
        videoId: ph.videoId,
        songId,
        title: ph.title,
        placeholder: true,
      });
    } catch (err) {
      result.skipped.push({
        videoId: ph.videoId,
        title: ph.title,
        reason: err instanceof Error ? err.message : "占位入库失败",
      });
    }
  }

  return Response.json(result);
}
