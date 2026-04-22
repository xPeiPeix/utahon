import { SkipForward } from "lucide-react";
import { Smallcaps } from "@/components/editorial-shell";

export function ResultSection({
  title,
  icon,
  hint,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 pb-1.5 border-b border-ink">
        <span className="text-ink">{icon}</span>
        <Smallcaps tone="ink">{title}</Smallcaps>
      </div>
      {hint && (
        <p className="font-serif italic text-[12px] text-ink-soft mt-1.5">
          {hint}
        </p>
      )}
      <div className="mt-2">{children}</div>
    </section>
  );
}

export function SkipLine({ label, n }: { label: string; n: number }) {
  return (
    <li className="flex items-baseline justify-between">
      <span className="flex items-center gap-1.5">
        <SkipForward className="w-3 h-3" strokeWidth={1.5} />
        {label}
      </span>
      <span className="tabular text-ink">{n}</span>
    </li>
  );
}
