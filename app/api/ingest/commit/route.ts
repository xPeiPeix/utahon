import { createSong, existsByLrclibId, existsByYoutubeId } from "@/lib/songs";
import type { PendingInsert } from "@/lib/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CommitResult = {
  inserted: Array<{ videoId: string; songId: string; title: string }>;
  skipped: Array<{ videoId: string; title: string; reason: string }>;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { pendingInserts?: PendingInsert[] }
    | null;

  if (!body || !Array.isArray(body.pendingInserts)) {
    return Response.json(
      { error: "pendingInserts 必须是数组" },
      { status: 400 }
    );
  }

  const result: CommitResult = { inserted: [], skipped: [] };

  for (const p of body.pendingInserts) {
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

  return Response.json(result);
}
