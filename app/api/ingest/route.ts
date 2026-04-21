import { runIngest } from "@/lib/ingest";
import type { ProgressEvent } from "@/lib/ingest";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function normalizeChannelUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^@[A-Za-z0-9_.-]+$/.test(trimmed)) {
    return `https://www.youtube.com/${trimmed}`;
  }
  return trimmed;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | {
        channelUrl?: string;
        limit?: number;
        artistHint?: string;
        delayMs?: number;
      }
    | null;

  if (!body || typeof body !== "object") {
    return Response.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }
  const channelUrl = normalizeChannelUrl(body.channelUrl ?? "");
  if (!channelUrl) {
    return Response.json({ error: "缺少 channelUrl" }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(channelUrl)) {
    return Response.json(
      { error: "channelUrl 必须是 http(s) 链接 或 @handle" },
      { status: 400 }
    );
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
        const summary = await runIngest({
          channelUrl,
          limit:
            typeof body.limit === "number" && body.limit > 0
              ? Math.floor(body.limit)
              : undefined,
          artistHint:
            typeof body.artistHint === "string" ? body.artistHint : "",
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
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
