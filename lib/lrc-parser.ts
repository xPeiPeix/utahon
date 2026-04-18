import type { ParsedLine } from "@/types/lyrics";

const TIMESTAMP_RE = /^\[(\d+):(\d{2})\.(\d{2,3})\](.*)$/;

function toSeconds(mm: string, ss: string, cs: string): number {
  const frac = cs.length === 2 ? parseInt(cs) / 100 : parseInt(cs) / 1000;
  return parseInt(mm) * 60 + parseInt(ss) + frac;
}

export function parseLRC(lrc: string): ParsedLine[] {
  const all: { time: number; text: string }[] = [];
  for (const raw of lrc.split("\n")) {
    const m = raw.trim().match(TIMESTAMP_RE);
    if (!m) continue;
    const [, mm, ss, cs, text] = m;
    all.push({ time: toSeconds(mm, ss, cs), text: text.trim() });
  }
  all.sort((a, b) => a.time - b.time);

  const out: ParsedLine[] = [];
  for (let i = 0; i < all.length; i++) {
    if (!all[i].text) continue;
    if (!/[\u3040-\u30FF\u3400-\u9FFF]/.test(all[i].text)) continue;
    const end = i < all.length - 1 ? all[i + 1].time : all[i].time + 4;
    out.push({ startTime: all[i].time, endTime: end, text: all[i].text });
  }
  return out;
}

export function parsePlainLines(text: string): ParsedLine[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.map((t) => ({ startTime: 0, endTime: 0, text: t }));
}

export function hasLrcTimestamps(text: string): boolean {
  return /\[\d+:\d{2}\.\d{2,3}\]/.test(text);
}
