import { createHash } from "crypto";
import { createReadStream } from "fs";
import { open, stat } from "fs/promises";
import { spawn } from "child_process";

export const MAX_AUDIO_UPLOAD_BYTES = 100 * 1024 * 1024;

export type ByteRange = { start: number; end: number };

export function parseByteRange(value: string | null, size: number): ByteRange | null {
  if (!value) return null;
  const match = value.match(/^bytes=(\d*)-(\d*)$/);
  if (!match || size <= 0) throw new Error("无效的 Range 请求");
  const [, startRaw, endRaw] = match;
  if (!startRaw && !endRaw) throw new Error("无效的 Range 请求");
  let start: number;
  let end: number;
  if (!startRaw) {
    const suffix = Number(endRaw);
    if (!Number.isInteger(suffix) || suffix <= 0) throw new Error("无效的 Range 请求");
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(startRaw);
    end = endRaw ? Number(endRaw) : size - 1;
  }
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= size || end < start) {
    throw new Error("Range 超出文件范围");
  }
  return { start, end: Math.min(end, size - 1) };
}

export async function sha256File(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  const stream = createReadStream(filePath);
  for await (const chunk of stream) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

function runCommand(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { shell: false });
    let stdout = "";
    let stderr = "";
    process.stdout.on("data", (chunk) => {
      if (stdout.length < 1024 * 1024) stdout += chunk.toString();
    });
    process.stderr.on("data", (chunk) => {
      if (stderr.length < 1024 * 1024) stderr += chunk.toString();
    });
    process.on("error", (error) => reject(error));
    process.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${command} 失败 (${code}): ${stderr.trim().slice(-2000)}`));
    });
  });
}

export async function probeAudio(filePath: string): Promise<{ durationSec: number }> {
  const raw = await runCommand("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "a:0",
    "-show_entries",
    "stream=codec_type:format=duration",
    "-of",
    "json",
    filePath,
  ]);
  let parsed: { streams?: Array<{ codec_type?: string }>; format?: { duration?: string } };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("ffprobe 没有返回有效结果");
  }
  if (!parsed.streams?.some((stream) => stream.codec_type === "audio")) {
    throw new Error("文件中没有可用音轨");
  }
  const durationSec = Number(parsed.format?.duration);
  if (!Number.isFinite(durationSec) || durationSec <= 0 || durationSec > 2 * 60 * 60) {
    throw new Error("音频时长无效或超过 2 小时");
  }
  return { durationSec };
}

export async function normalizePracticeAudio(inputPath: string, outputPath: string): Promise<void> {
  await runCommand("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    inputPath,
    "-vn",
    "-map_metadata",
    "-1",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    outputPath,
  ]);
  const fileStat = await stat(outputPath);
  if (fileStat.size <= 0) throw new Error("音频转换结果为空");
}

export async function writeRequestBodyToFile(
  body: ReadableStream<Uint8Array> | null,
  outputPath: string
): Promise<number> {
  if (!body) throw new Error("没有收到音频内容");
  const handle = await open(outputPath, "wx");
  const reader = body.getReader();
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_AUDIO_UPLOAD_BYTES) throw new Error("音频超过 100 MiB 上限");
      await handle.write(value);
    }
  } finally {
    reader.releaseLock();
    await handle.close();
  }
  if (total === 0) throw new Error("上传的音频为空");
  return total;
}
