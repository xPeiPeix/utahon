"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mic, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function RetranscribeButton({
  songId,
  hasYoutube,
}: {
  songId: string;
  hasYoutube: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasYoutube) return null;

  async function handleClick() {
    const input = window.prompt(
      "贴 BV 号 / YouTube videoId / 完整 URL\n留空用原视频重转\n例：BV1xx4y1m7rE 或 dQw4w9WgXcQ\n(Gemini 多模态 约 30-60 秒 准确率 70-85%)",
      ""
    );
    if (input === null) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/songs/${songId}/retranscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceInput: input.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "转录失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || isPending}
        aria-label="用 Gemini 重新转录歌词"
        title="用 Gemini 多模态从音频重转 (覆盖现有歌词)"
        className={cn(
          "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-sm transition rounded-xl",
          "text-zinc-600 dark:text-zinc-400",
          "hover:text-violet-500 dark:hover:text-violet-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">
          {busy ? "转录中" : "重转"}
        </span>
      </button>
      {error && (
        <span
          className="text-xs text-rose-500 max-w-[140px] truncate"
          title={error}
        >
          {error}
        </span>
      )}
    </>
  );
}
