export const PRACTICE_DATA_VERSION = 1 as const;

export type PracticeStatus =
  | "none"
  | "pending"
  | "ready"
  | "failed"
  | "stale";

export type PracticeSource = "auto" | "manual";

export type PracticeTrack = "mix" | "vocals" | "drums" | "bass" | "other";

export type ChordEvent = {
  id: string;
  startTime: number;
  endTime: number;
  symbol: string;
  simplifiedSymbol: string;
  source: PracticeSource;
  edited: boolean;
  confidence?: number;
  lineIndex?: number;
  tokenIndex?: number;
};

export type SongSectionLabel =
  | "full"
  | "intro"
  | "verse"
  | "chorus"
  | "bridge"
  | "break"
  | "solo"
  | "outro"
  | "custom";

export type SongSection = {
  id: string;
  label: SongSectionLabel;
  title: string;
  startTime: number;
  endTime: number;
  source: PracticeSource;
  edited: boolean;
};

export type PracticeDataV1 = {
  version: typeof PRACTICE_DATA_VERSION;
  chords: ChordEvent[];
  sections: SongSection[];
  bpm: number | null;
  beats: number[];
  downbeats: number[];
  capo: number;
  chordDisplay: "simple" | "full";
  stems: PracticeTrack[];
  analyzers: Record<string, string>;
};

export type PracticeRecord = {
  songId: string;
  audioSha256: string;
  status: PracticeStatus;
  lastError: string;
  data: PracticeDataV1;
  hasAudio: boolean;
  updatedAt: number;
};

export type PracticePackManifestV1 = {
  version: 1;
  songId: string;
  audioSha256: string;
  baseUpdatedAt: number;
  generatedAt: string;
  data: PracticeDataV1;
  files: Partial<Record<PracticeTrack, { name: string; sha256: string }>>;
};

export function emptyPracticeData(durationSec = 0): PracticeDataV1 {
  return {
    version: PRACTICE_DATA_VERSION,
    chords: [],
    sections: durationSec > 0
      ? [
          {
            id: "section-full",
            label: "full",
            title: "全曲",
            startTime: 0,
            endTime: durationSec,
            source: "manual",
            edited: false,
          },
        ]
      : [],
    bpm: null,
    beats: [],
    downbeats: [],
    capo: 0,
    chordDisplay: "simple",
    stems: [],
    analyzers: {},
  };
}
