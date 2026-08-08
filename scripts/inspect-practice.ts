import path from "path";
import { getPractice, practiceTrackPath } from "@/lib/practice";
import { getSong } from "@/lib/songs";

const songId = process.argv[2];
if (!songId) throw new Error("用法：npm run practice:inspect -- <song-id>");
const song = getSong(songId);
const practice = getPractice(songId);
if (!song || !practice) throw new Error("歌曲不存在");
if (!practice.audioSha256 || !practice.hasAudio) throw new Error("这首歌还没有自有练习音频");

console.log(
  JSON.stringify({
    songId,
    title: song.title,
    artist: song.artist,
    durationSec: song.durationSec,
    audioSha256: practice.audioSha256,
    updatedAt: practice.updatedAt,
    audioPath: path.relative(
      process.cwd(),
      practiceTrackPath(songId, practice.audioSha256, "mix")
    ),
    data: practice.data,
  })
);
