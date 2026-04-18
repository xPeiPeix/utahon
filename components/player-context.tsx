"use client";

import { createContext, useContext } from "react";

export type PlayerContextValue = {
  playSegment: (startTime: number, endTime: number) => void;
};

export const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue | null {
  return useContext(PlayerContext);
}
