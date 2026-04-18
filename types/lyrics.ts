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
};

export type AnalyzedSong = {
  title: string;
  artist: string;
  lines: AnalyzedLine[];
};
