import { Buffer } from "buffer";
import { getPractice, setPracticeFailure } from "@/lib/practice";

const songId = process.argv[2];
const sha256 = process.argv[3];
const updatedAt = Number(process.argv[4]);
const encoded = process.argv[5];
if (!songId || !sha256 || !Number.isInteger(updatedAt) || !encoded) {
  throw new Error("用法：npm run practice:fail -- <song-id> <audio-sha256> <updated-at> <base64-message>");
}
if (!getPractice(songId)) throw new Error("歌曲不存在");
const message = Buffer.from(encoded, "base64url").toString("utf8");
const changed = setPracticeFailure(songId, sha256, updatedAt, message || "本地分析失败");
console.log(JSON.stringify({ songId, status: changed ? "failed" : "unchanged" }));
