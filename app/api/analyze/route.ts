import { NextRequest } from "next/server";
import { parseLRC, parsePlainLines } from "@/lib/lrc-parser";
import { analyzeLines } from "@/lib/gemini";
import { toRomaji } from "@/lib/romaji";
import type { AnalyzedSong, AnalyzedLine } from "@/types/lyrics";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  lyrics: string;
  title?: string;
  artist?: string;
};

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { lyrics, title = "", artist = "" } = body;
  if (!lyrics || typeof lyrics !== "string") {
    return Response.json({ error: "Missing lyrics" }, { status: 400 });
  }

  const parsed = lyrics.includes("[") && lyrics.includes("]")
    ? parseLRC(lyrics)
    : parsePlainLines(lyrics);

  if (parsed.length === 0) {
    return Response.json({ error: "No Japanese lines detected" }, { status: 400 });
  }

  let analyzed: AnalyzedLine[];
  try {
    analyzed = await analyzeLines(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gemini call failed";
    return Response.json({ error: msg }, { status: 502 });
  }

  const enriched: AnalyzedLine[] = await Promise.all(
    analyzed.map(async (line) => {
      const tokensWithRomaji = await Promise.all(
        line.tokens.map(async (t) => ({
          ...t,
          romaji: await toRomaji(t.furigana || t.surface),
        }))
      );
      const lineRomaji = tokensWithRomaji
        .map((t) => t.romaji.replace(/\s+/g, ""))
        .filter(Boolean)
        .join(" ");
      return { ...line, romaji: lineRomaji, tokens: tokensWithRomaji };
    })
  );

  const result: AnalyzedSong = { title, artist, lines: enriched };
  return Response.json(result);
}
