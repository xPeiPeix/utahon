const NON_SONG_KEYWORDS = [
  "showcase",
  "アニメーション",
  "ライブ",
  "live配信",
  "雑談",
  "asmr",
  "ボイス",
  "voice",
  "プレイ",
  "紹介",
  "解説",
  "vlog",
  "trailer",
  "予告",
  "告知",
  "メンバーシップ",
  "切り抜き",
];

const BRACKET_RE = /^[【\[（(][^】\])）]+[】\])）]\s*/;
const SUFFIX_PATTERNS: RegExp[] = [
  /\s*[／/]\s*(?:covered\s*by|cover\s*by|sung\s*by|歌ってみた)\s*[:：]?\s*.+$/i,
  /\s*[／/]\s*(?:by\s+).+$/i,
  /\s*[／/]\s*[^／/]+$/,
];

export function isLikelySong(title: string): boolean {
  const lower = title.toLowerCase();
  return !NON_SONG_KEYWORDS.some((k) => lower.includes(k.toLowerCase()));
}

export function extractSongName(title: string): string {
  let s = title;
  while (BRACKET_RE.test(s)) {
    s = s.replace(BRACKET_RE, "");
  }
  for (const re of SUFFIX_PATTERNS) {
    const next = s.replace(re, "");
    if (next !== s && next.trim().length >= 2) {
      s = next;
      break;
    }
  }
  return s.trim();
}
