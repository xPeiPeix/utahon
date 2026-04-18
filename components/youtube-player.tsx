"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import YouTube, { type YouTubeEvent, type YouTubePlayer } from "react-youtube";
import { PlayerContext, type PlayerContextValue } from "./player-context";

export function YouTubePlayerFrame({
  videoId,
  children,
}: {
  videoId: string;
  children: ReactNode;
}) {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, []);

  const handleReady = useCallback((e: YouTubeEvent) => {
    playerRef.current = e.target;
  }, []);

  const playSegment = useCallback((startTime: number, endTime: number) => {
    const player = playerRef.current;
    if (!player) return;
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);

    player.seekTo(startTime, true);
    player.playVideo();

    const duration = Math.max(endTime - startTime, 1);
    pauseTimerRef.current = setTimeout(() => {
      player.pauseVideo();
    }, duration * 1000 + 200);
  }, []);

  const ctxValue: PlayerContextValue = { playSegment };

  return (
    <PlayerContext.Provider value={ctxValue}>
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 mb-4 px-4 sm:px-6 py-2 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800">
        <div className="max-w-md mx-auto aspect-video rounded-xl overflow-hidden bg-black shadow-lg">
          <YouTube
            videoId={videoId}
            className="w-full h-full"
            iframeClassName="w-full h-full"
            opts={{
              width: "100%",
              height: "100%",
              playerVars: {
                controls: 1,
                modestbranding: 1,
                rel: 0,
                playsinline: 1,
              },
            }}
            onReady={handleReady}
          />
        </div>
      </div>
      {children}
    </PlayerContext.Provider>
  );
}
