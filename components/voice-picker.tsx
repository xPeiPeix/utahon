"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Check } from "lucide-react";
import {
  getSelectedVoiceName,
  setSelectedVoiceName,
  listJapaneseVoices,
  speak,
} from "@/lib/tts";
import { cn } from "@/lib/utils";

const PREVIEW_TEXT = "こんにちは、音色のプレビューです。";

export function VoicePicker() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function load() {
      setVoices(listJapaneseVoices());
    }
    load();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.addEventListener("voiceschanged", load);
    }
    setSelected(getSelectedVoiceName());
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.removeEventListener("voiceschanged", load);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function pick(name: string | null) {
    setSelectedVoiceName(name);
    setSelected(name);
    speak(PREVIEW_TEXT);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="选择音色"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
          "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
          "hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors",
          open && "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100"
        )}
      >
        <Volume2 className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute right-0 top-full mt-2 z-30",
              "w-72 max-w-[calc(100vw-2rem)] p-2 rounded-xl",
              "bg-white dark:bg-zinc-900 shadow-xl ring-1 ring-zinc-200 dark:ring-zinc-800"
            )}
          >
            <div className="px-2 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
              <span>日语音色</span>
              <span className="text-[10px] text-zinc-400">{voices.length} 个可用</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <button
                type="button"
                onClick={() => pick(null)}
                className={cn(
                  "w-full px-2 py-2 rounded-lg text-left text-sm flex items-center justify-between",
                  "hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors",
                  !selected && "bg-amber-50 dark:bg-amber-400/10"
                )}
              >
                <span className="text-zinc-700 dark:text-zinc-300">浏览器默认</span>
                {!selected && <Check className="w-4 h-4 text-amber-500" />}
              </button>
              {voices.length === 0 && (
                <div className="px-2 py-3 text-xs text-zinc-400 dark:text-zinc-500 text-center">
                  未检测到日语声音
                </div>
              )}
              {voices.map((v) => (
                <button
                  key={v.name}
                  type="button"
                  onClick={() => pick(v.name)}
                  className={cn(
                    "w-full px-2 py-2 rounded-lg text-left text-sm flex items-center justify-between gap-2",
                    "hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors",
                    selected === v.name && "bg-amber-50 dark:bg-amber-400/10"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-zinc-700 dark:text-zinc-300 truncate">
                      {v.name}
                    </div>
                    {v.localService === false && (
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        在线 · 高音质
                      </div>
                    )}
                  </div>
                  {selected === v.name && (
                    <Check className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                </button>
              ))}
            </div>
            <div className="mt-1 px-2 py-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 border-t border-zinc-100 dark:border-zinc-800">
              选中后立即播放预览句
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
