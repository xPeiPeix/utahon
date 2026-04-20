export type SourceKind = "youtube" | "bilibili";

export type SourceRef = {
  kind: SourceKind;
  id: string;
  url: string;
};

const YT_PATTERNS = [
  /(?:[?&]v=)([A-Za-z0-9_-]{11})/,
  /youtu\.be\/([A-Za-z0-9_-]{11})/,
  /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
  /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
];

const BV_PATTERN = /(BV[A-Za-z0-9]{10})/;

export function detectSource(input: string): SourceRef | null {
  const trimmed = input?.trim();
  if (!trimmed) return null;

  if (/^BV[A-Za-z0-9]{10}$/.test(trimmed)) {
    return {
      kind: "bilibili",
      id: trimmed,
      url: `https://www.bilibili.com/video/${trimmed}/`,
    };
  }

  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
    return {
      kind: "youtube",
      id: trimmed,
      url: `https://www.youtube.com/watch?v=${trimmed}`,
    };
  }

  if (/bilibili\.com|b23\.tv/.test(trimmed)) {
    const m = trimmed.match(BV_PATTERN);
    if (m) {
      return {
        kind: "bilibili",
        id: m[1],
        url: `https://www.bilibili.com/video/${m[1]}/`,
      };
    }
  }

  for (const p of YT_PATTERNS) {
    const m = trimmed.match(p);
    if (m) {
      return {
        kind: "youtube",
        id: m[1],
        url: `https://www.youtube.com/watch?v=${m[1]}`,
      };
    }
  }

  return null;
}
