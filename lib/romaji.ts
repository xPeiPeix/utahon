import Kuroshiro from "kuroshiro";
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";
import { toRomaji as wkToRomaji } from "wanakana";
import path from "path";

let kuroshiro: Kuroshiro | null = null;
let initPromise: Promise<Kuroshiro> | null = null;

async function getKuroshiro(): Promise<Kuroshiro> {
  if (kuroshiro) return kuroshiro;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const k = new Kuroshiro();
    const dictPath = path.join(process.cwd(), "node_modules/kuromoji/dict");
    await k.init(new KuromojiAnalyzer({ dictPath }));
    kuroshiro = k;
    return k;
  })();

  return initPromise;
}

const KANA_ONLY = /^[\u3040-\u30FFー\s]+$/;

export async function toRomaji(text: string): Promise<string> {
  if (!text.trim()) return "";
  if (KANA_ONLY.test(text)) {
    return wkToRomaji(text);
  }
  const k = await getKuroshiro();
  return k.convert(text, { to: "romaji", mode: "spaced", romajiSystem: "hepburn" });
}

export async function toHiragana(text: string): Promise<string> {
  if (!text.trim()) return "";
  const k = await getKuroshiro();
  return k.convert(text, { to: "hiragana" });
}
