import { processSong, type SongInput } from "@/lib/song-pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

type IngestBody = {
  title?: string;
  artist?: string;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as IngestBody | null;
  if (!body) {
    return Response.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const artist = typeof body.artist === "string" ? body.artist.trim() : "";
  if (!title) {
    return Response.json({ error: "歌名不能为空" }, { status: 400 });
  }
  if (!artist) {
    return Response.json({ error: "歌手不能为空" }, { status: 400 });
  }

  const songInput: SongInput = {
    title,
    artist,
    video: null,
    source: "share",
  };

  try {
    const outcome = await processSong(songInput);
    return Response.json(outcome);
  } catch (err) {
    console.error("[share/ingest] error", err);
    return Response.json(
      { error: "导入失败，请稍后再试" },
      { status: 500 }
    );
  }
}
