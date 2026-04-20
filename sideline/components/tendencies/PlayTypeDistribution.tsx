"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { useMemo, useState } from "react";

const COLORS: Record<string, string> = {
  Run: "text-emerald-500",
  Pass: "text-blue-500",
  "Play Action": "text-cyan-500",
  Screen: "text-violet-500",
  RPO: "text-amber-500",
  Option: "text-slate-400",
  Other: "text-slate-600",
  Unclassified: "text-slate-600",
};

type Row = { name: string; pct: number; count: number };

type Props = {
  data: Row[];
};

export function PlayTypeDistribution({ data }: Props) {
  const [showAll, setShowAll] = useState(false);
  const rows = useMemo(
    () =>
      data
        .filter((d) => d.name !== "Unclassified")
        .filter((d) => d.count > 0 || d.pct > 0)
        .sort((a, b) => b.pct - a.pct),
    [data],
  );
  const visibleRows = showAll ? rows : rows.slice(0, 8);

  if (rows.length === 0) {
    return <p className="font-sans text-sm text-slate-500">Need more logged calls to split play types.</p>;
  }

  return (
    <div className="app-card p-4">
      <div className="space-y-2">
        {visibleRows.map((row) => {
          const width = Math.max(4, Math.min(100, row.pct));
          return (
            <div key={row.name} className="grid min-h-8 grid-cols-[minmax(110px,1fr)_minmax(120px,2fr)_48px] items-center gap-2 py-1">
              <span className="truncate font-body text-sm text-slate-200">{row.name}</span>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <svg className={`h-full w-full ${COLORS[row.name] ?? "text-slate-500"}`} viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden>
                  <rect x="0" y="0" width={width} height="8" rx="4" fill="currentColor" />
                </svg>
              </div>
              <span className="w-12 text-left font-mono text-sm tabular-nums text-slate-300">{Math.round(row.pct)}%</span>
            </div>
          );
        })}
      </div>
      {rows.length > 8 ? (
        <button type="button" className="mt-3 font-body text-sm text-emerald-300 hover:text-emerald-200" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show top 8" : `Show all (${rows.length})`}
        </button>
      ) : null}
    </div>
  );
}
