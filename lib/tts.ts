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

export function speak(text: string, rate = 0.85): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  if (!text.trim()) return;
  window.speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  u.rate = rate;

  const selectedName = getSelectedVoiceName();
  if (selectedName) {
    const voices = window.speechSynthesis.getVoices();
    const found = voices.find((v) => v.name === selectedName);
    if (found) u.voice = found;
  }

  window.speechSynthesis.speak(u);
}
