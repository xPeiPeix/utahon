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

let serverAudio: HTMLAudioElement | null = null;

function stopAll(): void {
  if (typeof window === "undefined") return;
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  if (serverAudio) {
    serverAudio.pause();
    serverAudio.src = "";
    serverAudio = null;
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

export function speak(text: string, rate = 0.85): void {
  if (typeof window === "undefined") return;
  if (!text.trim()) return;
  stopAll();

  const selectedName = getSelectedVoiceName();

  if (isServerVoice(selectedName)) {
    const audio = new Audio(buildServerTtsUrl(text, selectedName!, rate));
    audio.preload = "auto";
    serverAudio = audio;
    audio.play().catch(() => {
      serverAudio = null;
    });
    return;
  }

  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  u.rate = rate;

  if (selectedName) {
    const voices = window.speechSynthesis.getVoices();
    const found = voices.find((v) => v.name === selectedName);
    if (found) u.voice = found;
  }

  window.speechSynthesis.speak(u);
}
