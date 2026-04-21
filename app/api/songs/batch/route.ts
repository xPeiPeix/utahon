import { NextRequest } from "next/server";
import { deleteSongs } from "@/lib/songs";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { action?: string; ids?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "请求体不是有效 JSON" }, { status: 400 });
  }

  if (body.action !== "delete") {
    return Response.json({ error: "不支持的 action" }, { status: 400 });
  }

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return Response.json({ error: "ids 必须是非空数组" }, { status: 400 });
  }

  const ids = body.ids.filter((x): x is string => typeof x === "string" && x.length > 0);
  if (ids.length === 0) {
    return Response.json({ error: "没有合法的 id" }, { status: 400 });
  }

  const affected = deleteSongs(ids);
  return Response.json({ ok: true, affected });
}
