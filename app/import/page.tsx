"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Music2,
  Loader2,
  Download,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  SkipForward,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { VoicePicker } from "@/components/voice-picker";
import type { IngestSummary } from "@/lib/ingest";

type State =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; summary: IngestSummary }
  | { kind: "error"; message: string };

export default function ImportPage() {
  const [channelUrl, setChannelUrl] = useState("");
  const [artistHint, setArtistHint] = useState("");
  const [limit, setLimit] = useState("");
  const [commit, setCommit] = useState(false);
  const [state, setState] = useState<State>({ kind: "idle" });

  async function handleSubmit() {
    if (!channelUrl.trim()) return;
    setState({ kind: "running" });
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelUrl: channelUrl.trim(),
          artistHint: artistHint.trim(),
          limit: limit ? Number(limit) : undefined,
          commit,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState({
          kind: "error",
          message: data.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      setState({ kind: "done", summary: data as IngestSummary });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "网络错误",
      });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <header className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-6 sm:pb-8 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link
            href="/"
            aria-label="返回"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center shadow-lg shadow-amber-400/20 shrink-0 hover:scale-105 active:scale-95 transition-transform"
          >
            <Music2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
              批量导入
            </h1>
            <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 truncate">
              输入 YouTube 频道 URL 自动拉视频 + lrclib 歌词 + AI 标注
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
        <AnimatePresence mode="wait">
          {state.kind === "idle" && (
            <motion.section
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4 max-w-2xl mx-auto"
            >
              <input
                type="url"
                placeholder="YouTube 频道 URL（如 https://youtube.com/channel/...）"
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="艺人提示（可选，给 lrclib 搜索用）"
                  value={artistHint}
                  onChange={(e) => setArtistHint(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                />
                <input
                  type="number"
                  min="1"
                  placeholder="限制视频数（可选）"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                />
              </div>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:border-amber-300 dark:hover:border-amber-400/40 transition">
                <input
                  type="checkbox"
                  checked={commit}
                  onChange={(e) => setCommit(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-amber-500"
                />
                <div className="text-sm">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    真入库（不勾选 = 仅试跑不写库）
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    建议先试跑看结果 满意再勾选重跑
                  </div>
                </div>
              </label>

              <div className="rounded-xl bg-amber-50 dark:bg-amber-400/5 border border-amber-200 dark:border-amber-400/20 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
                ⚠️ 大频道可能需要几分钟 提交后请勿关闭页面 当前以 Gemini 3.1 Flash Lite 分析（500 RPD）
              </div>

              <button
                onClick={handleSubmit}
                disabled={!channelUrl.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium shadow-lg shadow-zinc-900/10 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] transition-transform"
              >
                <Download className="w-4 h-4" />
                {commit ? "开始导入" : "试跑"}
              </button>
            </motion.section>
          )}

          {state.kind === "running" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-32 gap-4"
            >
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Rin 正在拉频道 + 调 Gemini 分析喵～可能要几分钟
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                日志请看 dev server 终端
              </p>
            </motion.div>
          )}

          {state.kind === "done" && (
            <motion.section
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 max-w-3xl mx-auto"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat
                  label="视频总数"
                  value={state.summary.total}
                  color="zinc"
                />
                <Stat
                  label="成功"
                  value={state.summary.succeeded.length}
                  color="emerald"
                />
                <Stat
                  label="跳过"
                  value={
                    state.summary.skippedNotSong +
                    state.summary.skippedShort +
                    state.summary.skippedExistingYoutube +
                    state.summary.skippedExistingLrclib +
                    state.summary.skippedNoLyrics
                  }
                  color="zinc"
                />
                <Stat
                  label="失败"
                  value={state.summary.failed.length}
                  color="rose"
                />
              </div>

              {!state.summary.commit && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-400/5 border border-amber-200 dark:border-amber-400/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                  💡 这是试跑 没真入库 满意后回去勾选「真入库」重跑
                </div>
              )}

              {state.summary.succeeded.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    成功 ({state.summary.succeeded.length})
                  </h3>
                  <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
                    {state.summary.succeeded.map((s) => (
                      <div
                        key={s.videoId}
                        className="px-3 py-2 flex items-center justify-between gap-2 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {s.songName}
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {s.artistName} · {s.lines} 行 ·{" "}
                            {s.hasTimestamps ? "✓ 时间戳" : "无时间戳"}
                          </div>
                        </div>
                        {s.songId ? (
                          <Link
                            href={`/song/${s.songId}`}
                            className="text-xs text-amber-500 hover:text-amber-600 shrink-0"
                          >
                            打开 →
                          </Link>
                        ) : (
                          <span className="text-xs text-zinc-400 shrink-0">
                            (试跑)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {state.summary.failed.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-500" />
                    失败 / 没歌词 ({state.summary.failed.length})
                  </h3>
                  <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
                    {state.summary.failed.map((f) => (
                      <div
                        key={f.videoId}
                        className="px-3 py-2 text-sm"
                      >
                        <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {f.title}
                        </div>
                        <div className="text-[11px] text-rose-500 dark:text-rose-400 truncate">
                          {f.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-zinc-500 dark:text-zinc-400 grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-1.5">
                  <SkipForward className="w-3.5 h-3.5" /> 非歌:{" "}
                  {state.summary.skippedNotSong}
                </div>
                <div className="flex items-center gap-1.5">
                  <SkipForward className="w-3.5 h-3.5" /> Short(&lt;60s):{" "}
                  {state.summary.skippedShort}
                </div>
                <div className="flex items-center gap-1.5">
                  <SkipForward className="w-3.5 h-3.5" /> 已入库(yt_id):{" "}
                  {state.summary.skippedExistingYoutube}
                </div>
                <div className="flex items-center gap-1.5">
                  <SkipForward className="w-3.5 h-3.5" /> 已入库(lrc_id):{" "}
                  {state.summary.skippedExistingLrclib}
                </div>
                <div className="flex items-center gap-1.5">
                  <SkipForward className="w-3.5 h-3.5" /> 无歌词:{" "}
                  {state.summary.skippedNoLyrics}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <button
                  onClick={() => setState({ kind: "idle" })}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition"
                >
                  再来一次
                </button>
                <Link
                  href="/"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium hover:scale-[1.01] active:scale-[0.99] transition"
                >
                  去首页看歌单 →
                </Link>
              </div>
            </motion.section>
          )}

          {state.kind === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 max-w-2xl mx-auto"
            >
              <p className="font-medium mb-2">导入出错</p>
              <p className="text-sm break-all">{state.message}</p>
              <button
                onClick={() => setState({ kind: "idle" })}
                className="mt-4 text-sm underline hover:no-underline"
              >
                返回重试
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "zinc" | "emerald" | "rose";
}) {
  const colorClass =
    color === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : color === "rose"
      ? "text-rose-600 dark:text-rose-400"
      : "text-zinc-900 dark:text-zinc-100";
  return (
    <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center">
      <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
        {label}
      </div>
    </div>
  );
}
