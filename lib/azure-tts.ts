import "server-only";

const ENDPOINT_PATH = "/cognitiveservices/v1";
const OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rateToPercent(rate: number): string {
  const raw = Math.round((rate - 1) * 100);
  const pct = Math.max(-50, Math.min(100, raw));
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

function buildSsml(text: string, voice: string, rate: number): string {
  const safe = escapeXml(text);
  const prosody = `<prosody rate="${rateToPercent(rate)}">${safe}</prosody>`;
  return `<speak version="1.0" xml:lang="ja-JP" xmlns="http://www.w3.org/2001/10/synthesis"><voice name="${voice}">${prosody}</voice></speak>`;
}

export async function synthesizeAzureTts(
  text: string,
  voice: string,
  rate: number
): Promise<Buffer> {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) throw new Error("Azure Speech 未配置 (缺 KEY 或 REGION)");

  const url = `https://${region}.tts.speech.microsoft.com${ENDPOINT_PATH}`;
  const ssml = buildSsml(text, voice, rate);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": OUTPUT_FORMAT,
        "User-Agent": "utahon-tts",
      },
      body: ssml,
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted) throw new Error("Azure Speech 请求超时 (15s)");
    throw new Error("Azure Speech 服务不可达");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Azure Speech ${res.status}: ${body.slice(0, 200) || res.statusText}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength === 0) throw new Error("Azure Speech 返回空音频");
  return buf;
}

export function isAzureConfigured(): boolean {
  return Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION);
}
