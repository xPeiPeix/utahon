import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { runIngest, type ProgressEvent } from "@/lib/ingest";

type Args = {
  url: string;
  limit?: number;
  delayMs: number;
  artistHint: string;
};

function parseArgs(argv: string[]): Args {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [rawKey, inlineVal] = a.slice(2).split("=", 2);
      if (inlineVal !== undefined) {
        flags[rawKey] = inlineVal;
      } else {
        const next = argv[i + 1];
        if (next && !next.startsWith("--")) {
          flags[rawKey] = next;
          i++;
        } else {
          flags[rawKey] = true;
        }
      }
    } else {
      positional.push(a);
    }
  }
  if (positional.length === 0) {
    console.error(
      `用法: npm run ingest -- <youtube-channel-url> [选项]
选项:
  --limit N         只处理前 N 个视频 (默认全部)
  --delay MS        每首之间延迟毫秒数 (默认 1500)
  --artist-hint S   传给 lrclib 搜索的艺人名 (cover 视频可填原唱名提高命中)

注: 每首分析完立即入库 断线重跑自动续扫 (已入库的 youtube_id 会跳过)`
    );
    process.exit(1);
  }
  return {
    url: positional[0],
    limit: flags.limit ? Number(flags.limit) : undefined,
    delayMs: flags.delay ? Number(flags.delay) : 1500,
    artistHint:
      typeof flags["artist-hint"] === "string" ? flags["artist-hint"] : "",
  };
}

function logProgress(e: ProgressEvent) {
  switch (e.kind) {
    case "list-start":
      console.log(`[ingest] yt-dlp 列出 ${e.total} 个视频\n`);
      break;
    case "skip-not-song":
      console.log(`[skip-not-song] ${e.videoId} | ${e.title}`);
      break;
    case "skip-short":
      console.log(
        `[skip-short] ${e.videoId} | ${e.title} (${e.duration ?? "NA"}s)`
      );
      break;
    case "skip-existing":
      console.log(
        `[skip-existing-${e.reason}] ${e.videoId} | ${e.songName}`
      );
      break;
    case "placeholder":
      console.log(
        `[placeholder] ${e.videoId} -> ${e.songId} | ${e.songName}`
      );
      break;
    case "ok":
      console.log(
        `[ok] ${e.videoId} -> ${e.songId} | ${e.songName} (${e.lines} 行${
          e.hasTimestamps ? " · 有时间戳" : ""
        })`
      );
      break;
    case "fail":
      console.error(`[fail] ${e.videoId} | ${e.songName}: ${e.reason}`);
      break;
  }
}

async function main() {
  const args = parseArgs(process.argv);
  console.log(`[ingest] 频道: ${args.url}`);
  console.log(
    `[ingest] 限制: ${args.limit ?? "全部"} | 延迟: ${args.delayMs}ms | 艺人提示: ${
      args.artistHint || "(无)"
    }`
  );

  const summary = await runIngest({
    channelUrl: args.url,
    limit: args.limit,
    delayMs: args.delayMs,
    artistHint: args.artistHint,
    onProgress: logProgress,
  });

  console.log("\n========== 总结 ==========");
  console.log(`视频总数:           ${summary.total}`);
  console.log(`跳过(非歌):         ${summary.skippedNotSong}`);
  console.log(`跳过(Short<60s):    ${summary.skippedShort}`);
  console.log(`跳过(已入库 yt):    ${summary.skippedExistingYoutube}`);
  console.log(`跳过(已入库 lrc):   ${summary.skippedExistingLrclib}`);
  console.log(`成功入库:           ${summary.succeeded.length}`);
  console.log(`占位待转录:         ${summary.placeholders.length}`);
  console.log(`失败:               ${summary.failed.length}`);

  if (summary.failed.length > 0) {
    console.log("\n--- 失败列表 ---");
    summary.failed.forEach((f) =>
      console.log(`  - ${f.title} (${f.videoId}): ${f.reason}`)
    );
  }
  if (summary.placeholders.length > 0) {
    console.log("\n--- 占位待转录（lrclib 无歌词 已占位入库） ---");
    summary.placeholders.forEach((p) =>
      console.log(`  - ${p.songName} -> ${p.songId}`)
    );
  }
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
