import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import type { ParsedLine, AnalyzedLine } from "@/types/lyrics";

const PRIMARY_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL ?? PRIMARY_MODEL;
const HAS_FALLBACK = PRIMARY_MODEL !== FALLBACK_MODEL;

let downgraded = false;

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

const SYSTEM_PROMPT = `你是日语歌词翻译与学习助手。翻译目标"信达雅"：准确（信）、通顺（达）、有美感（雅）。

输入为一首日语歌的全部歌词行（按行分隔，每行一句）。请对每一行返回：
1. original：原文（照抄）
2. translation：简体中文翻译，按以下原则：
   - 这是「歌词」不是「散文/对白」，优先保留原文意象（如「桜」译"樱花"而非"花瓣"）
   - 先在心里把握全曲的情感基调和叙事脉络，再逐句翻译，避免割裂
   - 同一意象/关键词在不同段落保持一致译法，形成呼应
   - 抒情句留白克制，叙事句平实自然，不强求押韵或字数对齐
   - 不要逐字直译，但也不要过度添油加醋脱离原意
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

function isOverloadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b(429|503)\b|overloaded|UNAVAILABLE/i.test(msg);
}

function runWithModel(modelId: string, prompt: string) {
  const model = getClient().getGenerativeModel({
    model: modelId,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.3,
    },
  });
  return callWithRetry(() => model.generateContent(prompt));
}

export type AnalyzeContext = {
  title?: string;
  artist?: string;
};

function formatContext(ctx?: AnalyzeContext): string {
  if (!ctx) return "";
  const lines: string[] = [];
  if (ctx.title) lines.push(`- 歌名：${ctx.title}`);
  if (ctx.artist) lines.push(`- 歌手：${ctx.artist}`);
  if (lines.length === 0) return "";
  return `歌曲信息：\n${lines.join("\n")}\n\n`;
}

export async function analyzeLines(
  lines: ParsedLine[],
  ctx?: AnalyzeContext
): Promise<AnalyzedLine[]> {
  const joinedLyrics = lines.map((l, i) => `${i + 1}. ${l.text}`).join("\n");
  const prompt = `${SYSTEM_PROMPT}\n\n${formatContext(ctx)}歌词：\n${joinedLyrics}`;

  const activeModel = downgraded ? FALLBACK_MODEL : PRIMARY_MODEL;
  let result;
  try {
    result = await runWithModel(activeModel, prompt);
  } catch (err) {
    if (!downgraded && HAS_FALLBACK && isOverloadError(err)) {
      console.warn(
        `[gemini] primary ${PRIMARY_MODEL} overload 降级到 ${FALLBACK_MODEL}`
      );
      downgraded = true;
      result = await runWithModel(FALLBACK_MODEL, prompt);
    } else {
      throw err;
    }
  }
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
