"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2, ListMusic, Mic } from "lucide-react";
import type { SongMeta } from "@/types/lyrics";
import { cn } from "@/lib/utils";
import { deleteSongRequest } from "@/lib/delete-song";

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return `今天 ${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function SongCard({ song }: { song: SongMeta }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`删除《${song.title}》?`)) return;
    setDeleting(true);
    const ok = await deleteSongRequest(song.id);
    if (ok) {
      router.refresh();
    } else {
      setDeleting(false);
      alert("删除失败");
    }
  }

  return (
    <Link
      href={`/song/${song.id}`}
      className={cn(
        "group relative block p-4 rounded-2xl",
        "bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800",
        "hover:ring-amber-400/60 dark:hover:ring-amber-400/50",
        "hover:shadow-lg hover:shadow-amber-400/10",
        "transition-all",
        deleting && "opacity-40 pointer-events-none"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
            song.linesCount > 0
              ? "bg-gradient-to-br from-amber-400/90 to-rose-400/90"
              : "bg-gradient-to-br from-zinc-400/70 to-zinc-500/70"
          )}
        >
          {song.linesCount > 0 ? (
            <ListMusic className="w-5 h-5 text-white" />
          ) : (
            <Mic className="w-5 h-5 text-white" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {song.title}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
            {song.artist || "待补充"}
          </div>
          <div className="text-[11px] mt-2 flex items-center gap-2">
            {song.linesCount > 0 ? (
              <span className="text-zinc-400 dark:text-zinc-500">
                {song.linesCount} 行
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium">
                <Mic className="w-3 h-3" /> 待转录
              </span>
            )}
            <span className="text-zinc-400 dark:text-zinc-500">·</span>
            <span className="text-zinc-400 dark:text-zinc-500">
              {formatDate(song.createdAt)}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          aria-label="删除"
          className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
            "text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10",
            "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          )}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </Link>
  );
}
