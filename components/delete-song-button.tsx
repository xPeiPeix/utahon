"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteSongRequest } from "@/lib/delete-song";

export function DeleteSongButton({
  songId,
  songTitle,
}: {
  songId: string;
  songTitle: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`删除《${songTitle}》?`)) return;
    setDeleting(true);
    const ok = await deleteSongRequest(songId);
    if (ok) {
      router.push("/");
      router.refresh();
    } else {
      setDeleting(false);
      alert("删除失败");
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      aria-label="删除歌曲"
      className={cn(
        "w-9 h-9 rounded-xl flex items-center justify-center",
        "text-zinc-500 hover:text-rose-500 dark:text-zinc-400 dark:hover:text-rose-400",
        "hover:bg-rose-50 dark:hover:bg-rose-500/10",
        "transition-colors shrink-0 disabled:opacity-40"
      )}
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
