"use client";

import { createContext, useContext, type ReactNode } from "react";

export type SongInfo = {
  songId: string;
  songTitle: string;
};

const SongInfoContext = createContext<SongInfo | null>(null);

export function SongInfoProvider({
  songId,
  songTitle,
  children,
}: SongInfo & { children: ReactNode }) {
  return (
    <SongInfoContext.Provider value={{ songId, songTitle }}>
      {children}
    </SongInfoContext.Provider>
  );
}

export function useSongInfo(): SongInfo | null {
  return useContext(SongInfoContext);
}
