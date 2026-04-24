import { parseLRC, parsePlainLines, hasLrcTimestamps } from "./lrc-parser";
import { analyzeLines } from "./gemini";
import { toRomaji } from "./romaji";
import { extractYoutubeId } from "./youtube";
import type { AnalyzedLine, AnalyzedSong } from "@/types/lyrics";

export async function analyzeLyrics(params: {
  lyrics: string;
  title?: string;
  artist?: string;
  youtubeUrl?: string;
}): Promise<AnalyzedSong> {
  const title = params.title?.trim() || "未命名";
  const artist = params.artist?.trim() || "未知";
  const youtubeUrl = params.youtubeUrl?.trim() ?? "";
  const youtubeId = extractYoutubeId(youtubeUrl);

  const parsed = hasLrcTimestamps(params.lyrics)
    ? parseLRC(params.lyrics)
    : parsePlainLines(params.lyrics);

  if (parsed.length === 0) {
    throw new Error("未检测到有效的日文歌词行");
  }

  const analyzed = await analyzeLines(parsed);

  const enriched: AnalyzedLine[] = await Promise.all(
    analyzed.map(async (line) => {
      const tokensWithRomaji = await Promise.all(
        line.tokens.map(async (t) => {
          const pos = (t.pos ?? "").toLowerCase();
          const isSymbol =
            pos === "symbol" || /^[\s\p{P}\p{S}]+$/u.test(t.surface);
          return {
            ...t,
            romaji: isSymbol ? "" : await toRomaji(t.furigana || t.surface),
          };
        })
      );
      const lineRomaji = tokensWithRomaji
        .map((t) => t.romaji.replace(/\s+/g, ""))
        .filter(Boolean)
        .join(" ");
      return { ...line, romaji: lineRomaji, tokens: tokensWithRomaji };
    })
  );

  return { title, artist, youtubeUrl, youtubeId, lines: enriched };
}
