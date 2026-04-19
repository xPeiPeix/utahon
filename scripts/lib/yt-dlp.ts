import { spawn } from "child_process";

export type YtVideo = {
  id: string;
  title: string;
};

export function listChannelVideos(
  channelUrl: string,
  limit?: number
): Promise<YtVideo[]> {
  return new Promise((resolve, reject) => {
    const args = [
      "--flat-playlist",
      "--print",
      "%(id)s\t%(title)s",
      ...(limit ? ["--playlist-end", String(limit)] : []),
      channelUrl,
    ];

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
          const tabIdx = line.indexOf("\t");
          if (tabIdx === -1) return null;
          const id = line.slice(0, tabIdx).trim();
          const title = line.slice(tabIdx + 1).trim();
          if (!id || !title) return null;
          return { id, title };
        })
        .filter((v): v is YtVideo => v !== null);
      resolve(videos);
    });
  });
}
