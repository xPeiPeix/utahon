import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import type { ParsedLine, AnalyzedLine } from "@/types/lyrics";

const MODEL_ID = process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not set in .env.local");
  }
  return new GoogleGenerativeAI(apiKey);
}

const RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    lines: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          original: { type: SchemaType.STRING },
          translation: { type: SchemaType.STRING },
          tokens: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                surface: { type: SchemaType.STRING },
                furigana: { type: SchemaType.STRING },
                meaning: { type: SchemaType.STRING },
                pos: { type: SchemaType.STRING },
              },
              required: ["surface", "furigana", "meaning", "pos"],
            },
          },
        },
        required: ["original", "translation", "tokens"],
      },
    },
  },
  required: ["lines"],
};

const SYSTEM_PROMPT = `你是日语学习助手。输入为一首日语歌的全部歌词行（按行分隔，每行一句）。
请对每一行返回：
1. original：原文（照抄）
2. translation：自然流畅的简体中文翻译（不要直译，要符合中文表达习惯）
3. tokens：该行的所有实词拆分，每个 token 含：
   - surface：该词在句中的原形（含汉字如有）
   - furigana：该词的平假名读音
   - meaning：中文释义（简短，一个词或短语）
   - pos：词性，限定为 noun / verb / adjective / adverb / expression / particle / other

规则：
- tokens 包含所有名词、动词、形容词、副词、惯用表达
- 跳过纯助词（は・が・を・に・で）、单独的だ・です、句末语气词（よ・ね・な）
- 对于复合词（如「歩き回る」）作为单个 token 处理
- furigana 只含平假名，不要片假名（除非原文就是片假名）`;

async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const retryable = /\b(429|500|502|503|504)\b|ECONNRESET|ETIMEDOUT|fetch failed|overloaded/i.test(
        msg
      );
      if (!retryable || attempt === maxRetries) throw err;
      const delayMs = 2 ** attempt * 1500;
      console.warn(
        `[gemini] retry ${attempt + 1}/${maxRetries} after ${delayMs}ms (${msg.slice(0, 120)})`
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

export async function analyzeLines(lines: ParsedLine[]): Promise<AnalyzedLine[]> {
  const model = getClient().getGenerativeModel({
    model: MODEL_ID,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.3,
    },
  });

  const joinedLyrics = lines.map((l, i) => `${i + 1}. ${l.text}`).join("\n");
  const prompt = `${SYSTEM_PROMPT}\n\n歌词：\n${joinedLyrics}`;

  const result = await callWithRetry(() => model.generateContent(prompt));
  const raw = result.response.text();
  const parsed = JSON.parse(raw) as {
    lines: Array<{
      original: string;
      translation: string;
      tokens: Array<{ surface: string; furigana: string; meaning: string; pos: string }>;
    }>;
  };

  return parsed.lines.map((line, i) => ({
    original: line.original,
    translation: line.translation,
    romaji: "",
    tokens: line.tokens.map((t) => ({ ...t, romaji: "" })),
    startTime: lines[i]?.startTime ?? 0,
    endTime: lines[i]?.endTime ?? 0,
  }));
}
