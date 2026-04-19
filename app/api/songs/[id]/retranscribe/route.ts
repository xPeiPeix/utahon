import { transcribeYoutube } from "@/lib/transcribe";
import { analyzeLyrics } from "@/lib/analyze-pipeline";
import { getSong, updateSongLyrics } from "@/lib/songs";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const song = getSong(id);
  if (!song) {
    return Response.json({ error: "歌曲不存在" }, { status: 404 });
  }

  const youtubeUrl =
    song.analyzed.youtubeUrl ||
    (song.youtubeId
      ? `https://www.youtube.com/watch?v=${song.youtubeId}`
      : "");
  if (!youtubeUrl) {
    return Response.json(
      { error: "歌曲没有 YouTube URL 无法转录" },
      { status: 400 }
    );
  }

  try {
    const lrc = await transcribeYoutube(youtubeUrl);
    const analyzed = await analyzeLyrics({
      lyrics: lrc,
      title: song.title,
      artist: song.artist,
      youtubeUrl,
    });
    const ok = updateSongLyrics(id, lrc, analyzed);
    if (!ok) {
      return Response.json({ error: "更新数据库失败" }, { status: 500 });
    }
    return Response.json({
      ok: true,
      lines: analyzed.lines.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "转录失败";
    let status = 500;
    if (msg.includes("GOOGLE_AI_API_KEY")) status = 500;
    else if (msg.toLowerCase().includes("quota") || msg.includes("429"))
      status = 429;
    else if (msg.includes("uv 未找到")) status = 500;
    return Response.json({ error: msg }, { status });
  }
}
