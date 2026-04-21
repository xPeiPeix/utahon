"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  CheckSquare,
  Square,
  X,
  Loader2,
  ListFilter,
} from "lucide-react";
import type { SongMeta } from "@/types/lyrics";
import { SongCard } from "./song-card";
import { cn } from "@/lib/utils";

const UNKNOWN_ARTIST = "未知";

type StatusFilter = "all" | "done" | "pending";
type SourceFilter = "all" | "manual" | "channel";

export function SongLibrary({ songs }: { songs: SongMeta[] }) {
  const router = useRouter();
  const [artist, setArtist] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [source, setSource] = useState<SourceFilter>("all");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [, startTransition] = useTransition();

  const artistCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of songs) {
      const key = s.artist || UNKNOWN_ARTIST;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [songs]);

  const doneCount = useMemo(
    () => songs.filter((s) => s.linesCount > 0).length,
    [songs]
  );
  const pendingCount = songs.length - doneCount;
  const manualCount = useMemo(
    () => songs.filter((s) => s.source === "manual").length,
    [songs]
  );
  const channelCount = songs.length - manualCount;

  const filtered = useMemo(() => {
    return songs.filter((s) => {
      const key = s.artist || UNKNOWN_ARTIST;
      if (artist !== null && key !== artist) return false;
      if (status === "done" && s.linesCount === 0) return false;
      if (status === "pending" && s.linesCount > 0) return false;
      if (source !== "all" && s.source !== source) return false;
      return true;
    });
  }, [songs, artist, status, source]);

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const s of filtered) next.add(s.id);
      return next;
    });
  }

  function invertVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const s of filtered) {
        if (next.has(s.id)) next.delete(s.id);
        else next.add(s.id);
      }
      return next;
    });
  }

  function exitSelect() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function bulkDelete() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (!confirm(`确定删除 ${ids.length} 首歌?`)) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/songs/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        alert(data.error ?? `删除失败 HTTP ${res.status}`);
        return;
      }
      setSelectedIds(new Set());
      setSelectMode(false);
      startTransition(() => router.refresh());
    } catch (err) {
      alert(err instanceof Error ? err.message : "网络错误");
    } finally {
      setDeleting(false);
    }
  }

  const filteringActive =
    artist !== null || status !== "all" || source !== "all";

  return (
    <>
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          我的歌曲{" "}
          <span className="text-zinc-400 font-normal">
            ({filteringActive ? `${filtered.length} / ${songs.length}` : songs.length})
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {songs.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (selectMode) exitSelect();
                else setSelectMode(true);
              }}
              aria-pressed={selectMode}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition",
                selectMode
                  ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                  : "bg-zinc-100 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              )}
            >
              {selectMode ? (
                <>
                  <X className="w-4 h-4" /> 完成
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4" /> 管理
                </>
              )}
            </button>
          )}
          <Link
            href="/new"
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium shadow-lg shadow-zinc-900/10 hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            <Plus className="w-4 h-4" />
            新建
          </Link>
        </div>
      </div>

      {songs.length > 0 && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-3.5 rounded-2xl bg-white/60 dark:bg-zinc-900/40 ring-1 ring-zinc-200/80 dark:ring-zinc-800/70 space-y-2">
          <FilterRow label="歌手">
            <Chip
              active={artist === null}
              onClick={() => setArtist(null)}
              label="全部"
              count={songs.length}
            />
            {artistCounts.map(([name, n]) => (
              <Chip
                key={name}
                active={artist === name}
                onClick={() => setArtist(name)}
                label={name}
                count={n}
              />
            ))}
          </FilterRow>
          <FilterRow label="状态">
            <Chip
              active={status === "all"}
              onClick={() => setStatus("all")}
              label="全部"
              count={songs.length}
            />
            <Chip
              active={status === "done"}
              onClick={() => setStatus("done")}
              label="已完成"
              count={doneCount}
            />
            <Chip
              active={status === "pending"}
              onClick={() => setStatus("pending")}
              label="待转录"
              count={pendingCount}
              tone="rose"
            />
          </FilterRow>
          <FilterRow label="来源">
            <Chip
              active={source === "all"}
              onClick={() => setSource("all")}
              label="全部"
              count={songs.length}
            />
            <Chip
              active={source === "channel"}
              onClick={() => setSource("channel")}
              label="频道批量"
              count={channelCount}
            />
            <Chip
              active={source === "manual"}
              onClick={() => setSource("manual")}
              label="单首粘贴"
              count={manualCount}
            />
          </FilterRow>
          {filteringActive && (
            <div className="flex justify-end pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setArtist(null);
                  setStatus("all");
                  setSource("all");
                }}
                className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition"
              >
                <ListFilter className="w-3 h-3" />
                清空筛选
              </button>
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-zinc-500 dark:text-zinc-400">
          {songs.length === 0 ? (
            <div className="space-y-4">
              <div className="text-5xl sm:text-6xl">🎵</div>
              <p className="text-zinc-500 dark:text-zinc-400">歌本还空空的喵</p>
              <Link
                href="/new"
                className="inline-flex items-center gap-1.5 text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                导入第一首喜欢的歌
              </Link>
            </div>
          ) : (
            "当前筛选下没有歌曲喵～"
          )}
        </div>
      ) : (
        <div
          className={cn(
            "grid grid-cols-1 sm:grid-cols-2 gap-3",
            selectMode && "pb-28"
          )}
        >
          {filtered.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              selectMode={selectMode}
              selected={selectedIds.has(song.id)}
              onToggle={toggleOne}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectMode && (
          <motion.div
            key="bulk-bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-3 pointer-events-none"
          >
            <div className="pointer-events-auto flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-2xl bg-zinc-900/95 dark:bg-zinc-800/95 text-zinc-100 shadow-2xl shadow-zinc-900/40 ring-1 ring-white/10 backdrop-blur">
              <span className="text-xs sm:text-sm pl-2 pr-1 whitespace-nowrap">
                已选{" "}
                <span className="font-semibold">{selectedIds.size}</span>
                <span className="text-zinc-400"> / 当前 {filtered.length}</span>
              </span>
              <span className="w-px h-5 bg-white/10" />
              <BarBtn onClick={selectAllVisible}>
                <CheckSquare className="w-4 h-4" />
                <span className="hidden sm:inline">全选</span>
              </BarBtn>
              <BarBtn onClick={invertVisible}>
                <Square className="w-4 h-4" />
                <span className="hidden sm:inline">反选</span>
              </BarBtn>
              <BarBtn
                onClick={bulkDelete}
                disabled={selectedIds.size === 0 || deleting}
                tone="rose"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">删除</span>
              </BarBtn>
              <span className="w-px h-5 bg-white/10" />
              <BarBtn onClick={exitSelect}>
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">取消</span>
              </BarBtn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-500 w-10 shrink-0 mt-1.5">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1.5 flex-1">
        {children}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
  count,
  tone = "default",
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone?: "default" | "rose";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs leading-none transition ring-1 ring-inset",
        active
          ? tone === "rose"
            ? "bg-rose-500 text-white ring-rose-500"
            : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 ring-zinc-900 dark:ring-white"
          : "bg-white dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 ring-zinc-200 dark:ring-zinc-800 hover:ring-zinc-300 dark:hover:ring-zinc-700"
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "text-[10.5px] tabular-nums",
          active ? "opacity-80" : "text-zinc-400 dark:text-zinc-500"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function BarBtn({
  children,
  onClick,
  disabled,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "rose";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-sm transition",
        tone === "rose"
          ? "text-rose-300 hover:text-white hover:bg-rose-500/80 disabled:text-rose-300/30 disabled:hover:bg-transparent"
          : "text-zinc-200 hover:text-white hover:bg-white/10",
        "disabled:cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}
