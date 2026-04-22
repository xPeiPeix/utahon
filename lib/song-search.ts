import { searchYoutube } from "@/scripts/lib/yt-dlp";
import type { VideoRef } from "./song-pipeline";

const TOPIC_SUFFIX = /\s+-\s+Topic\s*$/i;
const EXCLUDE_RE =
  /\b(live|mv|cover|カバー|歌ってみた|ライブ|リメイク|ピアノ|piano|instrumental|karaoke|カラオケ)\b/i;

function toVideoRef(v: { id: string; uploader: string; duration: number | null }): VideoRef {
  return {
    id: v.id,
    url: `https://www.youtube.com/watch?v=${v.id}`,
    uploader: v.uploader,
    duration: v.duration,
  };
}

export async function searchYoutubeForSong(params: {
  title: string;
  artist: string;
}): Promise<VideoRef | null> {
  const title = params.title.trim();
  const artist = params.artist.trim();
  if (!title) return null;

  const q1 = [artist, title, "Topic"].filter(Boolean).join(" ");
  try {
    const r1 = await searchYoutube(q1, 5);
    const topic = r1.find((v) => TOPIC_SUFFIX.test(v.uploader));
    if (topic) return toVideoRef(topic);
  } catch {
    // fall through to pass 2
  }

  const q2 = [artist, title].filter(Boolean).join(" ");
  try {
    const r2 = await searchYoutube(q2, 3);
    const candidate = r2.find((v) => {
      if (EXCLUDE_RE.test(v.title)) return false;
      if (v.duration !== null && v.duration > 600) return false;
      return true;
    });
    if (candidate) return toVideoRef(candidate);
  } catch {
    return null;
  }

  return null;
}
