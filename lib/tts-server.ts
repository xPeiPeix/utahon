import "server-only";
import { Communicate } from "edge-tts-universal";
import { createHash } from "node:crypto";
import { isServerVoice } from "./tts-voices";

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

export function isKnownServerVoice(name: string): boolean {
  return isServerVoice(name);
}

export async function synthesizeMp3(
  text: string,
  voice: string,
  rate = 0.85
): Promise<Buffer> {
  const key = cacheKey(text, voice, rate);
  const cached = cacheGet(key);
  if (cached) return cached;

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
  if (buf.byteLength === 0) {
    throw new Error("Edge TTS 返回空音频");
  }
  cacheSet(key, buf);
  return buf;
}
