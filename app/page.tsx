import Link from "next/link";
import { Plus, Music2, BookOpen } from "lucide-react";
import { listSongs } from "@/lib/songs";
import { SongCard } from "@/components/song-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { VoicePicker } from "@/components/voice-picker";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const songs = listSongs();

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <header className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-6 sm:pb-8 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center shadow-lg shadow-amber-400/20 shrink-0">
            <Music2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
              Utahon <span className="font-normal text-zinc-400">歌本</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 truncate">
              从喜欢的歌 学日语
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Link
            href="/vocabulary"
            aria-label="词汇本"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 transition rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">词汇本</span>
          </Link>
          <VoicePicker />
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-24">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            我的歌曲{" "}
            <span className="text-zinc-400 font-normal">({songs.length})</span>
          </h2>
          <Link
            href="/new"
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium shadow-lg shadow-zinc-900/10 hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            <Plus className="w-4 h-4" />
            新建
          </Link>
        </div>

        {songs.length === 0 ? (
          <div className="text-center py-20 sm:py-24">
            <div className="text-5xl sm:text-6xl mb-4">🎵</div>
            <p className="text-zinc-500 dark:text-zinc-400 mb-5">
              歌本还空空的喵
            </p>
            <Link
              href="/new"
              className="inline-flex items-center gap-1.5 text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              导入第一首喜欢的歌
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {songs.map((song) => (
              <SongCard key={song.id} song={song} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
