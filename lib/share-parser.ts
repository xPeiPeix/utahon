import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";

const PRIMARY_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL ?? PRIMARY_MODEL;
const HAS_FALLBACK = PRIMARY_MODEL !== FALLBACK_MODEL;

export type ParsedShare = {
  title: string;
  artist: string;
  originalArtist: string;
  sourceUrl: string;
  platform: string;
};

const RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    artist: { type: SchemaType.STRING },
    originalArtist: { type: SchemaType.STRING },
    sourceUrl: { type: SchemaType.STRING },
    platform: { type: SchemaType.STRING },
  },
  required: ["title", "artist", "originalArtist", "sourceUrl", "platform"],
};

const SYSTEM_PROMPT = `你将解析音乐分享文本（QQ 音乐、网易云、Apple Music、Spotify 等平台分享出来的纯文本），返回规范化的歌曲元数据。

字段语义：
- title：人们用来搜索这首歌时会输入的名字（不含读音辅助、翻译注释、平台后缀）
- artist：这首歌的主唱（multi-vocalist 取最有代表性的一位）
- originalArtist：合作者、featured、词曲作者（无则留空字符串）
- sourceUrl：原始分享链接（保留短链原样；无则留空字符串）
- platform：来源平台标识（小写英文，如 qqmusic / netease / apple / spotify / other；无则留空字符串）

完全无法识别为音乐分享时，所有字段返回空字符串。`;

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not set in .env.local");
  }
  return new GoogleGenerativeAI(apiKey);
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
      temperature: 0.2,
    },
  });
  return model.generateContent(prompt);
}

export async function parseShareText(text: string): Promise<ParsedShare> {
  const prompt = `${SYSTEM_PROMPT}\n\n输入：\n${text.trim()}`;

  let result;
  try {
    result = await runWithModel(PRIMARY_MODEL, prompt);
  } catch (err) {
    if (HAS_FALLBACK && isOverloadError(err)) {
      console.warn(
        `[share-parser] ${PRIMARY_MODEL} overload 降级到 ${FALLBACK_MODEL}`
      );
      result = await runWithModel(FALLBACK_MODEL, prompt);
    } else {
      throw err;
    }
  }

  const raw = result.response.text();
  let parsed: ParsedShare;
  try {
    parsed = JSON.parse(raw) as ParsedShare;
  } catch (err) {
    console.error("[share-parser] JSON.parse failed", {
      msg: err instanceof Error ? err.message : String(err),
      sample: raw.slice(0, 500),
    });
    throw new Error("AI 输出格式异常，请重试");
  }
  return {
    title: (parsed.title ?? "").trim(),
    artist: (parsed.artist ?? "").trim(),
    originalArtist: (parsed.originalArtist ?? "").trim(),
    sourceUrl: (parsed.sourceUrl ?? "").trim(),
    platform: (parsed.platform ?? "").trim().toLowerCase(),
  };
}
