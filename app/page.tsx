"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music2, Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { LyricLine } from "@/components/lyric-line";
import { ThemeToggle } from "@/components/theme-toggle";
import { VoicePicker } from "@/components/voice-picker";
import type { AnalyzedSong } from "@/types/lyrics";

const DEMO_LYRICS = `うるさく鳴いた文字盤を見てた
きっときっと鏡越し 8時過ぎのにおい
しらけた顔 変わってなくてよかった`;

type State =
  | { kind: "idle" }
  | { kind: "analyzing" }
  | { kind: "result"; song: AnalyzedSong }
  | { kind: "error"; message: string };

export default function HomePage() {
  const [lyrics, setLyrics] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function handleAnalyze() {
    if (!lyrics.trim()) return;
    setState({ kind: "analyzing" });
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lyrics, title, artist }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState({ kind: "error", message: data.error ?? "分析失败" });
        return;
      }
      setState({ kind: "result", song: data });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "网络错误",
      });
    }
  }

  function reset() {
    setState({ kind: "idle" });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <header className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-6 sm:pb-8 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center shadow-lg shadow-amber-400/20 shrink-0">
            <Music2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            {state.kind === "result" && (state.song.title || state.song.artist) ? (
              <>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
                  {state.song.title || "未命名"}
                </h1>
                <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  {state.song.artist || "未知歌手"}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
                  Utahon <span className="font-normal text-zinc-400">歌本</span>
                </h1>
                <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  从喜欢的歌 学日语
                </p>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {state.kind === "result" && (
            <button
              onClick={reset}
              aria-label="换一首"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">换一首</span>
            </button>
          )}
          <VoicePicker />
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-24">
        <AnimatePresence mode="wait">
          {state.kind === "idle" && (
            <motion.section
              key="input"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="歌名（可选）"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                />
                <input
                  type="text"
                  placeholder="歌手（可选）"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                />
              </div>

              <textarea
                placeholder={`粘贴日文歌词（支持 LRC 或纯文本）\n\n${DEMO_LYRICS}`}
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                rows={10}
                className="w-full px-4 sm:px-5 py-3.5 sm:py-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[15px] sm:text-base leading-relaxed font-jp resize-y focus:outline-none focus:ring-2 focus:ring-amber-400/50 sm:min-h-[320px]"
              />

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  onClick={() => setLyrics(DEMO_LYRICS)}
                  className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition self-start sm:self-auto"
                >
                  用示例歌词
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={!lyrics.trim()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium shadow-lg shadow-zinc-900/10 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  <Sparkles className="w-4 h-4" />
                  分析歌词
                </button>
              </div>
            </motion.section>
          )}

          {state.kind === "analyzing" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-32 gap-4"
            >
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Rin 正在帮你分析歌词喵～
              </p>
            </motion.div>
          )}

          {state.kind === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300"
            >
              <p className="font-medium mb-2">分析出错</p>
              <p className="text-sm">{state.message}</p>
              <button
                onClick={reset}
                className="mt-4 text-sm underline hover:no-underline"
              >
                返回
              </button>
            </motion.div>
          )}

          {state.kind === "result" && (
            <motion.section
              key="result"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {state.song.lines.map((line, i) => (
                  <LyricLine key={i} line={line} index={i} />
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
