import { listChannelVideos } from "@/scripts/lib/yt-dlp";
import { extractSongName, isLikelySong } from "@/scripts/lib/title-parser";
import { fetchLrclibLyrics } from "./lrclib";
import { analyzeLyrics } from "./analyze-pipeline";
import { createSong, existsByYoutubeId, existsByLrclibId } from "./songs";
import { extractYoutubeId } from "./youtube";
import type { AnalyzedSong } from "@/types/lyrics";

export type IngestParams = {
  channelUrl: string;
  limit?: number;
  delayMs?: number;
  artistHint?: string;
  onProgress?: (event: ProgressEvent) => void;
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
  | {
      kind: "placeholder";
      videoId: string;
      songId: string;
      songName: string;
    }
  | {
      kind: "ok";
      videoId: string;
      songId: string;
      songName: string;
      artistName: string;
      lines: number;
      hasTimestamps: boolean;
    }
  | { kind: "fail"; videoId: string; songName: string; reason: string };

export type Succeeded = {
  videoId: string;
  songId: string;
  songName: string;
  artistName: string;
  lines: number;
  hasTimestamps: boolean;
};

export type PlaceholderInserted = {
  videoId: string;
  songId: string;
  songName: string;
};

export type Failed = { videoId: string; title: string; reason: string };

export type IngestSummary = {
  total: number;
  skippedNotSong: number;
  skippedShort: number;
  skippedExistingYoutube: number;
  skippedExistingLrclib: number;
  succeeded: Succeeded[];
  placeholders: PlaceholderInserted[];
  failed: Failed[];
};

const MIN_DURATION_SECONDS = 60;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function insertPlaceholder(params: {
  videoId: string;
  title: string;
  youtubeUrl: string;
}): string {
  const emptyAnalyzed: AnalyzedSong = {
    title: params.title,
    artist: "",
    youtubeUrl: params.youtubeUrl,
    youtubeId: extractYoutubeId(params.youtubeUrl),
    lines: [],
  };
  return createSong({
    title: params.title,
    artist: "",
    lyrics: "",
    analyzed: emptyAnalyzed,
    youtubeUrl: params.youtubeUrl,
    source: "channel",
  });
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
    succeeded: [],
    placeholders: [],
    failed: [],
  };

  for (const v of videos) {
    const songName = extractSongName(v.title);
    const youtubeUrl = `https://www.youtube.com/watch?v=${v.id}`;

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
        const songId = insertPlaceholder({
          videoId: v.id,
          title: songName,
          youtubeUrl,
        });
        summary.placeholders.push({ videoId: v.id, songId, songName });
        onProgress({ kind: "placeholder", videoId: v.id, songId, songName });
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

      const uploader = v.uploader?.trim() || "";
      const displayArtist = uploader || lrclib.artistName;
      const analyzed = await analyzeLyrics({
        lyrics: lrclib.lyrics,
        title: songName,
        artist: displayArtist,
        youtubeUrl,
      });
      analyzed.originalArtist = lrclib.artistName;

      const songId = createSong({
        title: songName,
        artist: displayArtist,
        originalArtist: lrclib.artistName,
        lyrics: lrclib.lyrics,
        analyzed,
        youtubeUrl,
        lrclibId: lrclib.id,
        source: "channel",
      });

      summary.succeeded.push({
        videoId: v.id,
        songId,
        songName,
        artistName: displayArtist,
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
