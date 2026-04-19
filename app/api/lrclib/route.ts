import { fetchLrclibLyrics } from "@/lib/lrclib";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { title?: string; artist?: string }
    | null;
  if (!body || typeof body !== "object") {
    return Response.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }
  const title = body.title?.trim() ?? "";
  const artist = body.artist?.trim() ?? "";
  if (!title) {
    return Response.json({ error: "请填歌名" }, { status: 400 });
  }

  try {
    const result = await fetchLrclibLyrics({ title, artist });
    if (!result) {
      return Response.json(
        { error: "lrclib 没找到这首歌的歌词" },
        { status: 404 }
      );
    }
    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "拉取失败";
    return Response.json({ error: msg }, { status: 502 });
  }
}
