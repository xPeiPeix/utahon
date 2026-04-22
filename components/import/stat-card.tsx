import type { ProgressEvent } from "@/lib/ingest";
import { Smallcaps } from "@/components/editorial-shell";

export type Derived = {
  total: number | null;
  processed: number;
  succeeded: Extract<ProgressEvent, { kind: "ok" }>[];
  placeholders: Extract<ProgressEvent, { kind: "placeholder" }>[];
  failed: Extract<ProgressEvent, { kind: "fail" }>[];
  skippedNotSong: Extract<ProgressEvent, { kind: "skip-not-song" }>[];
  skippedShort: Extract<ProgressEvent, { kind: "skip-short" }>[];
  skippedExisting: Extract<ProgressEvent, { kind: "skip-existing" }>[];
};

export function deriveFromEvents(
  events: Array<ProgressEvent & { ts?: string }>
): Derived {
  const d: Derived = {
    total: null,
    processed: 0,
    succeeded: [],
    placeholders: [],
    failed: [],
    skippedNotSong: [],
    skippedShort: [],
    skippedExisting: [],
  };
  for (const e of events) {
    switch (e.kind) {
      case "list-start":
        d.total = e.total;
        break;
      case "ok":
        d.succeeded.push(e);
        d.processed++;
        break;
      case "placeholder":
        d.placeholders.push(e);
        d.processed++;
        break;
      case "fail":
        d.failed.push(e);
        d.processed++;
        break;
      case "skip-not-song":
        d.skippedNotSong.push(e);
        d.processed++;
        break;
      case "skip-short":
        d.skippedShort.push(e);
        d.processed++;
        break;
      case "skip-existing":
        d.skippedExisting.push(e);
        d.processed++;
        break;
      case "search-video":
        break;
    }
  }
  return d;
}

export function StatsGrid({
  derived,
  totalLabel = "Videos",
}: {
  derived: Derived;
  totalLabel?: string;
}) {
  const stats = [
    {
      label: derived.total !== null ? totalLabel : "Processed",
      value: derived.total ?? derived.processed,
      tone: "ink" as const,
    },
    { label: "Filed", value: derived.succeeded.length, tone: "ink" as const },
    {
      label: "Placeholders",
      value: derived.placeholders.length,
      tone: "red" as const,
    },
    { label: "Failed", value: derived.failed.length, tone: "ink" as const },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s, i) => (
        <div key={i} className="border border-rule p-3.5">
          <Smallcaps>{s.label}</Smallcaps>
          <div
            className={`font-serif italic font-medium text-[30px] md:text-[34px] leading-none mt-1.5 tabular ${
              s.tone === "red" ? "text-red" : "text-ink"
            }`}
          >
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}
