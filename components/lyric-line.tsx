"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Volume2, Copy, Check, Music4, Star, Loader2 } from "lucide-react";
import type { AnalyzedLine, Token } from "@/types/lyrics";
import { cn } from "@/lib/utils";
import { speak } from "@/lib/tts";
import { usePlayer } from "./player-context";
import { useSongInfo } from "./song-info-context";

type StarState = "idle" | "saving" | "saved" | "err";

function hasKanji(text: string): boolean {
  return /[\u3400-\u9FFF]/.test(text);
}

function TokenChip({ token }: { token: Token }) {
  const [open, setOpen] = useState(false);
  const [starState, setStarState] = useState<StarState>("idle");
  const songInfo = useSongInfo();
  const showFurigana =
    hasKanji(token.surface) && token.furigana && token.furigana !== token.surface;

  async function handleStar(e: React.MouseEvent) {
    e.stopPropagation();
    if (starState === "saving" || starState === "saved") return;
    setStarState("saving");
    try {
      const res = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surface: token.surface,
          furigana: token.furigana,
          romaji: token.romaji,
          meaning: token.meaning,
          pos: token.pos,
          sourceSongId: songInfo?.songId ?? null,
          sourceSongTitle: songInfo?.songTitle ?? "",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStarState("saved");
    } catch {
      setStarState("err");
      setTimeout(() => setStarState("idle"), 2000);
    }
  }

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "px-1 py-0.5 rounded-md align-baseline",
          "transition-colors duration-150 cursor-pointer touch-manipulation",
          "hover:bg-amber-100/70 dark:hover:bg-amber-400/10",
          "active:bg-amber-200 dark:active:bg-amber-400/30",
          open && "bg-amber-100 dark:bg-amber-400/20"
        )}
      >
        {showFurigana ? (
          <ruby>
            {token.surface}
            <rt>{token.furigana}</rt>
          </ruby>
        ) : (
          <span>{token.surface}</span>
        )}
      </button>

      {open && (
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20",
            "min-w-[11rem] w-max max-w-[calc(100vw-2rem)] sm:max-w-[20rem] p-3 rounded-xl",
            "bg-white dark:bg-zinc-900 shadow-xl ring-1 ring-zinc-200 dark:ring-zinc-800",
            "text-left text-sm font-normal whitespace-normal"
          )}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {token.surface}
              </span>
              {token.furigana && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
                  {token.furigana}
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  speak(token.surface);
                }}
                aria-label="朗读"
                className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-400/10 transition"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleStar}
                disabled={starState === "saving"}
                aria-label={
                  starState === "saved"
                    ? "已收藏"
                    : starState === "err"
                    ? "收藏失败"
                    : "收藏到词汇本"
                }
                className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center transition",
                  starState === "saved"
                    ? "text-amber-500"
                    : starState === "err"
                    ? "text-rose-500"
                    : "text-zinc-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-400/10"
                )}
              >
                {starState === "saving" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Star
                    className="w-3.5 h-3.5"
                    fill={starState === "saved" ? "currentColor" : "none"}
                  />
                )}
              </button>
            </div>
          </div>
          {token.romaji && (
            <div className="text-xs italic text-zinc-500 dark:text-zinc-400 mb-1">
              {token.romaji}
            </div>
          )}
          <div className="text-zinc-800 dark:text-zinc-200 mb-1">{token.meaning}</div>
          <div className="inline-block px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[0.7rem] text-zinc-600 dark:text-zinc-400">
            {token.pos}
          </div>
        </motion.span>
      )}
    </span>
  );
}

export function LyricLine({ line, index }: { line: AnalyzedLine; index: number }) {
  const [copied, setCopied] = useState(false);
  const player = usePlayer();
  const canPlaySegment = Boolean(player) && line.endTime - line.startTime > 0.3;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(line.original);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — clipboard may be unavailable over http
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className="group relative py-5 pr-20 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
    >
      <div
        className={cn(
          "absolute top-5 right-0 flex gap-0.5",
          "opacity-40 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100",
          "transition-opacity duration-200"
        )}
      >
        {canPlaySegment && (
          <button
            type="button"
            onClick={() => player?.playSegment(line.startTime, line.endTime)}
            aria-label="播放原唱片段"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
          >
            <Music4 className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => speak(line.original)}
          aria-label="朗读本行"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-400/10 transition"
        >
          <Volume2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="复制原文"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-400/10 transition"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="text-xl sm:text-2xl font-medium leading-[2.4] mb-2 text-zinc-900 dark:text-zinc-100">
        {line.tokens.length > 0 ? (
          line.tokens.map((t, i) => <TokenChip key={i} token={t} />)
        ) : (
          <span>{line.original}</span>
        )}
      </div>
      {line.romaji && (
        <div className="text-xs sm:text-sm italic text-zinc-400 dark:text-zinc-500 mb-1 tracking-wide break-words">
          {line.romaji}
        </div>
      )}
      <div className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 break-words">
        {line.translation}
      </div>
    </motion.div>
  );
}
