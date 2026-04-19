import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { listChannelVideos } from "./lib/yt-dlp";
import { extractSongName, isLikelySong } from "./lib/title-parser";
import { fetchLrclibLyrics } from "@/lib/lrclib";
import { analyzeLyrics } from "@/lib/analyze-pipeline";
import { createSong, existsByYoutubeId } from "@/lib/songs";

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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type Failed = { id: string; title: string; reason: string };
type Succeeded = { videoId: string; songId?: string; songName: string; lines: number };

async function main() {
  const args = parseArgs(process.argv);

  console.log(`[ingest] 频道: ${args.url}`);
  console.log(
    `[ingest] 模式: ${args.commit ? "✅ COMMIT" : "🔍 DRY-RUN"} | 限制: ${
      args.limit ?? "全部"
    } | 延迟: ${args.delayMs}ms | 艺人提示: ${args.artistHint || "(无)"}`
  );

  const videos = await listChannelVideos(args.url, args.limit);
  console.log(`[ingest] yt-dlp 列出 ${videos.length} 个视频\n`);

  const stats = {
    total: videos.length,
    skippedNotSong: 0,
    skippedExisting: 0,
    skippedNoLyrics: 0,
    failed: [] as Failed[],
    succeeded: [] as Succeeded[],
  };

  for (const v of videos) {
    const songName = extractSongName(v.title);

    if (!isLikelySong(v.title)) {
      console.log(`[skip-not-song] ${v.id} | ${v.title}`);
      stats.skippedNotSong++;
      continue;
    }

    if (existsByYoutubeId(v.id)) {
      console.log(`[skip-existing] ${v.id} | ${songName}`);
      stats.skippedExisting++;
      continue;
    }

    try {
      const lrclib = await fetchLrclibLyrics({
        title: songName,
        artist: args.artistHint,
      });
      if (!lrclib) {
        console.log(`[no-lyrics] ${v.id} | ${songName}`);
        stats.skippedNoLyrics++;
        stats.failed.push({
          id: v.id,
          title: songName,
          reason: "lrclib 无歌词",
        });
        await sleep(args.delayMs);
        continue;
      }

      const youtubeUrl = `https://www.youtube.com/watch?v=${v.id}`;
      const analyzed = await analyzeLyrics({
        lyrics: lrclib.lyrics,
        title: songName,
        artist: lrclib.artistName,
        youtubeUrl,
      });

      if (args.commit) {
        const id = createSong({
          title: songName,
          artist: lrclib.artistName,
          lyrics: lrclib.lyrics,
          analyzed,
          youtubeUrl,
        });
        console.log(
          `[ok] ${v.id} -> ${id} | ${songName} (${analyzed.lines.length} 行)`
        );
        stats.succeeded.push({
          videoId: v.id,
          songId: id,
          songName,
          lines: analyzed.lines.length,
        });
      } else {
        console.log(
          `[dry-ok] ${v.id} | ${songName} (${analyzed.lines.length} 行, ${
            lrclib.hasTimestamps ? "有时间戳" : "无时间戳"
          })`
        );
        stats.succeeded.push({
          videoId: v.id,
          songName,
          lines: analyzed.lines.length,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[fail] ${v.id} | ${songName}: ${msg}`);
      stats.failed.push({ id: v.id, title: songName, reason: msg });
    }

    await sleep(args.delayMs);
  }

  console.log("\n========== 总结 ==========");
  console.log(`视频总数:     ${stats.total}`);
  console.log(`跳过(非歌):   ${stats.skippedNotSong}`);
  console.log(`跳过(已入库): ${stats.skippedExisting}`);
  console.log(`跳过(无歌词): ${stats.skippedNoLyrics}`);
  console.log(`成功:         ${stats.succeeded.length}`);
  console.log(`失败:         ${stats.failed.length}`);

  if (stats.failed.length > 0) {
    console.log("\n--- 失败列表 (可手工补) ---");
    stats.failed.forEach((f) =>
      console.log(`  - ${f.title} (${f.id}): ${f.reason}`)
    );
  }
  if (!args.commit && stats.succeeded.length > 0) {
    console.log(
      `\n💡 这是 DRY-RUN 没有写库 加 --commit 才真正入库`
    );
  }
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
