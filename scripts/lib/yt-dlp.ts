import { spawn } from "child_process";

export type YtVideo = {
  id: string;
  title: string;
  duration: number | null;
  uploader: string;
};

const PRINT_FMT =
  "%(id)s\t%(title)s\t%(duration)s\t%(uploader,channel,playlist_uploader,playlist_channel)s";

function runYtDlp(args: string[]): Promise<YtVideo[]> {
  return new Promise((resolve, reject) => {
    const proc = spawn("uv", ["run", "yt-dlp", ...args], {
      shell: false,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
        PYTHONUTF8: "1",
      },
    });
    let stdout = "";
    let stderr = "";

    proc.stdout.setEncoding("utf8");
    proc.stderr.setEncoding("utf8");
    proc.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    proc.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    proc.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        reject(
          new Error("uv 未找到 请先安装 uv: https://docs.astral.sh/uv/")
        );
      } else {
        reject(err);
      }
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        const tail = stderr.slice(-600);
        reject(
          new Error(
            `yt-dlp 退出码 ${code}: ${tail}\n💡 如果提示找不到 yt-dlp 请运行: uv sync`
          )
        );
        return;
      }
      const videos = stdout
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line): YtVideo | null => {
          const parts = line.split("\t");
          if (parts.length < 2) return null;
          const id = parts[0]?.trim();
          const title = parts[1]?.trim();
          const rawDuration = parts[2]?.trim() ?? "";
          const rawUploader = parts[3]?.trim() ?? "";
          if (!id || !title) return null;
          const dur = Number(rawDuration);
          const duration =
            rawDuration && rawDuration !== "NA" && Number.isFinite(dur)
              ? dur
              : null;
          const uploader =
            rawUploader && rawUploader !== "NA" ? rawUploader : "";
          return { id, title, duration, uploader };
        })
        .filter((v): v is YtVideo => v !== null);
      resolve(videos);
    });
  });
}

export function listChannelVideos(
  channelUrl: string,
  limit?: number
): Promise<YtVideo[]> {
  const args = [
    "--flat-playlist",
    "--print",
    PRINT_FMT,
    ...(limit ? ["--playlist-end", String(limit)] : []),
    channelUrl,
  ];
  return runYtDlp(args);
}

export function searchYoutube(
  query: string,
  limit: number = 5
): Promise<YtVideo[]> {
  const safeLimit = Math.max(1, Math.min(10, Math.floor(limit)));
  const args = [
    "--flat-playlist",
    "--no-warnings",
    "--skip-download",
    "--print",
    PRINT_FMT,
    `ytsearch${safeLimit}:${query}`,
  ];
  return runYtDlp(args);
}
