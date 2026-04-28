export type ServerVoice = {
  name: string;
  label: string;
  hint: string;
};

export const SERVER_VOICES: ServerVoice[] = [
  { name: "ja-JP-AoiNeural",    label: "Aoi",    hint: "女声 · 甜美少女" },
  { name: "ja-JP-MayuNeural",   label: "Mayu",   hint: "女声 · 温柔成熟" },
  { name: "ja-JP-ShioriNeural", label: "Shiori", hint: "女声 · 柔和文静" },
  { name: "ja-JP-NanamiNeural", label: "Nanami", hint: "女声 · 明亮亲切" },
  { name: "ja-JP-KeitaNeural",  label: "Keita",  hint: "男声 · 温和友好" },
];

export const DEFAULT_SERVER_VOICE = "ja-JP-AoiNeural";

export type VoicevoxVoice = {
  name: string;
  label: string;
  hint: string;
  speakerId: number;
};

export const VOICEVOX_VOICES: VoicevoxVoice[] = [
  { name: "voicevox-0",  label: "四国めたん",  hint: "女声 · 元気活発",  speakerId: 0  },
  { name: "voicevox-3",  label: "ずんだもん",   hint: "女声 · 明るい可愛", speakerId: 3  },
  { name: "voicevox-8",  label: "春日部つむぎ", hint: "女声 · 穏やか",    speakerId: 8  },
  { name: "voicevox-10", label: "雨晴はう",     hint: "女声 · 優しい",    speakerId: 10 },
];

const SERVER_VOICE_SET = new Set([
  ...SERVER_VOICES.map((v) => v.name),
  ...VOICEVOX_VOICES.map((v) => v.name),
]);

export function isServerVoice(name: string | null | undefined): boolean {
  return !!name && SERVER_VOICE_SET.has(name);
}

export function isVoicevoxVoice(name: string): boolean {
  return name.startsWith("voicevox-");
}

export function voicevoxSpeakerId(name: string): number | null {
  return VOICEVOX_VOICES.find((v) => v.name === name)?.speakerId ?? null;
}
