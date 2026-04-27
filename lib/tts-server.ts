import "server-only";
import { Communicate } from "edge-tts-universal";
import { createHash } from "node:crypto";
import { isServerVoice, isVoicevoxVoice, voicevoxSpeakerId } from "./tts-voices";

const CACHE_MAX_BYTES = 16 * 1024 * 1024;
const CACHE_MAX_ENTRIES = 300;

type CacheEntry = { buf: Buffer };
const cache = new Map<string, CacheEntry>();
let cacheBytes = 0;

function cacheKey(text: string, voice: string, rate: number): string {
  return createHash("sha256")
    .update(`${voice}|${rate}|${text}`)
    .digest("hex")
    .slice(0, 32);
}

function cacheGet(key: string): Buffer | null {
  const hit = cache.get(key);
  if (!hit) return null;
  cache.delete(key);
  cache.set(key, hit);
  return hit.buf;
}

function cacheSet(key: string, buf: Buffer): void {
  while (
    (cacheBytes + buf.byteLength > CACHE_MAX_BYTES ||
      cache.size >= CACHE_MAX_ENTRIES) &&
    cache.size > 0
  ) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    const old = cache.get(oldestKey);
    if (old) cacheBytes -= old.buf.byteLength;
    cache.delete(oldestKey);
  }
  cache.set(key, { buf });
  cacheBytes += buf.byteLength;
}

function rateToPercent(rate: number): string {
  const pct = Math.round((rate - 1) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

async function synthesizeMp3Internal(
  text: string,
  voice: string,
  rate: number
): Promise<Buffer> {
  const communicate = new Communicate(text, {
    voice,
    rate: rateToPercent(rate),
  });
  const chunks: Buffer[] = [];
  for await (const chunk of communicate.stream()) {
    if (chunk.type === "audio" && chunk.data) {
      chunks.push(Buffer.from(chunk.data));
    }
  }
  const buf = Buffer.concat(chunks);
  if (buf.byteLength === 0) throw new Error("Edge TTS 返回空音频");
  return buf;
}

const VOICEVOX_URL = process.env.VOICEVOX_URL ?? "http://localhost:50021";

async function synthesizeVoicevoxInternal(
  text: string,
  voice: string,
  rate: number
): Promise<Buffer> {
  const speakerId = voicevoxSpeakerId(voice);
  if (speakerId === null) throw new Error(`未知的 VOICEVOX 音色: ${voice}`);

  let queryRes: Response;
  try {
    queryRes = await fetch(
      `${VOICEVOX_URL}/audio_query?speaker=${speakerId}&text=${encodeURIComponent(text)}`,
      { method: "POST" }
    );
  } catch {
    throw new Error("VOICEVOX 服务不可达");
  }
  if (!queryRes.ok) throw new Error(`VOICEVOX audio_query 失败: ${queryRes.status}`);

  const query = (await queryRes.json()) as Record<string, unknown>;
  query.speedScale = rate;

  let synthRes: Response;
  try {
    synthRes = await fetch(`${VOICEVOX_URL}/synthesis?speaker=${speakerId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    });
  } catch {
    throw new Error("VOICEVOX 服务不可达");
  }
  if (!synthRes.ok) throw new Error(`VOICEVOX synthesis 失败: ${synthRes.status}`);

  const buf = Buffer.from(await synthRes.arrayBuffer());
  if (buf.byteLength === 0) throw new Error("VOICEVOX 返回空音频");
  return buf;
}

export function isKnownServerVoice(name: string): boolean {
  return isServerVoice(name);
}

export type SynthesisResult = { buf: Buffer; contentType: string };

// 同 cacheKey 并发请求复用同一个 Promise，避免 thundering herd
const inflight = new Map<string, Promise<SynthesisResult>>();

export async function synthesizeAudio(
  text: string,
  voice: string,
  rate = 0.85
): Promise<SynthesisResult> {
  const key = cacheKey(text, voice, rate);
  const cached = cacheGet(key);
  if (cached) {
    return { buf: cached, contentType: isVoicevoxVoice(voice) ? "audio/wav" : "audio/mpeg" };
  }

  const existing = inflight.get(key);
  if (existing) return existing;

  const contentType = isVoicevoxVoice(voice) ? "audio/wav" : "audio/mpeg";

  const promise: Promise<SynthesisResult> = (async () => {
    let buf: Buffer;
    if (isVoicevoxVoice(voice)) {
      buf = await synthesizeVoicevoxInternal(text, voice, rate);
    } else {
      buf = await synthesizeMp3Internal(text, voice, rate);
    }
    cacheSet(key, buf);
    return { buf, contentType };
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}
