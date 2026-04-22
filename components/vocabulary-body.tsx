"use client";

import { useMemo, useState } from "react";
import type { VocabEntry } from "@/lib/vocabulary";
import { cn } from "@/lib/utils";
import { VocabCard } from "./vocab-card";
import { Smallcaps } from "./editorial-shell";

type Filter = "all" | "nouns" | "verbs" | "phrases";

const FILTERS: Array<{ key: Filter; label: string; match: (pos: string) => boolean }> = [
  { key: "all", label: "All", match: () => true },
  { key: "nouns", label: "Nouns", match: (p) => /名词|noun|名詞|代词/.test(p) },
  { key: "verbs", label: "Verbs", match: (p) => /动词|verb|動詞|助動詞/.test(p) },
  {
    key: "phrases",
    label: "Phrases",
    match: (p) => /短语|phrase|連語|连语/.test(p),
  },
];

export function VocabularyBody({ entries }: { entries: VocabEntry[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const songCount = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      if (e.sourceSongTitle) set.add(e.sourceSongTitle);
    }
    return set.size;
  }, [entries]);

  const filtered = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter) ?? FILTERS[0];
    return entries.filter((e) => f.match(e.pos || ""));
  }, [entries, filter]);

  return (
    <>
      <div className="flex flex-wrap justify-between gap-2 py-2.5 md:py-3 border-b border-rule">
        <Smallcaps>
          {entries.length} words · from {songCount} songs
        </Smallcaps>
        <div className="flex gap-1.5 overflow-x-auto scroll-y flex-nowrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex items-baseline gap-1.5 px-2.5 py-1 border whitespace-nowrap transition",
                "font-mono text-[9.5px] tracking-[0.14em] uppercase",
                filter === f.key
                  ? "bg-ink text-paper border-ink"
                  : "border-rule text-ink-soft hover:border-ink hover:text-ink"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <Empty />
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center font-serif italic text-[18px] text-ink-soft">
          当前分类下没有词喵～
        </div>
      ) : (
        <div className="mt-4 md:mt-6 grid md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-x-12 gap-y-0">
          {filtered.map((entry) => (
            <VocabCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </>
  );
}

function Empty() {
  return (
    <div className="py-14 md:py-20 text-center">
      <Smallcaps>Commonplace book</Smallcaps>
      <div className="font-serif italic text-[26px] md:text-[32px] leading-[1.1] text-ink mt-4">
        Nothing caught yet.
      </div>
      <div className="mt-2 font-serif italic text-[14px] md:text-[16px] text-ink-soft">
        Open any song and tap a word to file it here.
      </div>
    </div>
  );
}
