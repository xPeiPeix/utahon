import { isServerVoice } from "./tts-voices";

const VOICE_KEY = "utahon-voice";

export function getSelectedVoiceName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(VOICE_KEY);
}

export function setSelectedVoiceName(name: string | null): void {
  if (typeof window === "undefined") return;
  if (name) localStorage.setItem(VOICE_KEY, name);
  else localStorage.removeItem(VOICE_KEY);
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

export function speak(text: string, rate = 0.85): SpeakHandle {
  // 空文本短路，返回一个已 resolve 的 handle
  if (typeof window === "undefined" || !text.trim()) {
    return { promise: Promise.resolve(), abort: () => {} };
  }

  stopAll();

  const selectedName = getSelectedVoiceName();

  if (isServerVoice(selectedName)) {
    const controller = new AbortController();
    currentController = controller;

    const promise = (async () => {
      let blobUrl: string | null = null;
      try {
        const res = await fetch(
          buildServerTtsUrl(text, selectedName!, rate),
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);
        const blob = await res.blob();
        if (controller.signal.aborted) return;
        blobUrl = URL.createObjectURL(blob);
        const audio = new Audio(blobUrl);
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error("audio playback error"));
          // abort 时立即停止播放
          controller.signal.addEventListener("abort", () => {
            audio.pause();
            audio.src = "";
            resolve();
          });
          audio.play().catch(reject);
        });
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
  u.rate = rate;

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
