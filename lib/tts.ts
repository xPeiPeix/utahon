import { isServerVoice } from "./tts-voices";

const VOICE_KEY = "utahon-voice";
const RATE_KEY_PREFIX = "utahon-voice-rate:";
const BROWSER_VOICE_KEY = "__browser__";

export const DEFAULT_RATE = 0.85;
export const VALID_RATES = [0.6, 0.75, 0.85, 1.0, 1.25, 1.5] as const;
export type ValidRate = (typeof VALID_RATES)[number];

export function getSelectedVoiceName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(VOICE_KEY);
}

export function setSelectedVoiceName(name: string | null): void {
  if (typeof window === "undefined") return;
  if (name) localStorage.setItem(VOICE_KEY, name);
  else localStorage.removeItem(VOICE_KEY);
}

export function clampRate(n: number): ValidRate {
  if (!Number.isFinite(n)) return DEFAULT_RATE;
  // 选最接近合法档位的值，越界值落到边界档
  let best: ValidRate = DEFAULT_RATE;
  let bestDiff = Infinity;
  for (const r of VALID_RATES) {
    const diff = Math.abs(r - n);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = r;
    }
  }
  return best;
}

function rateKey(voiceName: string | null): string {
  return `${RATE_KEY_PREFIX}${voiceName ?? BROWSER_VOICE_KEY}`;
}

export function getSelectedRate(voiceName: string | null): ValidRate {
  if (typeof window === "undefined") return DEFAULT_RATE;
  const raw = localStorage.getItem(rateKey(voiceName));
  if (raw === null) return DEFAULT_RATE;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_RATE;
  // 严格匹配档位，不再 fuzzy clamp（防止存了 0.7 被读成 0.75 引起 stepper 视觉跳动）
  return (VALID_RATES as readonly number[]).includes(parsed)
    ? (parsed as ValidRate)
    : DEFAULT_RATE;
}

export function setSelectedRate(voiceName: string | null, rate: number): void {
  if (typeof window === "undefined") return;
  const safe = clampRate(rate);
  localStorage.setItem(rateKey(voiceName), String(safe));
}

export function listJapaneseVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang === "ja-JP" || v.lang.toLowerCase().startsWith("ja"));
}

export function hasBrowserJapaneseVoice(): boolean {
  return listJapaneseVoices().length > 0;
}

// 当前正在播放的控制器，新请求到来时 abort 旧的
let currentController: AbortController | null = null;

/** 取消当前正在进行的 TTS 请求（含 fetch + 播放） */
export function abortCurrent(): void {
  stopAll();
}

function stopAll(): void {
  if (typeof window === "undefined") return;
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  if (currentController) {
    currentController.abort();
    currentController = null;
  }
}

export function buildServerTtsUrl(
  text: string,
  voice: string,
  rate = 0.85
): string {
  const params = new URLSearchParams({
    text,
    voice,
    rate: String(rate),
  });
  return `/api/tts?${params.toString()}`;
}

export type SpeakHandle = {
  /** resolves when playback ends, rejects on abort/error */
  promise: Promise<void>;
  abort: () => void;
};

export function speak(text: string, rate?: number): SpeakHandle {
  // 空文本短路，返回一个已 resolve 的 handle
  if (typeof window === "undefined" || !text.trim()) {
    return { promise: Promise.resolve(), abort: () => {} };
  }

  stopAll();

  const selectedName = getSelectedVoiceName();
  // 显式传 rate 优先（stepper preview 强制立即生效），否则按当前 voice 取持久化值
  const effectiveRate = rate !== undefined ? clampRate(rate) : getSelectedRate(selectedName);

  if (isServerVoice(selectedName)) {
    const controller = new AbortController();
    currentController = controller;

    const promise = (async () => {
      let blobUrl: string | null = null;
      try {
        const res = await fetch(
          buildServerTtsUrl(text, selectedName!, effectiveRate),
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);
        const blob = await res.blob();
        if (controller.signal.aborted) return;
        blobUrl = URL.createObjectURL(blob);
        const audio = new Audio(blobUrl);
        await new Promise<void>((resolve) => {
          // signal 已 aborted（注册监听器前的窗口）→ 立即结束
          if (controller.signal.aborted) {
            resolve();
            return;
          }
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          controller.signal.addEventListener("abort", () => {
            audio.pause();
            audio.src = "";
            resolve();
          });
          audio.play().catch(() => resolve());
        });
      } catch (err) {
        // abort/HTTP/network 错误统一消化为 resolve，避免调用方 unhandled rejection
        if (!controller.signal.aborted) {
          console.warn("[tts] speak failed:", err);
        }
      } finally {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        if (currentController === controller) currentController = null;
      }
    })();

    return {
      promise,
      abort: () => controller.abort(),
    };
  }

  // 浏览器 SpeechSynthesis 路径
  if (!("speechSynthesis" in window)) {
    return { promise: Promise.resolve(), abort: () => {} };
  }

  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  u.rate = effectiveRate;

  if (selectedName) {
    const voices = window.speechSynthesis.getVoices();
    const found = voices.find((v) => v.name === selectedName);
    if (found) u.voice = found;
  }

  let aborted = false;
  const promise = new Promise<void>((resolve) => {
    u.onend = () => resolve();
    u.onerror = () => resolve(); // 降级处理，不抛出
    window.speechSynthesis.speak(u);
    // 如果 abort 先被调用
    if (aborted) {
      window.speechSynthesis.cancel();
      resolve();
    }
  });

  return {
    promise,
    abort: () => {
      aborted = true;
      window.speechSynthesis.cancel();
    },
  };
}
