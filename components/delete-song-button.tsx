"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteSongRequest } from "@/lib/delete-song";
import { IconButton } from "./editorial-interactive";

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
    <IconButton
      aria-label="删除歌曲"
      title="删除歌曲"
      tone="red"
      onClick={handleDelete}
      disabled={deleting}
    >
      <Trash2 className="w-[14px] h-[14px]" strokeWidth={1.5} />
    </IconButton>
  );
}
