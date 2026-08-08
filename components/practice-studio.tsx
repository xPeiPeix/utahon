"use client";

import { useMemo, useRef, useState } from "react";
import {
  Download,
  Gauge,
  Guitar,
  Loader2,
  Pencil,
  Plus,
  Repeat2,
  Save,
  Scissors,
  Trash2,
  Upload,
} from "lucide-react";
import { TextPill } from "./editorial-interactive";
import { Smallcaps, formatDuration } from "./editorial-shell";
import { usePlayer } from "./player-context";
import { usePractice } from "./practice-context";
import {
  anchorChordsToLines,
  simplifyChordSymbol,
  transposeChord,
} from "@/lib/practice-schema";
import { cn } from "@/lib/utils";
import type { AnalyzedLine } from "@/types/lyrics";
import type { ChordEvent, PracticeDataV1, SongSection } from "@/types/practice";
import type { PracticeTrack } from "@/types/practice";

const PADDING_OPTIONS = [0, 0.5, 1, 2];
const MIXER_TRACKS: Array<{ track: PracticeTrack; label: string }> = [
  { track: "vocals", label: "人声" },
  { track: "drums", label: "鼓" },
  { track: "bass", label: "贝斯" },
  { track: "other", label: "其他" },
];
const SECTION_LABELS: Array<{ value: SongSection["label"]; label: string }> = [
  { value: "intro", label: "前奏" },
  { value: "verse", label: "主歌" },
  { value: "chorus", label: "副歌" },
  { value: "bridge", label: "桥段" },
  { value: "break", label: "间奏" },
  { value: "solo", label: "独奏" },
  { value: "outro", label: "尾奏" },
  { value: "custom", label: "自定" },
];

function seconds(value: number): string {
  return value.toFixed(2);
}

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function downloadText(name: string, contents: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function chordProText(
  title: string,
  artist: string,
  lines: AnalyzedLine[],
  data: PracticeDataV1
): string {
  const header = [`{title: ${title}}`, `{artist: ${artist || "Unknown"}}`];
  if (data.capo > 0) header.push(`{capo: ${data.capo}}`);
  const body = lines.map((line, lineIndex) => {
    const chords = data.chords
      .filter((chord) => chord.lineIndex === lineIndex)
      .map((chord) => ({
        ...chord,
        symbol: transposeChord(
          data.chordDisplay === "simple" ? simplifyChordSymbol(chord.symbol) : chord.symbol,
          -data.capo
        ),
      }));
    if (chords.length === 0) return line.original;
    if (line.tokens.length === 0) {
      return `${chords.map((chord) => `[${chord.symbol}]`).join("")}${line.original}`;
    }
    const before = new Map<number, string[]>();
    for (const chord of chords) {
      const tokenIndex = Math.max(0, Math.min(line.tokens.length - 1, chord.tokenIndex ?? 0));
      before.set(tokenIndex, [...(before.get(tokenIndex) ?? []), chord.symbol]);
    }
    return line.tokens
      .map((token, tokenIndex) => `${(before.get(tokenIndex) ?? []).map((chord) => `[${chord}]`).join("")}${token.surface}`)
      .join("");
  });
  return [...header, "", ...body, ""].join("\n");
}

function NumericInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <label className="grid gap-1">
      <span className="font-mono text-[8px] tracking-[0.16em] uppercase text-ink-mute">{label}</span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={seconds(value)}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full min-w-0 border border-rule bg-paper px-2 py-1.5 font-mono text-[11px] tabular outline-none focus:border-ink"
      />
    </label>
  );
}

export function PracticeStudio({
  title,
  artist,
  lines,
}: {
  title: string;
  artist: string;
  lines: AnalyzedLine[];
}) {
  const { practice, saving, saveData, uploadAudio } = usePractice();
  const player = usePlayer();
  const fileInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(practice.data);
  const [editing, setEditing] = useState(false);
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const rates = useMemo(
    () => Array.from(new Set(player?.availableRates ?? [0.5, 0.75, 1])).sort((a, b) => a - b),
    [player?.availableRates]
  );

  function updateChord(id: string, patch: Partial<ChordEvent>): void {
    setDraft((current) => ({
      ...current,
      chords: current.chords.map((chord) =>
        chord.id === id ? { ...chord, ...patch, edited: true, source: "manual" } : chord
      ),
    }));
  }

  function updateSection(id: string, patch: Partial<SongSection>): void {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === id ? { ...section, ...patch, edited: true, source: "manual" } : section
      ),
    }));
  }

  async function handleSave(): Promise<void> {
    setNotice("");
    setError("");
    try {
      const anchored = { ...draft, chords: anchorChordsToLines(draft.chords, lines) };
      const next = await saveData(anchored);
      setDraft(next.data);
      setNotice("练习设置已保存");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败");
    }
  }

  async function handleUpload(file: File | undefined): Promise<void> {
    if (!file) return;
    setNotice("");
    setError("");
    try {
      const next = await uploadAudio(file);
      setDraft(next.data);
      setNotice("音频已保存，可以立即慢放和循环；自动分析可在 Mac 上运行。 ");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "音频上传失败");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function markLoopEnd(): void {
    if (!player) return;
    const end = player.currentTime;
    setLoopEnd(end);
    if (loopStart !== null && end > loopStart) {
      player.setLoopRange({ startTime: loopStart, endTime: end });
      player.setLoopEnabled(true);
    }
  }

  function addChord(): void {
    const startTime = player?.currentTime ?? 0;
    const chord: ChordEvent = {
      id: createId("chord"),
      startTime,
      endTime: Math.min(player?.duration || startTime + 2, startTime + 2),
      symbol: "C",
      simplifiedSymbol: "C",
      source: "manual",
      edited: true,
    };
    setDraft((current) => ({
      ...current,
      chords: [...current.chords, chord].sort((a, b) => a.startTime - b.startTime),
    }));
  }

  function addSection(): void {
    const knownDuration = player?.duration ?? 0;
    const rawStart = player?.loopRange?.startTime ?? player?.currentTime ?? 0;
    const startTime = knownDuration > 0
      ? Math.min(rawStart, Math.max(0, knownDuration - 0.1))
      : rawStart;
    const maxEnd = knownDuration > 0 ? knownDuration : startTime + 20;
    const proposedEnd = player?.loopRange?.endTime ?? Math.min(maxEnd, startTime + 20);
    const endTime = Math.min(maxEnd, Math.max(startTime + 0.1, proposedEnd));
    const section: SongSection = {
      id: createId("section"),
      label: "custom",
      title: "练习段",
      startTime,
      endTime,
      source: "manual",
      edited: true,
    };
    setDraft((current) => ({
      ...current,
      sections: [...current.sections, section].sort((a, b) => a.startTime - b.startTime),
    }));
  }

  return (
    <section className="mt-8 md:mt-10 border-y border-ink py-5 md:py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Smallcaps tone="red">Guitar practice</Smallcaps>
          <h2 className="font-serif italic text-[28px] md:text-[34px] leading-none text-ink mt-1.5">
            弹唱练习台
          </h2>
          <p className="font-serif text-[13px] md:text-[14px] text-ink-soft mt-2">
            上传自己的音频，慢放不变调；划 A/B、循环段落，并把自动和弦改成顺手的按法。
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="audio/*,.m4a,.mp3,.wav,.flac,.ogg"
            className="hidden"
            onChange={(event) => void handleUpload(event.target.files?.[0])}
          />
          <TextPill
            onClick={() => fileInput.current?.click()}
            disabled={saving}
            icon={saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          >
            {practice.hasAudio ? "Replace audio" : "Upload audio"}
          </TextPill>
          <TextPill
            onClick={() => setEditing((value) => !value)}
            active={editing}
            icon={<Pencil className="w-3 h-3" />}
          >
            Edit
          </TextPill>
        </div>
      </div>

      <div className="mt-5 grid lg:grid-cols-[1.15fr_0.85fr] gap-4">
        <div className="border border-rule bg-paper-deep/35 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Gauge className="w-4 h-4 text-red" strokeWidth={1.5} />
            <Smallcaps tone="ink">Speed · pitch preserved</Smallcaps>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {rates.map((rate) => (
              <TextPill
                key={rate}
                size="sm"
                active={Math.abs((player?.playbackRate ?? 1) - rate) < 0.01}
                disabled={!player?.available}
                onClick={() => player?.setPlaybackRate(rate)}
              >
                {rate.toFixed(rate % 1 === 0 ? 0 : 2)}×
              </TextPill>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-5 mb-3">
            <Scissors className="w-4 h-4 text-red" strokeWidth={1.5} />
            <Smallcaps tone="ink">A/B loop</Smallcaps>
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            <TextPill
              size="sm"
              disabled={!player?.available}
              onClick={() => {
                if (!player) return;
                setLoopStart(player.currentTime);
                setLoopEnd(null);
              }}
            >
              A · {loopStart === null ? "Set" : formatDuration(loopStart)}
            </TextPill>
            <TextPill size="sm" disabled={!player?.available || loopStart === null} onClick={markLoopEnd}>
              B · {loopEnd === null ? "Set" : formatDuration(loopEnd)}
            </TextPill>
            <TextPill
              size="sm"
              active={Boolean(player?.loopEnabled)}
              disabled={!player?.loopRange}
              onClick={() => player?.setLoopEnabled(!player.loopEnabled)}
              icon={<Repeat2 className="w-3 h-3" />}
            >
              Loop
            </TextPill>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 items-center">
            <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-ink-mute mr-1">前后留白</span>
            {PADDING_OPTIONS.map((padding) => (
              <TextPill
                key={padding}
                size="sm"
                active={player?.paddingSec === padding}
                onClick={() => player?.setPaddingSec(padding)}
              >
                {padding}s
              </TextPill>
            ))}
          </div>
        </div>

        <div className="border border-rule p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Guitar className="w-4 h-4 text-red" strokeWidth={1.5} />
              <Smallcaps tone="ink">Practice sections</Smallcaps>
            </div>
            {draft.bpm ? <Smallcaps>{Math.round(draft.bpm)} BPM</Smallcaps> : null}
          </div>
          {draft.sections.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {draft.sections.map((section) => (
                <TextPill
                  key={section.id}
                  size="sm"
                  disabled={!player?.available}
                  active={player?.loopRange?.startTime === section.startTime && player?.loopRange?.endTime === section.endTime}
                  onClick={() => player?.playSegment(section.startTime, section.endTime, true)}
                  title={`${formatDuration(section.startTime)}–${formatDuration(section.endTime)}`}
                >
                  {section.title}
                </TextPill>
              ))}
            </div>
          ) : (
            <p className="font-serif italic text-[14px] text-ink-soft">还没有段落。可在编辑区用当前 A/B 范围新增。</p>
          )}
          <div className="mt-4 pt-3 border-t border-rule font-serif text-[12px] text-ink-soft leading-relaxed">
            {practice.status === "pending"
              ? "音频已就绪，等待 M5 Mac 生成可编辑和弦草稿。"
              : practice.status === "failed"
                ? `上次分析失败：${practice.lastError}`
                : practice.status === "ready"
                  ? `分析完成 · ${draft.chords.length} 个和弦 · ${draft.sections.length} 个段落`
                  : practice.hasAudio
                    ? "音频可以练习；尚未分析和弦。"
                    : "YouTube 可以先慢放和循环；上传自己的音频后可保留练习版本。"}
          </div>
        </div>
      </div>

      {player?.source === "local" && MIXER_TRACKS.every(({ track }) => practice.data.stems.includes(track)) ? (
        <div className="mt-4 border border-rule p-4">
          <div className="flex items-center gap-2 mb-3">
            <Smallcaps tone="ink">4-stem mixer</Smallcaps>
            <span className="font-serif italic text-[12px] text-ink-mute">分轨同步播放 · M 静音 · S 独听</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {MIXER_TRACKS.map(({ track, label }) => {
              const setting = player.trackMix[track];
              return (
                <div key={track} className="border border-rule bg-paper-deep/30 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-serif text-[15px] text-ink">{label}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => player.toggleTrackMute(track)}
                        className={cn(
                          "w-6 h-6 border font-mono text-[9px] transition",
                          setting.muted ? "bg-red text-paper border-red" : "border-rule text-ink-mute hover:border-ink"
                        )}
                        aria-label={`${setting.muted ? "取消静音" : "静音"}${label}`}
                      >
                        M
                      </button>
                      <button
                        type="button"
                        onClick={() => player.toggleTrackSolo(track)}
                        className={cn(
                          "w-6 h-6 border font-mono text-[9px] transition",
                          setting.solo ? "bg-ink text-paper border-ink" : "border-rule text-ink-mute hover:border-ink"
                        )}
                        aria-label={`${setting.solo ? "取消独听" : "独听"}${label}`}
                      >
                        S
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={setting.volume}
                      onChange={(event) => player.setTrackVolume(track, Number(event.target.value))}
                      className="w-full accent-[var(--red)]"
                      aria-label={`${label}音量`}
                    />
                    <span className="w-8 text-right font-mono text-[9px] tabular text-ink-mute">
                      {Math.round(setting.volume * 100)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="mt-4 border border-ink p-4 md:p-5">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <Smallcaps tone="ink">Editable practice sheet</Smallcaps>
              <p className="font-serif text-[13px] text-ink-soft mt-1">Capo 会把谱面换成对应指法，播放音高不变。</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <label className="flex items-center gap-2 border border-rule px-2 py-1">
                <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-ink-mute">Capo</span>
                <select
                  value={draft.capo}
                  onChange={(event) => setDraft((current) => ({ ...current, capo: Number(event.target.value) }))}
                  className="bg-transparent font-mono text-[11px] outline-none"
                >
                  {Array.from({ length: 13 }, (_, value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <TextPill
                size="sm"
                active={draft.chordDisplay === "simple"}
                onClick={() => setDraft((current) => ({ ...current, chordDisplay: "simple" }))}
              >
                Simple
              </TextPill>
              <TextPill
                size="sm"
                active={draft.chordDisplay === "full"}
                onClick={() => setDraft((current) => ({ ...current, chordDisplay: "full" }))}
              >
                Full
              </TextPill>
              <TextPill
                size="sm"
                icon={<Download className="w-3 h-3" />}
                onClick={() => downloadText(
                  `${title || "utahon"}.cho`,
                  chordProText(title, artist, lines, {
                    ...draft,
                    chords: anchorChordsToLines(draft.chords, lines),
                  })
                )}
              >
                ChordPro
              </TextPill>
            </div>
          </div>

          <div className="mt-5 grid xl:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-ink">
                <Smallcaps tone="ink">Chords · {draft.chords.length}</Smallcaps>
                <TextPill size="sm" onClick={addChord} icon={<Plus className="w-3 h-3" />}>Current time</TextPill>
              </div>
              <div className="max-h-[360px] scroll-y">
                {draft.chords.map((chord) => (
                  <div key={chord.id} className="grid grid-cols-[minmax(70px,1fr)_72px_72px_32px] gap-2 py-2 border-b border-rule items-end">
                    <label className="grid gap-1">
                      <span className="font-mono text-[8px] tracking-[0.16em] uppercase text-ink-mute">Chord</span>
                      <input
                        value={chord.symbol}
                        onChange={(event) => updateChord(chord.id, { symbol: event.target.value })}
                        className="min-w-0 border border-rule bg-paper px-2 py-1.5 font-serif text-[14px] outline-none focus:border-ink"
                      />
                    </label>
                    <NumericInput
                      value={chord.startTime}
                      onChange={(value) => updateChord(chord.id, {
                        startTime: value,
                        lineIndex: undefined,
                        tokenIndex: undefined,
                      })}
                      label="Start"
                    />
                    <NumericInput value={chord.endTime} onChange={(value) => updateChord(chord.id, { endTime: value })} label="End" />
                    <button
                      type="button"
                      onClick={() => setDraft((current) => ({ ...current, chords: current.chords.filter((item) => item.id !== chord.id) }))}
                      className="w-8 h-8 border border-rule text-ink-mute hover:text-red hover:border-red transition flex items-center justify-center"
                      aria-label={`删除 ${chord.symbol} 和弦`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {draft.chords.length === 0 ? <p className="font-serif italic text-[13px] text-ink-soft py-4">自动分析完成后会出现在这里，也可以从当前播放位置手动添加。</p> : null}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-ink">
                <Smallcaps tone="ink">Sections · {draft.sections.length}</Smallcaps>
                <TextPill size="sm" onClick={addSection} icon={<Plus className="w-3 h-3" />}>A/B range</TextPill>
              </div>
              <div className="max-h-[360px] scroll-y">
                {draft.sections.map((section) => (
                  <div key={section.id} className="grid grid-cols-[88px_minmax(80px,1fr)_68px_68px_32px] gap-2 py-2 border-b border-rule items-end">
                    <label className="grid gap-1">
                      <span className="font-mono text-[8px] tracking-[0.16em] uppercase text-ink-mute">Type</span>
                      <select
                        value={section.label}
                        onChange={(event) => updateSection(section.id, { label: event.target.value as SongSection["label"] })}
                        className="h-8 min-w-0 border border-rule bg-paper px-1 font-mono text-[9px] outline-none focus:border-ink"
                      >
                        {section.label === "full" ? <option value="full">全曲</option> : null}
                        {SECTION_LABELS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-1">
                      <span className="font-mono text-[8px] tracking-[0.16em] uppercase text-ink-mute">Title</span>
                      <input
                        value={section.title}
                        onChange={(event) => updateSection(section.id, { title: event.target.value })}
                        className="min-w-0 border border-rule bg-paper px-2 py-1.5 font-serif text-[13px] outline-none focus:border-ink"
                      />
                    </label>
                    <NumericInput value={section.startTime} onChange={(value) => updateSection(section.id, { startTime: value })} label="Start" />
                    <NumericInput value={section.endTime} onChange={(value) => updateSection(section.id, { endTime: value })} label="End" />
                    <button
                      type="button"
                      onClick={() => setDraft((current) => ({ ...current, sections: current.sections.filter((item) => item.id !== section.id) }))}
                      className="w-8 h-8 border border-rule text-ink-mute hover:text-red hover:border-red transition flex items-center justify-center"
                      aria-label={`删除 ${section.title} 段落`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-rule">
            <div className={cn("font-serif text-[13px]", error ? "text-red" : "text-ink-soft")}>
              {error || notice || "修改只会影响这首歌的练习谱。"}
            </div>
            <TextPill
              tone="solid"
              disabled={saving}
              onClick={() => void handleSave()}
              icon={saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            >
              Save sheet
            </TextPill>
          </div>
        </div>
      ) : notice || error ? (
        <p className={cn("font-serif text-[13px] mt-3", error ? "text-red" : "text-ink-soft")}>{error || notice}</p>
      ) : null}
    </section>
  );
}
