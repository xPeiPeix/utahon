import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { runIngest, type ProgressEvent } from "@/lib/ingest";

type Args = {
  url: string;
  limit?: number;
  commit: boolean;
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
  --commit          实际入库 (默认 dry-run 不写)
  --delay MS        每首之间延迟毫秒数 (默认 1500)
  --artist-hint S   传给 lrclib 搜索的艺人名 (cover 视频可填原唱名提高命中)`
    );
    process.exit(1);
  }
  return {
    url: positional[0],
    limit: flags.limit ? Number(flags.limit) : undefined,
    commit: Boolean(flags.commit),
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
    case "skip-existing":
      console.log(
        `[skip-existing-${e.reason}] ${e.videoId} | ${e.songName}`
      );
      break;
    case "skip-no-lyrics":
      console.log(`[no-lyrics] ${e.videoId} | ${e.songName}`);
      break;
    case "ok":
      if (e.songId) {
        console.log(
          `[ok] ${e.videoId} -> ${e.songId} | ${e.songName} (${e.lines} 行)`
        );
      } else {
        console.log(
          `[dry-ok] ${e.videoId} | ${e.songName} (${e.lines} 行, ${
            e.hasTimestamps ? "有时间戳" : "无时间戳"
          })`
        );
      }
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
    `[ingest] 模式: ${args.commit ? "✅ COMMIT" : "🔍 DRY-RUN"} | 限制: ${
      args.limit ?? "全部"
    } | 延迟: ${args.delayMs}ms | 艺人提示: ${args.artistHint || "(无)"}`
  );

  const summary = await runIngest({
    channelUrl: args.url,
    limit: args.limit,
    commit: args.commit,
    delayMs: args.delayMs,
    artistHint: args.artistHint,
    onProgress: logProgress,
  });

  console.log("\n========== 总结 ==========");
  console.log(`视频总数:           ${summary.total}`);
  console.log(`跳过(非歌):         ${summary.skippedNotSong}`);
  console.log(`跳过(已入库 yt):    ${summary.skippedExistingYoutube}`);
  console.log(`跳过(已入库 lrc):   ${summary.skippedExistingLrclib}`);
  console.log(`跳过(无歌词):       ${summary.skippedNoLyrics}`);
  console.log(`成功:               ${summary.succeeded.length}`);
  console.log(`失败:               ${summary.failed.length}`);

  if (summary.failed.length > 0) {
    console.log("\n--- 失败列表 (可手工补) ---");
    summary.failed.forEach((f) =>
      console.log(`  - ${f.title} (${f.videoId}): ${f.reason}`)
    );
  }
  if (!args.commit && summary.succeeded.length > 0) {
    console.log(
      `\n💡 这是 DRY-RUN 没有写库 加 --commit 才真正入库`
    );
  }
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
