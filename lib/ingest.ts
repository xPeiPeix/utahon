import { listChannelVideos } from "@/scripts/lib/yt-dlp";
import { extractSongName, isLikelySong } from "@/scripts/lib/title-parser";
import { fetchLrclibLyrics } from "./lrclib";
import { analyzeLyrics } from "./analyze-pipeline";
import { createSong, existsByYoutubeId, existsByLrclibId } from "./songs";
import type { AnalyzedSong } from "@/types/lyrics";

export type IngestParams = {
  channelUrl: string;
  limit?: number;
  commit: boolean;
  delayMs?: number;
  artistHint?: string;
  onProgress?: (event: ProgressEvent) => void;
};

export type PendingInsert = {
  videoId: string;
  title: string;
  artist: string;
  lyrics: string;
  analyzed: AnalyzedSong;
  youtubeUrl: string;
  lrclibId: number;
};

export type Placeholder = {
  videoId: string;
  title: string;
  youtubeUrl: string;
};

export type ProgressEvent =
  | { kind: "list-start"; total: number }
  | { kind: "skip-not-song"; videoId: string; title: string }
  | {
      kind: "skip-short";
      videoId: string;
      title: string;
      duration: number | null;
    }
  | {
      kind: "skip-existing";
      videoId: string;
      songName: string;
      reason: "youtube_id" | "lrclib_id";
    }
  | { kind: "skip-no-lyrics"; videoId: string; songName: string }
  | {
      kind: "ok";
      videoId: string;
      songId?: string;
      songName: string;
      artistName: string;
      lines: number;
      hasTimestamps: boolean;
    }
  | { kind: "fail"; videoId: string; songName: string; reason: string };

export type Succeeded = {
  videoId: string;
  songId?: string;
  songName: string;
  artistName: string;
  lines: number;
  hasTimestamps: boolean;
};

export type Failed = { videoId: string; title: string; reason: string };

export type IngestSummary = {
  total: number;
  skippedNotSong: number;
  skippedShort: number;
  skippedExistingYoutube: number;
  skippedExistingLrclib: number;
  skippedNoLyrics: number;
  succeeded: Succeeded[];
  failed: Failed[];
  pendingInserts: PendingInsert[];
  placeholders: Placeholder[];
  commit: boolean;
};

const MIN_DURATION_SECONDS = 60;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runIngest(params: IngestParams): Promise<IngestSummary> {
  const onProgress = params.onProgress ?? (() => {});
  const delayMs = params.delayMs ?? 1500;
  const artistHint = params.artistHint ?? "";

  const videos = await listChannelVideos(params.channelUrl, params.limit);
  onProgress({ kind: "list-start", total: videos.length });

  const summary: IngestSummary = {
    total: videos.length,
    skippedNotSong: 0,
    skippedShort: 0,
    skippedExistingYoutube: 0,
    skippedExistingLrclib: 0,
    skippedNoLyrics: 0,
    succeeded: [],
    failed: [],
    pendingInserts: [],
    placeholders: [],
    commit: params.commit,
  };

  for (const v of videos) {
    const songName = extractSongName(v.title);

    if (!isLikelySong(v.title)) {
      summary.skippedNotSong++;
      onProgress({ kind: "skip-not-song", videoId: v.id, title: v.title });
      continue;
    }

    if (v.duration === null || v.duration < MIN_DURATION_SECONDS) {
      summary.skippedShort++;
      onProgress({
        kind: "skip-short",
        videoId: v.id,
        title: v.title,
        duration: v.duration,
      });
      continue;
    }

    if (existsByYoutubeId(v.id)) {
      summary.skippedExistingYoutube++;
      onProgress({
        kind: "skip-existing",
        videoId: v.id,
        songName,
        reason: "youtube_id",
      });
      continue;
    }

    try {
      const lrclib = await fetchLrclibLyrics({
        title: songName,
        artist: artistHint,
      });
      if (!lrclib) {
        summary.skippedNoLyrics++;
        const youtubeUrl = `https://www.youtube.com/watch?v=${v.id}`;
        summary.failed.push({
          videoId: v.id,
          title: songName,
          reason: "lrclib 无歌词",
        });
        summary.placeholders.push({
          videoId: v.id,
          title: songName,
          youtubeUrl,
        });
        onProgress({ kind: "skip-no-lyrics", videoId: v.id, songName });
        await sleep(delayMs);
        continue;
      }

      if (existsByLrclibId(lrclib.id)) {
        summary.skippedExistingLrclib++;
        onProgress({
          kind: "skip-existing",
          videoId: v.id,
          songName,
          reason: "lrclib_id",
        });
        await sleep(delayMs);
        continue;
      }

      const youtubeUrl = `https://www.youtube.com/watch?v=${v.id}`;
      const analyzed = await analyzeLyrics({
        lyrics: lrclib.lyrics,
        title: songName,
        artist: lrclib.artistName,
        youtubeUrl,
      });

      let songId: string | undefined;
      if (params.commit) {
        songId = createSong({
          title: songName,
          artist: lrclib.artistName,
          lyrics: lrclib.lyrics,
          analyzed,
          youtubeUrl,
          lrclibId: lrclib.id,
        });
      } else {
        summary.pendingInserts.push({
          videoId: v.id,
          title: songName,
          artist: lrclib.artistName,
          lyrics: lrclib.lyrics,
          analyzed,
          youtubeUrl,
          lrclibId: lrclib.id,
        });
      }

      summary.succeeded.push({
        videoId: v.id,
        songId,
        songName,
        artistName: lrclib.artistName,
        lines: analyzed.lines.length,
        hasTimestamps: lrclib.hasTimestamps,
      });
      onProgress({
        kind: "ok",
        videoId: v.id,
        songId,
        songName,
        artistName: lrclib.artistName,
        lines: analyzed.lines.length,
        hasTimestamps: lrclib.hasTimestamps,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      summary.failed.push({ videoId: v.id, title: songName, reason });
      onProgress({ kind: "fail", videoId: v.id, songName, reason });
    }

    await sleep(delayMs);
  }

  return summary;
}
