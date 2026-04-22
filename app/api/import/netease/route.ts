import { runNeteaseIngest } from "@/lib/netease-ingest";
import type { ProgressEvent } from "@/lib/ingest";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | {
        playlistUrl?: string;
        limit?: number;
        delayMs?: number;
      }
    | null;

  if (!body || typeof body !== "object") {
    return Response.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }
  const playlistUrl =
    typeof body.playlistUrl === "string" ? body.playlistUrl.trim() : "";
  if (!playlistUrl) {
    return Response.json({ error: "缺少 playlistUrl" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(chunk));
      };

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keep-alive\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      try {
        const summary = await runNeteaseIngest({
          playlistUrl,
          limit:
            typeof body.limit === "number" && body.limit > 0
              ? Math.floor(body.limit)
              : undefined,
          delayMs:
            typeof body.delayMs === "number" && body.delayMs >= 0
              ? body.delayMs
              : 1500,
          onProgress: (event: ProgressEvent) => send("progress", event),
        });
        send("done", summary);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "ingest 失败";
        send("error", { message: msg });
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
