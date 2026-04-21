"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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
  Mic,
  AlertTriangle,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { VoicePicker } from "@/components/voice-picker";
import type { IngestSummary, ProgressEvent } from "@/lib/ingest";

type State =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; summary: IngestSummary }
  | { kind: "error"; message: string };

type Derived = {
  total: number | null;
  processed: number;
  succeeded: Extract<ProgressEvent, { kind: "ok" }>[];
  placeholders: Extract<ProgressEvent, { kind: "placeholder" }>[];
  failed: Extract<ProgressEvent, { kind: "fail" }>[];
  skippedNotSong: Extract<ProgressEvent, { kind: "skip-not-song" }>[];
  skippedShort: Extract<ProgressEvent, { kind: "skip-short" }>[];
  skippedExisting: Extract<ProgressEvent, { kind: "skip-existing" }>[];
};

function deriveFromEvents(events: ProgressEvent[]): Derived {
  const d: Derived = {
    total: null,
    processed: 0,
    succeeded: [],
    placeholders: [],
    failed: [],
    skippedNotSong: [],
    skippedShort: [],
    skippedExisting: [],
  };
  for (const e of events) {
    switch (e.kind) {
      case "list-start":
        d.total = e.total;
        break;
      case "ok":
        d.succeeded.push(e);
        d.processed++;
        break;
      case "placeholder":
        d.placeholders.push(e);
        d.processed++;
        break;
      case "fail":
        d.failed.push(e);
        d.processed++;
        break;
      case "skip-not-song":
        d.skippedNotSong.push(e);
        d.processed++;
        break;
      case "skip-short":
        d.skippedShort.push(e);
        d.processed++;
        break;
      case "skip-existing":
        d.skippedExisting.push(e);
        d.processed++;
        break;
    }
  }
  return d;
}

export default function ImportPage() {
  const [channelUrl, setChannelUrl] = useState("");
  const [artistHint, setArtistHint] = useState("");
  const [limit, setLimit] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [progressEvents, setProgressEvents] = useState<ProgressEvent[]>([]);
  const progressListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = progressListRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [progressEvents.length]);

  const derived = useMemo(() => deriveFromEvents(progressEvents), [
    progressEvents,
  ]);

  async function handleSubmit() {
    if (!channelUrl.trim()) return;
    setState({ kind: "running" });
    setProgressEvents([]);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelUrl: channelUrl.trim(),
          artistHint: artistHint.trim(),
          limit: limit ? Number(limit) : undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res
          .json()
          .catch(() => ({ error: `HTTP ${res.status}` }));
        setState({
          kind: "error",
          message: errData.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      if (!res.body) {
        setState({ kind: "error", message: "响应无 body" });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let splitIdx;
        while ((splitIdx = buffer.indexOf("\n\n")) !== -1) {
          const block = buffer.slice(0, splitIdx);
          buffer = buffer.slice(splitIdx + 2);
          if (!block || block.startsWith(":")) continue;

          let eventType = "message";
          let dataStr = "";
          for (const line of block.split("\n")) {
            if (line.startsWith("event: ")) eventType = line.slice(7).trim();
            else if (line.startsWith("data: ")) dataStr += line.slice(6);
          }
          if (!dataStr) continue;

          const data = JSON.parse(dataStr);
          if (eventType === "progress") {
            setProgressEvents((prev) => [...prev, data as ProgressEvent]);
          } else if (eventType === "done") {
            setState({ kind: "done", summary: data as IngestSummary });
            return;
          } else if (eventType === "error") {
            setState({
              kind: "error",
              message: data.message ?? "ingest 失败",
            });
            return;
          }
        }
      }
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
                type="text"
                placeholder="YouTube 频道 @akashimyu 或完整 URL"
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

              <div className="rounded-xl bg-amber-50 dark:bg-amber-400/5 border border-amber-200 dark:border-amber-400/20 px-4 py-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <div>⚡ 每首分析完立即入库 · 断线可续扫（重跑同频道自动跳过已入库）</div>
                <div className="opacity-80">
                  大频道要跑几分钟 保持页面开着呐～主 3.1 Lite(500 RPD) 过载自动降到 2.5 Lite(20 RPD)
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!channelUrl.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium shadow-lg shadow-zinc-900/10 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] transition-transform"
              >
                <Download className="w-4 h-4" />
                开始导入
              </button>
            </motion.section>
          )}

          {state.kind === "running" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-3xl mx-auto space-y-4 py-8"
            >
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Rin 正在跑喵～已处理{" "}
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {derived.processed}
                  </span>
                  {derived.total !== null && (
                    <>
                      {" / "}
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {derived.total}
                      </span>
                    </>
                  )}{" "}
                  · ✅ {derived.succeeded.length} · 🎤 {derived.placeholders.length} · ❌ {derived.failed.length}
                </p>
              </div>
              {progressEvents.length > 0 && (
                <div
                  ref={progressListRef}
                  className="max-h-[60vh] overflow-y-auto rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800"
                >
                  {progressEvents.map((e, i) => (
                    <ProgressRow key={i} event={e} />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {(state.kind === "done" || state.kind === "error") && (
            <motion.section
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 max-w-3xl mx-auto"
            >
              {state.kind === "error" && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 px-4 py-3 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-rose-700 dark:text-rose-300 min-w-0 flex-1">
                    <div className="font-medium">连接中断 — 已入库的歌都保留了 (=^･ω･^=)</div>
                    <div className="text-xs opacity-80 mt-0.5 break-all">
                      {state.message}
                    </div>
                    <div className="text-xs opacity-80 mt-1">
                      💡 重跑同频道会自动跳过已入库 继续从断点往后扫
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat
                  label={derived.total !== null ? "视频总数" : "已处理"}
                  value={derived.total ?? derived.processed}
                  color="zinc"
                />
                <Stat
                  label="成功入库"
                  value={derived.succeeded.length}
                  color="emerald"
                />
                <Stat
                  label="占位待转录"
                  value={derived.placeholders.length}
                  color="amber"
                />
                <Stat
                  label="失败"
                  value={derived.failed.length}
                  color="rose"
                />
              </div>

              {derived.succeeded.length > 0 && (
                <Section
                  title={`成功入库 (${derived.succeeded.length})`}
                  icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                >
                  {derived.succeeded.map((s) => (
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
                      <Link
                        href={`/song/${s.songId}`}
                        className="text-xs text-amber-500 hover:text-amber-600 shrink-0"
                      >
                        打开 →
                      </Link>
                    </div>
                  ))}
                </Section>
              )}

              {derived.placeholders.length > 0 && (
                <Section
                  title={`占位待转录 (${derived.placeholders.length})`}
                  icon={<Mic className="w-4 h-4 text-amber-500" />}
                  hint="lrclib 没找到歌词 已占位入库 去详情页点 🎤 用 Gemini 转录"
                >
                  {derived.placeholders.map((p) => (
                    <div
                      key={p.videoId}
                      className="px-3 py-2 flex items-center justify-between gap-2 text-sm"
                    >
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate flex-1 min-w-0">
                        {p.songName}
                      </div>
                      <Link
                        href={`/song/${p.songId}`}
                        className="text-xs text-amber-500 hover:text-amber-600 shrink-0"
                      >
                        去转录 →
                      </Link>
                    </div>
                  ))}
                </Section>
              )}

              {derived.failed.length > 0 && (
                <Section
                  title={`失败 (${derived.failed.length})`}
                  icon={<XCircle className="w-4 h-4 text-rose-500" />}
                >
                  {derived.failed.map((f) => (
                    <div key={f.videoId} className="px-3 py-2 text-sm">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {f.songName}
                      </div>
                      <div className="text-[11px] text-rose-500 dark:text-rose-400 truncate">
                        {f.reason}
                      </div>
                    </div>
                  ))}
                </Section>
              )}

              <div className="text-xs text-zinc-500 dark:text-zinc-400 grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-1.5">
                  <SkipForward className="w-3.5 h-3.5" /> 非歌:{" "}
                  {derived.skippedNotSong.length}
                </div>
                <div className="flex items-center gap-1.5">
                  <SkipForward className="w-3.5 h-3.5" /> Short(&lt;60s):{" "}
                  {derived.skippedShort.length}
                </div>
                <div className="flex items-center gap-1.5">
                  <SkipForward className="w-3.5 h-3.5" /> 已入库:{" "}
                  {derived.skippedExisting.length}
                </div>
                <div className="flex items-center gap-1.5">
                  <SkipForward className="w-3.5 h-3.5" /> 事件数:{" "}
                  {progressEvents.length}
                </div>
              </div>

              {progressEvents.length > 0 && (
                <details className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <summary className="px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded-xl">
                    完整日志 ({progressEvents.length} 条)
                  </summary>
                  <div className="max-h-[50vh] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 border-t border-zinc-200 dark:border-zinc-800">
                    {progressEvents.map((e, i) => (
                      <ProgressRow key={i} event={e} />
                    ))}
                  </div>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <button
                  onClick={() => {
                    setState({ kind: "idle" });
                    setProgressEvents([]);
                  }}
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
        </AnimatePresence>
      </main>
    </div>
  );
}

function ProgressRow({ event }: { event: ProgressEvent }) {
  const base = "px-3 py-1.5 text-xs truncate";
  switch (event.kind) {
    case "list-start":
      return (
        <div
          className={`${base} text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/40 font-medium`}
        >
          📋 频道共 {event.total} 个视频 开跑咯～
        </div>
      );
    case "skip-not-song":
      return (
        <div className={`${base} text-zinc-500 dark:text-zinc-500`}>
          ⏭️ 非歌跳过: {event.title}
        </div>
      );
    case "skip-short":
      return (
        <div className={`${base} text-zinc-500 dark:text-zinc-500`}>
          ⏭️ Short(&lt;60s)跳过: {event.title}
        </div>
      );
    case "skip-existing":
      return (
        <div className={`${base} text-zinc-500 dark:text-zinc-500`}>
          ⏭️ 已入库({event.reason}): {event.songName}
        </div>
      );
    case "placeholder":
      return (
        <div className={`${base} text-amber-600 dark:text-amber-400`}>
          🎤 占位入库(无歌词): {event.songName}
        </div>
      );
    case "ok":
      return (
        <div className={`${base} text-emerald-600 dark:text-emerald-400`}>
          ✅ {event.songName} — {event.artistName} ({event.lines} 行
          {event.hasTimestamps ? " · 有时间戳" : ""})
        </div>
      );
    case "fail":
      return (
        <div className={`${base} text-rose-500 dark:text-rose-400`}>
          ❌ {event.songName}: {event.reason.slice(0, 80)}
        </div>
      );
  }
}

function Section({
  title,
  icon,
  hint,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1 flex items-center gap-1.5">
        {icon}
        {title}
      </h3>
      {hint && (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2">
          {hint}
        </p>
      )}
      <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
        {children}
      </div>
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
  color: "zinc" | "emerald" | "rose" | "amber";
}) {
  const colorClass =
    color === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : color === "rose"
      ? "text-rose-600 dark:text-rose-400"
      : color === "amber"
      ? "text-amber-600 dark:text-amber-400"
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
