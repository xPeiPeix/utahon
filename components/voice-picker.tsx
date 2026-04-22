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
import { SERVER_VOICES } from "@/lib/tts-voices";
import { cn } from "@/lib/utils";
import { IconButton } from "./editorial-interactive";
import { Smallcaps } from "./editorial-shell";

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

  const noBrowserVoice = voices.length === 0;

  return (
    <div ref={ref} className="relative">
      <IconButton
        aria-label="选择音色"
        title="选择音色"
        active={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Volume2 className="w-[14px] h-[14px]" strokeWidth={1.5} />
      </IconButton>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute right-0 top-full mt-2 z-30",
              "w-72 max-w-[calc(100vw-2rem)] p-3",
              "bg-paper text-ink border border-ink shadow-[6px_6px_0_0_var(--rule)]"
            )}
          >
            <div className="flex items-center justify-between pb-2 border-b border-rule">
              <Smallcaps tone="ink">日语音色</Smallcaps>
              <Smallcaps>
                {noBrowserVoice
                  ? "浏览器无日语 · 用在线"
                  : `${voices.length} 本地可用`}
              </Smallcaps>
            </div>
            <div className="max-h-80 overflow-y-auto mt-1 scroll-y">
              <VoiceItem
                label="浏览器默认"
                onClick={() => pick(null)}
                active={!selected}
              />
              {voices.map((v) => (
                <VoiceItem
                  key={v.name}
                  label={v.name}
                  sub={v.localService === false ? "在线 · 高音质" : undefined}
                  onClick={() => pick(v.name)}
                  active={selected === v.name}
                />
              ))}

              <div className="mt-2 pt-2 border-t border-rule">
                <Smallcaps tone="ink">Edge 在线 · 移动端兜底</Smallcaps>
              </div>
              {SERVER_VOICES.map((v) => (
                <VoiceItem
                  key={v.name}
                  label={v.label}
                  sub={v.hint}
                  onClick={() => pick(v.name)}
                  active={selected === v.name}
                />
              ))}
            </div>
            <div className="pt-2 mt-1 border-t border-rule">
              <Smallcaps>选中后立即播放预览句</Smallcaps>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VoiceItem({
  label,
  sub,
  onClick,
  active,
}: {
  label: string;
  sub?: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full px-2 py-2 text-left flex items-center justify-between gap-2 transition border-l-2",
        active
          ? "border-red bg-paper-deep"
          : "border-transparent hover:border-rule hover:bg-paper-deep/60"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="font-serif text-[14px] text-ink truncate">{label}</div>
        {sub && (
          <div className="font-mono text-[9px] tracking-wider uppercase text-ink-mute">
            {sub}
          </div>
        )}
      </div>
      {active && <Check className="w-3.5 h-3.5 text-red shrink-0" />}
    </button>
  );
}
