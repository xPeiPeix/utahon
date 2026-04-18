export type ParsedLine = {
  startTime: number;
  endTime: number;
  text: string;
};

export type Token = {
  surface: string;
  furigana: string;
  romaji: string;
  meaning: string;
  pos: string;
};

export type AnalyzedLine = {
  original: string;
  translation: string;
  romaji: string;
  tokens: Token[];
  startTime: number;
  endTime: number;
};

export type AnalyzedSong = {
  title: string;
  artist: string;
  youtubeUrl: string;
  youtubeId: string;
  lines: AnalyzedLine[];
};

export type SongMeta = {
  id: string;
  title: string;
  artist: string;
  linesCount: number;
  createdAt: number;
  youtubeId: string;
};

export type SongFull = SongMeta & {
  lyrics: string;
  analyzed: AnalyzedSong;
};
