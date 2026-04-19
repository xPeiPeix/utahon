import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { listVocab } from "@/lib/vocabulary";
import { VocabCard } from "@/components/vocab-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { VoicePicker } from "@/components/voice-picker";

export const dynamic = "force-dynamic";

export default function VocabularyPage() {
  const entries = listVocab();

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <header className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-6 sm:pb-8 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link
            href="/"
            aria-label="返回首页"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-400/20 shrink-0 hover:scale-105 active:scale-95 transition-transform"
          >
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
              词汇本{" "}
              <span className="font-normal text-zinc-400">({entries.length})</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 truncate">
              在歌词页点 ⭐ 收藏 这里随时复习
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
          <VoicePicker />
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-24">
        {entries.length === 0 ? (
          <div className="text-center py-20 sm:py-24">
            <div className="text-5xl sm:text-6xl mb-4">📚</div>
            <p className="text-zinc-500 dark:text-zinc-400 mb-5">
              词汇本还空空的喵
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 font-medium text-sm"
            >
              去歌词页 点 ⭐ 收藏第一个词
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {entries.map((entry, i) => (
              <VocabCard key={entry.id} entry={entry} index={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
