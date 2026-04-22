import { fetchNeteasePlaylist, type NeteaseTrack } from "./netease";
import { searchYoutubeForSong } from "./song-search";
import { processSong, type SongInput } from "./song-pipeline";
import type { IngestSummary, ProgressEvent } from "./ingest";

export type NeteaseIngestParams = {
  playlistUrl: string;
  limit?: number;
  delayMs?: number;
  onProgress?: (event: ProgressEvent) => void;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runNeteaseIngest(
  params: NeteaseIngestParams
): Promise<IngestSummary> {
  const onProgress = params.onProgress ?? (() => {});
  const delayMs = params.delayMs ?? 1500;

  const playlist = await fetchNeteasePlaylist(params.playlistUrl);
  const tracks =
    params.limit && params.limit > 0
      ? playlist.tracks.slice(0, params.limit)
      : playlist.tracks;

  onProgress({
    kind: "list-start",
    total: tracks.length,
    source: "netease",
  });

  const summary: IngestSummary = {
    total: tracks.length,
    skippedNotSong: 0,
    skippedShort: 0,
    skippedExistingYoutube: 0,
    skippedExistingLrclib: 0,
    succeeded: [],
    placeholders: [],
    failed: [],
  };

  for (const track of tracks) {
    await processOneTrack(track, summary, onProgress);
    await sleep(delayMs);
  }

  return summary;
}

async function processOneTrack(
  track: NeteaseTrack,
  summary: IngestSummary,
  onProgress: (event: ProgressEvent) => void
): Promise<void> {
  const query = [track.artist, track.title].filter(Boolean).join(" ");
  const fallbackId = `netease-${track.id}`;

  onProgress({ kind: "search-video", query, status: "searching" });

  let video: Awaited<ReturnType<typeof searchYoutubeForSong>> = null;
  try {
    video = await searchYoutubeForSong({
      title: track.title,
      artist: track.artist,
    });
  } catch {
    video = null;
  }

  onProgress(
    video
      ? {
          kind: "search-video",
          query,
          status: "found",
          videoId: video.id,
        }
      : { kind: "search-video", query, status: "not-found" }
  );

  const songInput: SongInput = {
    title: track.title,
    artist: track.artist,
    video,
    source: "netease",
  };

  const outcome = await processSong(songInput);
  const eventVideoId = video?.id ?? fallbackId;

  switch (outcome.kind) {
    case "ok":
      summary.succeeded.push({
        videoId: eventVideoId,
        songId: outcome.songId,
        songName: outcome.songName,
        artistName: outcome.artistName,
        lines: outcome.lines,
        hasTimestamps: outcome.hasTimestamps,
      });
      onProgress({
        kind: "ok",
        videoId: eventVideoId,
        songId: outcome.songId,
        songName: outcome.songName,
        artistName: outcome.originalArtist,
        lines: outcome.lines,
        hasTimestamps: outcome.hasTimestamps,
      });
      break;
    case "placeholder":
      summary.placeholders.push({
        videoId: eventVideoId,
        songId: outcome.songId,
        songName: outcome.songName,
      });
      onProgress({
        kind: "placeholder",
        videoId: eventVideoId,
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
        videoId: eventVideoId,
        songName: outcome.songName,
        reason: outcome.reason,
      });
      break;
    case "fail":
      summary.failed.push({
        videoId: eventVideoId,
        title: outcome.songName,
        reason: outcome.reason,
      });
      onProgress({
        kind: "fail",
        videoId: eventVideoId,
        songName: outcome.songName,
        reason: outcome.reason,
      });
      break;
  }
}
