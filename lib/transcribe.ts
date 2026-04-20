import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { GoogleGenerativeAI } from "@google/generative-ai";

const TRANSCRIBE_MODEL =
  process.env.GEMINI_TRANSCRIBE_MODEL ??
  process.env.GEMINI_MODEL ??
  "gemini-3.1-flash-lite-preview";

const COOKIES_PATH = process.env.YOUTUBE_COOKIES_PATH ?? "";

const TRANSCRIBE_PROMPT = `请把这段日语歌曲的歌词转录为 LRC 格式 严格要求：

1. 只输出 LRC 文本 不要任何解释/前言/Markdown 代码块
2. 每行格式 [mm:ss.xx]歌词文本 时间戳必须对应实际唱歌的开始时刻
3. 跳过纯音乐前奏/间奏/尾奏 不要输出空行
4. 同一句歌词不要拆成两行 但每次重复唱都要输出
5. 优先使用汉字（如「鳴いた」而不是「ないた」）
6. 一行一句 不要标点符号干扰时间戳

示例输出：
[00:08.30]最初の歌詞
[00:11.50]次の歌詞
[00:14.80]また次の歌詞`;

export async function downloadAudio(youtubeUrl: string): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "utahon-audio-"));
  const outputPath = path.join(tmpDir, "audio.m4a");

  const args = ["run", "yt-dlp"];
  if (COOKIES_PATH) args.push("--cookies", COOKIES_PATH);
  args.push("-f", "140", "-o", outputPath, youtubeUrl);

  return new Promise((resolve, reject) => {
    const proc = spawn("uv", args, {
      shell: false,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
        PYTHONUTF8: "1",
      },
    });
    let stderr = "";
    proc.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    proc.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        reject(new Error("uv 未找到，请先安装 uv"));
      } else {
        reject(err);
      }
    });
    proc.on("close", async (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `yt-dlp 下载音频失败 (${code}): ${stderr.slice(-400)}`
          )
        );
        return;
      }
      try {
        const stat = await fs.stat(outputPath);
        if (stat.size === 0) {
          reject(new Error("yt-dlp 完成但音频文件为空"));
          return;
        }
        resolve(outputPath);
      } catch {
        reject(new Error("yt-dlp 完成但找不到输出文件"));
      }
    });
  });
}

export async function transcribeAudio(audioPath: string): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY 未设置");

  const audioBuffer = await fs.readFile(audioPath);
  if (audioBuffer.length > 18 * 1024 * 1024) {
    throw new Error(
      `音频过大 ${(audioBuffer.length / 1024 / 1024).toFixed(1)}MB inlineData 上限 ~20MB`
    );
  }
  const base64 = audioBuffer.toString("base64");

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({
    model: TRANSCRIBE_MODEL,
    generationConfig: {
      temperature: 0.1,
    },
  });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "audio/mp4",
        data: base64,
      },
    },
    { text: TRANSCRIBE_PROMPT },
  ]);

  const text = result.response.text().trim();
  if (!text) throw new Error("Gemini 返回空文本");
  return stripCodeFence(text);
}

function stripCodeFence(text: string): string {
  return text
    .replace(/^```(?:lrc|text)?\s*\n?/i, "")
    .replace(/\n?```\s*$/, "")
    .trim();
}

export async function transcribeYoutube(youtubeUrl: string): Promise<string> {
  const audioPath = await downloadAudio(youtubeUrl);
  try {
    return await transcribeAudio(audioPath);
  } finally {
    try {
      await fs.unlink(audioPath);
      await fs.rmdir(path.dirname(audioPath));
    } catch {
      // ignore cleanup errors — temp dir
    }
  }
}
