import { runIngest } from "@/lib/ingest";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | {
        channelUrl?: string;
        limit?: number;
        commit?: boolean;
        artistHint?: string;
        delayMs?: number;
      }
    | null;

  if (!body || typeof body !== "object") {
    return Response.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }
  const channelUrl = body.channelUrl?.trim();
  if (!channelUrl) {
    return Response.json({ error: "缺少 channelUrl" }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(channelUrl)) {
    return Response.json(
      { error: "channelUrl 必须是 http(s) 链接" },
      { status: 400 }
    );
  }

  try {
    const summary = await runIngest({
      channelUrl,
      limit:
        typeof body.limit === "number" && body.limit > 0
          ? Math.floor(body.limit)
          : undefined,
      commit: Boolean(body.commit),
      artistHint:
        typeof body.artistHint === "string" ? body.artistHint : "",
      delayMs:
        typeof body.delayMs === "number" && body.delayMs >= 0
          ? body.delayMs
          : 1500,
    });
    return Response.json(summary);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ingest 失败";
    return Response.json({ error: msg }, { status: 500 });
  }
}
