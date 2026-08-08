import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { getPractice, practiceTrackPath } from "@/lib/practice";
import { parseByteRange } from "@/lib/practice-audio";
import type { PracticeTrack } from "@/types/practice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRACKS = new Set<PracticeTrack>(["mix", "vocals", "drums", "bass", "other"]);
type RouteParams = { params: Promise<{ id: string; track: string }> };

async function audioResponse(request: Request, params: RouteParams["params"], headOnly: boolean) {
  const { id, track: rawTrack } = await params;
  if (!TRACKS.has(rawTrack as PracticeTrack)) {
    return Response.json({ error: "音轨不存在" }, { status: 404 });
  }
  const record = getPractice(id);
  if (!record?.audioSha256) return Response.json({ error: "练习音频不存在" }, { status: 404 });
  const filePath = practiceTrackPath(id, record.audioSha256, rawTrack as PracticeTrack);
  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch {
    return Response.json({ error: "练习音频不存在" }, { status: 404 });
  }

  let range;
  try {
    range = parseByteRange(request.headers.get("range"), fileStat.size);
  } catch {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${fileStat.size}` },
    });
  }
  const start = range?.start ?? 0;
  const end = range?.end ?? fileStat.size - 1;
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
    "Content-Length": String(end - start + 1),
    "Content-Type": "audio/mp4",
  });
  if (range) headers.set("Content-Range", `bytes ${start}-${end}/${fileStat.size}`);
  if (headOnly) return new Response(null, { status: range ? 206 : 200, headers });
  const nodeStream = createReadStream(filePath, { start, end });
  const body = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
  return new Response(body, { status: range ? 206 : 200, headers });
}

export async function GET(request: Request, { params }: RouteParams) {
  return audioResponse(request, params, false);
}

export async function HEAD(request: Request, { params }: RouteParams) {
  return audioResponse(request, params, true);
}
