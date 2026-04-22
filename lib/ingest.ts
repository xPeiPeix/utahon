import { listChannelVideos } from "@/scripts/lib/yt-dlp";
import { extractSongName, isLikelySong } from "@/scripts/lib/title-parser";
import { processSong, type SongInput } from "./song-pipeline";

export type IngestParams = {
  channelUrl: string;
  limit?: number;
  delayMs?: number;
  artistHint?: string;
  onProgress?: (event: ProgressEvent) => void;
};

export type ProgressEvent =
  | {
      kind: "list-start";
      total: number;
      source?: "channel" | "netease";
    }
  | {
      kind: "search-video";
      query: string;
      status: "searching" | "found" | "not-found";
      videoId?: string;
    }
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

export async function runIngest(params: IngestParams): Promise<IngestSummary> {
  const onProgress = params.onProgress ?? (() => {});
  const delayMs = params.delayMs ?? 1500;
  const artistHint = params.artistHint ?? "";

  const videos = await listChannelVideos(params.channelUrl, params.limit);
  onProgress({ kind: "list-start", total: videos.length, source: "channel" });

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

    const songInput: SongInput = {
      title: songName,
      artist: artistHint,
      video: {
        id: v.id,
        url: `https://www.youtube.com/watch?v=${v.id}`,
        uploader: v.uploader,
        duration: v.duration,
      },
      source: "channel",
    };

    const outcome = await processSong(songInput);

    switch (outcome.kind) {
      case "ok":
        summary.succeeded.push({
          videoId: v.id,
          songId: outcome.songId,
          songName: outcome.songName,
          artistName: outcome.artistName,
          lines: outcome.lines,
          hasTimestamps: outcome.hasTimestamps,
        });
        onProgress({
          kind: "ok",
          videoId: v.id,
          songId: outcome.songId,
          songName: outcome.songName,
          artistName: outcome.originalArtist,
          lines: outcome.lines,
          hasTimestamps: outcome.hasTimestamps,
        });
        break;
      case "placeholder":
        summary.placeholders.push({
          videoId: v.id,
          songId: outcome.songId,
          songName: outcome.songName,
        });
        onProgress({
          kind: "placeholder",
          videoId: v.id,
          songId: outcome.songId,
          songName: outcome.songName,
        });
        break;
      case "skip-existing":
        if (outcome.reason === "youtube_id") {
          summary.skippedExistingYoutube++;
        } else {
          summary.skippedExistingLrclib++;
        }
        onProgress({
          kind: "skip-existing",
          videoId: v.id,
          songName: outcome.songName,
          reason: outcome.reason,
        });
        break;
      case "fail":
        summary.failed.push({
          videoId: v.id,
          title: outcome.songName,
          reason: outcome.reason,
        });
        onProgress({
          kind: "fail",
          videoId: v.id,
          songName: outcome.songName,
          reason: outcome.reason,
        });
        break;
    }

    await sleep(delayMs);
  }

  return summary;
}
