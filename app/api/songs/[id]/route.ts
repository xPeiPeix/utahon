import { NextRequest } from "next/server";
import { getSong, deleteSong } from "@/lib/songs";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const song = getSong(id);
  if (!song) {
    return Response.json({ error: "歌曲不存在" }, { status: 404 });
  }
  return Response.json(song);
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const ok = deleteSong(id);
  if (!ok) {
    return Response.json({ error: "歌曲不存在" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
