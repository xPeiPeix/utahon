import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { anchorChordsToLines, validatePracticeData } from "@/lib/practice-schema";
import {
  PRACTICE_ROOT,
  getPractice,
  importPracticeData,
  practiceTrackPath,
  setPracticeFailure,
} from "@/lib/practice";
import { getSong } from "@/lib/songs";
import type { PracticePackManifestV1, PracticeTrack } from "@/types/practice";

const INCOMING_ROOT = path.join(process.cwd(), "data", "incoming");
const STEMS = new Set<PracticeTrack>(["vocals", "drums", "bass", "other"]);
const SHA256_RE = /^[a-f0-9]{64}$/;
const FILE_NAME_RE = /^[A-Za-z0-9._-]{1,120}$/;

function fail(message: string): never {
  throw new Error(message);
}

function sha256(filePath: string): string {
  const hash = createHash("sha256");
  const handle = fs.openSync(filePath, "r");
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let read = 0;
    do {
      read = fs.readSync(handle, buffer, 0, buffer.length, null);
      if (read > 0) hash.update(buffer.subarray(0, read));
    } while (read > 0);
  } finally {
    fs.closeSync(handle);
  }
  return hash.digest("hex");
}

function safeIncomingDirectory(rawPath: string): string {
  fs.mkdirSync(INCOMING_ROOT, { recursive: true });
  const incoming = fs.realpathSync(INCOMING_ROOT);
  let directory: string;
  try {
    directory = fs.realpathSync(path.resolve(rawPath));
  } catch {
    fail("分析包目录不存在");
  }
  if (directory === incoming || !directory.startsWith(`${incoming}${path.sep}`)) {
    fail("分析包必须位于 data/incoming 的独立子目录");
  }
  if (!fs.statSync(directory).isDirectory()) fail("分析包路径不是目录");
  return directory;
}

function readManifest(directory: string): PracticePackManifestV1 {
  const manifestPath = path.join(directory, "manifest.json");
  const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as PracticePackManifestV1;
  if (raw.version !== 1) fail("不支持的分析包版本");
  if (!raw.songId || !SHA256_RE.test(raw.audioSha256)) fail("分析包标识无效");
  if (!Number.isInteger(raw.baseUpdatedAt) || raw.baseUpdatedAt < 0) fail("分析包基线版本无效");
  if (!raw.data || !raw.files || typeof raw.files !== "object") fail("分析包内容不完整");
  return raw;
}

function validatedStemFiles(
  directory: string,
  manifest: PracticePackManifestV1
): Array<{ track: PracticeTrack; source: string; target: string }> {
  const files: Array<{ track: PracticeTrack; source: string; target: string }> = [];
  for (const [rawTrack, descriptor] of Object.entries(manifest.files)) {
    const track = rawTrack as PracticeTrack;
    if (!STEMS.has(track) || !descriptor) fail(`不允许导入音轨：${rawTrack}`);
    if (!FILE_NAME_RE.test(descriptor.name) || !SHA256_RE.test(descriptor.sha256)) {
      fail(`音轨 ${rawTrack} 的文件信息无效`);
    }
    const source = path.join(directory, descriptor.name);
    if (!fs.statSync(source).isFile()) fail(`音轨文件不存在：${descriptor.name}`);
    if (sha256(source) !== descriptor.sha256) fail(`音轨校验失败：${descriptor.name}`);
    files.push({
      track,
      source,
      target: practiceTrackPath(manifest.songId, manifest.audioSha256, track),
    });
  }
  return files;
}

function main(): void {
  const rawDirectory = process.argv[2];
  if (!rawDirectory) fail("用法：npm run practice:import -- data/incoming/<pack>");
  const directory = safeIncomingDirectory(rawDirectory);
  const manifest = readManifest(directory);
  try {
    const practice = getPractice(manifest.songId);
    const song = getSong(manifest.songId);
    if (!practice || !song) fail("歌曲不存在");
    if (practice.audioSha256 !== manifest.audioSha256) fail("服务器上的练习音频已经更换，请重新分析");
    if (practice.updatedAt !== manifest.baseUpdatedAt) {
      fail("分析期间练习谱已在网页中修改；为避免覆盖新内容，请重新运行分析");
    }

    const data = validatePracticeData(manifest.data, song.durationSec);
    data.chords = anchorChordsToLines(data.chords, song.analyzed.lines);
    const stemFiles = validatedStemFiles(directory, manifest);
    if (data.stems.some(
      (track) =>
        track !== "mix" &&
        !stemFiles.some((file) => file.track === track) &&
        !fs.existsSync(practiceTrackPath(manifest.songId, manifest.audioSha256, track))
    )) {
      fail("练习数据声明了缺失的分轨文件");
    }

    for (const file of stemFiles) {
      fs.mkdirSync(path.dirname(file.target), { recursive: true });
      const staged = `${file.target}.${process.pid}.${Date.now()}.tmp`;
      fs.copyFileSync(file.source, staged);
      fs.renameSync(staged, file.target);
    }
    const result = importPracticeData(
      manifest.songId,
      manifest.audioSha256,
      manifest.baseUpdatedAt,
      data
    );
    fs.rmSync(directory, { recursive: true, force: true });
    console.log(
      JSON.stringify({
        songId: result.songId,
        status: result.status,
        chords: result.data.chords.length,
        sections: result.data.sections.length,
        stems: result.data.stems,
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "分析包导入失败";
    try {
      setPracticeFailure(
        manifest.songId,
        manifest.audioSha256,
        manifest.baseUpdatedAt,
        message
      );
    } catch {
      // The original validation error is more useful.
    }
    throw error;
  }
}

if (!fs.existsSync(PRACTICE_ROOT)) fs.mkdirSync(PRACTICE_ROOT, { recursive: true });
main();
