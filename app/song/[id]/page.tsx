import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Music2 } from "lucide-react";
import { getSong } from "@/lib/songs";
import { LyricLine } from "@/components/lyric-line";
import { ThemeToggle } from "@/components/theme-toggle";
import { VoicePicker } from "@/components/voice-picker";
import { DeleteSongButton } from "@/components/delete-song-button";
import { YouTubePlayerFrame } from "@/components/youtube-player";
import { SongInfoProvider } from "@/components/song-info-context";
import { RetranscribeButton } from "@/components/retranscribe-button";

export const dynamic = "force-dynamic";

export default async function SongPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const song = getSong(id);
  if (!song) notFound();

  const videoId = song.analyzed.youtubeId || song.youtubeId || "";

  const lyricList = (
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {song.analyzed.lines.map((line, i) => (
        <LyricLine key={i} line={line} index={i} />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <header className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-6 sm:pb-8 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link
            href="/"
            aria-label="返回列表"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center shadow-lg shadow-amber-400/20 shrink-0 hover:scale-105 active:scale-95 transition-transform"
          >
            <Music2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
              {song.title}
            </h1>
            <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {song.artist} · {song.linesCount} 行
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Link
            href="/"
            aria-label="返回"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">返回</span>
          </Link>
          <RetranscribeButton songId={song.id} hasYoutube={Boolean(videoId)} />
          <DeleteSongButton songId={song.id} songTitle={song.title} />
          <VoicePicker />
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-24">
        <SongInfoProvider songId={song.id} songTitle={song.title}>
          {videoId ? (
            <YouTubePlayerFrame videoId={videoId}>{lyricList}</YouTubePlayerFrame>
          ) : (
            lyricList
          )}
        </SongInfoProvider>
      </main>
    </div>
  );
}
