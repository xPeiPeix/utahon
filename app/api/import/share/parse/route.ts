import { parseShareText } from "@/lib/share-parser";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { text?: string }
    | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return Response.json({ error: "缺少分享文本" }, { status: 400 });
  }
  if (text.length > 4000) {
    return Response.json({ error: "文本过长（>4000 字符）" }, { status: 400 });
  }

  try {
    const parsed = await parseShareText(text);
    return Response.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI 识别失败";
    return Response.json({ error: msg }, { status: 500 });
  }
}
