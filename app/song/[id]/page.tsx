import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Music2, Mic } from "lucide-react";
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

  const isEmpty = song.analyzed.lines.length === 0;

  const lyricList = isEmpty ? (
    <div className="p-8 sm:p-12 text-center rounded-2xl bg-amber-50/50 dark:bg-amber-400/5 border border-amber-200 dark:border-amber-400/20">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-rose-400 to-amber-400 flex items-center justify-center mb-4 shadow-lg shadow-rose-400/20">
        <Mic className="w-7 h-7 text-white" />
      </div>
      <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
        还没有歌词的说
      </p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
        这首歌 lrclib 没收录 点右上角 🎤 重转按钮 Rin 用 Gemini 多模态听音频帮主人转录喵～
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-3">
        准确率 ~80%  可能要 30-60 秒
      </p>
    </div>
  ) : (
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
