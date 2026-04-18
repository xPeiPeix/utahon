const PATTERNS = [
  /[?&]v=([A-Za-z0-9_-]{11})/,
  /youtu\.be\/([A-Za-z0-9_-]{11})/,
  /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
  /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
];

export function extractYoutubeId(url: string): string {
  if (!url?.trim()) return "";
  const trimmed = url.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  for (const p of PATTERNS) {
    const m = trimmed.match(p);
    if (m) return m[1];
  }
  return "";
}
