import { mkdtemp, mkdir, rename, rm } from "fs/promises";
import os from "os";
import path from "path";
import {
  MAX_AUDIO_UPLOAD_BYTES,
  normalizePracticeAudio,
  probeAudio,
  sha256File,
  writeRequestBodyToFile,
} from "@/lib/practice-audio";
import {
  getPractice,
  practiceVersionDir,
  setPracticeAudio,
  songExists,
  trashPracticeVersion,
} from "@/lib/practice";

export const runtime = "nodejs";
export const maxDuration = 300;

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  let previousAudioSha256 = "";
  try {
    if (!songExists(id)) return Response.json({ error: "歌曲不存在" }, { status: 404 });
    previousAudioSha256 = getPractice(id)?.audioSha256 ?? "";
  } catch (error) {
    const message = error instanceof Error ? error.message : "歌曲 ID 无效";
    return Response.json({ error: message }, { status: 400 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_AUDIO_UPLOAD_BYTES) {
    return Response.json({ error: "音频超过 100 MiB 上限" }, { status: 413 });
  }
  const contentType = request.headers.get("content-type")?.split(";", 1)[0] ?? "";
  if (contentType && !contentType.startsWith("audio/") && contentType !== "application/octet-stream") {
    return Response.json({ error: "只接受音频文件" }, { status: 415 });
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "utahon-upload-"));
  const uploaded = path.join(tempDir, "upload.bin");
  const normalized = path.join(tempDir, "mix.m4a");
  try {
    await writeRequestBodyToFile(request.body, uploaded);
    await probeAudio(uploaded);
    await normalizePracticeAudio(uploaded, normalized);
    const { durationSec } = await probeAudio(normalized);
    const sha256 = await sha256File(normalized);
    const targetDir = practiceVersionDir(id, sha256);
    await mkdir(targetDir, { recursive: true });
    const staged = path.join(targetDir, `.mix-${process.pid}-${Date.now()}.tmp`);
    await rename(normalized, staged);
    await rename(staged, path.join(targetDir, "mix.m4a"));
    const record = setPracticeAudio(id, sha256, durationSec);
    if (previousAudioSha256 && previousAudioSha256 !== sha256) {
      try {
        trashPracticeVersion(id, previousAudioSha256);
      } catch (cleanupError) {
        console.error("[utahon] failed to archive replaced practice audio:", cleanupError);
      }
    }
    return Response.json(record, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "音频上传失败";
    const status = message.includes("100 MiB") ? 413 : 400;
    return Response.json({ error: message }, { status });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
