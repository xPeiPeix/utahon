"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import YouTube, { type YouTubeEvent, type YouTubePlayer } from "react-youtube";
import { PlayerContext, type PlayerContextValue } from "./player-context";
import { SongInfoProvider } from "./song-info-context";
import { formatDuration } from "./editorial-shell";
import { cn } from "@/lib/utils";

type InternalCtx = {
  setPlayer: (p: YouTubePlayer | null) => void;
  durationSec: number;
  videoId: string;
};

const PlayerPlateCtx = createContext<InternalCtx | null>(null);

export function SongPlayerProvider({
  songId,
  songTitle,
  videoId,
  durationSec,
  children,
}: {
  songId: string;
  songTitle: string;
  videoId: string;
  durationSec: number;
  children: ReactNode;
}) {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, []);

  const setPlayer = useCallback((p: YouTubePlayer | null) => {
    playerRef.current = p;
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

  const outer: PlayerContextValue | null = videoId ? { playSegment } : null;
  const inner: InternalCtx | null = videoId
    ? { setPlayer, durationSec, videoId }
    : null;

  return (
    <PlayerContext.Provider value={outer}>
      <SongInfoProvider songId={songId} songTitle={songTitle}>
        <PlayerPlateCtx.Provider value={inner}>
          {children}
        </PlayerPlateCtx.Provider>
      </SongInfoProvider>
    </PlayerContext.Provider>
  );
}

export function EditorialPlayerPlate({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const ctx = useContext(PlayerPlateCtx);
  const [ready, setReady] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const autoRetryCountRef = useRef(0);

  const reloadPlayer = useCallback(() => {
    ctx?.setPlayer(null);
    setReady(false);
    setPlayerKey((k) => k + 1);
  }, [ctx]);

  const handlePlayerError = useCallback(() => {
    if (autoRetryCountRef.current < 2) {
      autoRetryCountRef.current += 1;
      reloadPlayer();
    } else {
      ctx?.setPlayer(null);
      setReady(false);
    }
  }, [ctx, reloadPlayer]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => {
      if (!ready) {
        autoRetryCountRef.current = 0;
        reloadPlayer();
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [ready, reloadPlayer]);

  if (!ctx) return null;
  const { videoId, durationSec, setPlayer } = ctx;

  return (
    <div className={cn("w-full", className)}>
      <div className="relative aspect-video bg-ink border border-ink overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-screen"
          style={{
            backgroundImage:
              "repeating-linear-gradient(180deg, transparent 0 5px, rgba(255,255,255,0.12) 5px 6px)",
          }}
        />
        <YouTube
          key={playerKey}
          videoId={videoId}
          className="w-full h-full relative z-[1]"
          iframeClassName="w-full h-full"
          opts={{
            width: "100%",
            height: "100%",
            playerVars: {
              controls: 1,
              modestbranding: 1,
              rel: 0,
              playsinline: 1,
              cc_load_policy: 0,
            },
          }}
          onReady={(e: YouTubeEvent) => {
            setPlayer(e.target);
            setReady(true);
          }}
          onError={handlePlayerError}
        />
        {!ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-paper z-[2]">
            <button
              type="button"
              onClick={() => {
                autoRetryCountRef.current = 0;
                reloadPlayer();
              }}
              className="w-11 h-11 border border-paper rounded-full flex items-center justify-center hover:bg-paper/10 transition"
              aria-label="重新加载播放器"
            >
              <div
                className="border-l-[11px] border-y-[7px] border-l-paper border-y-transparent ml-1"
                aria-hidden
              />
            </button>
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-80">
              YT · {videoId}
            </div>
          </div>
        )}
      </div>
      {!compact && (
        <div className="flex justify-between items-center font-mono text-[10px] tracking-[0.08em] text-ink-mute mt-1.5 tabular">
          <span>00:00</span>
          <span className="text-rule flex-1 text-center">
            ━━━━━━━━━━━━
          </span>
          <span>{formatDuration(durationSec)}</span>
        </div>
      )}
    </div>
  );
}
