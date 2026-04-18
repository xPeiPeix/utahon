import { NextRequest } from "next/server";
import { analyzeLyrics } from "@/lib/analyze-pipeline";
import { createSong, listSongs } from "@/lib/songs";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  return Response.json(listSongs());
}

export async function POST(request: NextRequest) {
  let body: { lyrics: string; title?: string; artist?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求体不是有效 JSON" }, { status: 400 });
  }

  if (!body.lyrics || typeof body.lyrics !== "string") {
    return Response.json({ error: "歌词为空" }, { status: 400 });
  }

  try {
    const analyzed = await analyzeLyrics({
      lyrics: body.lyrics,
      title: body.title,
      artist: body.artist,
    });
    const id = createSong({
      title: analyzed.title,
      artist: analyzed.artist,
      lyrics: body.lyrics,
      analyzed,
    });
    return Response.json({ id }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "分析失败";
    let status = 502;
    if (msg.includes("未检测到") || msg.includes("歌词为空")) status = 400;
    else if (msg.includes("GOOGLE_AI_API_KEY")) status = 500;
    else if (msg.toLowerCase().includes("quota") || msg.includes("429"))
      status = 429;
    return Response.json({ error: msg }, { status });
  }
}
