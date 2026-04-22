import type { ProgressEvent } from "@/lib/ingest";

export type LogEntry = ProgressEvent & { ts: string };

export function nowStamp(): string {
  const d = new Date();
  return [
    d.getHours().toString().padStart(2, "0"),
    d.getMinutes().toString().padStart(2, "0"),
    d.getSeconds().toString().padStart(2, "0"),
  ].join(":");
}

export function LogBox({
  log,
  className,
  ref,
}: {
  log: LogEntry[];
  className?: string;
  ref?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={ref}
      className={`bg-paper-deep border border-rule p-3 font-mono text-[11px] leading-[1.8] text-ink-soft overflow-y-auto scroll-y ${
        className ?? ""
      }`}
    >
      {log.length === 0 && (
        <div className="text-ink-mute italic">waiting for first event…</div>
      )}
      {log.map((e, i) => (
        <LogRow key={i} entry={e} />
      ))}
    </div>
  );
}

export function LogRow({ entry }: { entry: LogEntry }) {
  const stamp = `[${entry.ts}]`;
  switch (entry.kind) {
    case "list-start": {
      const noun = entry.source === "netease" ? "歌单" : "频道";
      const unit = entry.source === "netease" ? "首" : "视频";
      return (
        <div className="text-ink">
          {stamp} 📋 {noun}共 {entry.total} {unit} · 开跑咯～
        </div>
      );
    }
    case "search-video":
      if (entry.status === "searching") {
        return (
          <div className="text-ink-mute">
            {stamp} 🔍 搜视频: {entry.query}
          </div>
        );
      }
      if (entry.status === "found") {
        return (
          <div className="text-ink-soft">
            {stamp} 🎯 命中 Topic: {entry.videoId}
          </div>
        );
      }
      return (
        <div className="text-ink-mute">
          {stamp} ❓ 无视频 · 走占位路径
        </div>
      );
    case "skip-not-song":
      return (
        <div className="text-ink-mute">
          {stamp} ⏭️ 非歌跳过: {entry.title}
        </div>
      );
    case "skip-short":
      return (
        <div className="text-ink-mute">
          {stamp} ⏭️ Short (&lt;60s): {entry.title}
        </div>
      );
    case "skip-existing":
      return (
        <div className="text-ink-mute">
          {stamp} ⏭️ 已入库 ({entry.reason}): {entry.songName}
        </div>
      );
    case "placeholder":
      return (
        <div className="text-red-soft">
          {stamp} 🎤 占位入库(无歌词): {entry.songName}
        </div>
      );
    case "ok":
      return (
        <div className="text-red">
          {stamp} ✓ {entry.songName} — {entry.artistName} · {entry.lines} lines
          {entry.hasTimestamps ? " · ts" : ""}
        </div>
      );
    case "fail":
      return (
        <div className="text-red-soft">
          {stamp} ✗ {entry.songName}: {entry.reason.slice(0, 80)}
        </div>
      );
  }
}
