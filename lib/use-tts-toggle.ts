"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { speak, abortCurrent, type SpeakHandle } from "./tts";

export type TtsToggle = {
  speaking: boolean;
  toggle: (text: string) => void;
};

export function useTtsToggle(): TtsToggle {
  const [speaking, setSpeaking] = useState(false);
  const handleRef = useRef<SpeakHandle | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      handleRef.current?.abort();
    };
  }, []);

  const toggle = useCallback((text: string) => {
    if (speaking) {
      abortCurrent();
      setSpeaking(false);
      return;
    }
    if (!text.trim()) return;
    setSpeaking(true);
    const handle = speak(text);
    handleRef.current = handle;
    handle.promise.finally(() => {
      // unmount 后或被新 handle 替换 → 不更新 state，防止 setState on unmounted
      if (mountedRef.current && handleRef.current === handle) {
        setSpeaking(false);
      }
    });
  }, [speaking]);

  return { speaking, toggle };
}
