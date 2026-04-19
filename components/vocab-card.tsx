"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trash2, Volume2 } from "lucide-react";
import type { VocabEntry } from "@/lib/vocabulary";
import { cn } from "@/lib/utils";
import { speak } from "@/lib/tts";

function hasKanji(text: string): boolean {
  return /[\u3400-\u9FFF]/.test(text);
}

export function VocabCard({ entry, index }: { entry: VocabEntry; index: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showFurigana =
    hasKanji(entry.surface) && entry.furigana && entry.furigana !== entry.surface;

  async function handleDelete() {
    if (!confirm(`从词汇本移除「${entry.surface}」？`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/vocabulary/${entry.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setHidden(true);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  if (hidden) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.25 }}
      className="group relative p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-amber-300 dark:hover:border-amber-400/40 hover:shadow-md transition"
    >
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {showFurigana ? (
            <ruby>
              {entry.surface}
              <rt className="text-[0.55em] text-zinc-500 dark:text-zinc-400">
                {entry.furigana}
              </rt>
            </ruby>
          ) : (
            entry.surface
          )}
        </span>
        {!showFurigana && entry.furigana && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {entry.furigana}
          </span>
        )}
        <button
          type="button"
          onClick={() => speak(entry.surface)}
          aria-label="朗读"
          className="ml-auto w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-400/10 transition"
        >
          <Volume2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {entry.romaji && (
        <div className="text-xs italic text-zinc-500 dark:text-zinc-400 mb-1">
          {entry.romaji}
        </div>
      )}

      {entry.meaning && (
        <div className="text-sm text-zinc-800 dark:text-zinc-200 mb-2 break-words">
          {entry.meaning}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2 min-w-0">
          {entry.pos && (
            <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[0.65rem] text-zinc-600 dark:text-zinc-400 shrink-0">
              {entry.pos}
            </span>
          )}
          {entry.sourceSongTitle &&
            (entry.sourceSongId ? (
              <Link
                href={`/song/${entry.sourceSongId}`}
                className="text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-amber-500 truncate"
              >
                · {entry.sourceSongTitle}
              </Link>
            ) : (
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                · {entry.sourceSongTitle}
              </span>
            ))}
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          aria-label="删除"
          className={cn(
            "w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 transition shrink-0",
            "hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10",
            "opacity-0 group-hover:opacity-100 sm:focus:opacity-100",
            "max-sm:opacity-100"
          )}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {error && (
        <p className="mt-2 text-xs text-rose-500">{error}</p>
      )}
    </motion.div>
  );
}
