import { deleteVocab } from "@/lib/vocabulary";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const ok = deleteVocab(id);
  if (!ok) return Response.json({ error: "未找到" }, { status: 404 });
  return Response.json({ ok: true });
}
