import { addVocab, listVocab, type AddVocabInput } from "@/lib/vocabulary";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ entries: listVocab() });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as AddVocabInput | null;
  if (!body || typeof body !== "object" || !body.surface?.trim()) {
    return Response.json({ error: "缺少 surface" }, { status: 400 });
  }

  try {
    const result = addVocab(body);
    return Response.json(result, {
      status: result.kind === "added" ? 201 : 200,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "保存失败";
    return Response.json({ error: msg }, { status: 500 });
  }
}
