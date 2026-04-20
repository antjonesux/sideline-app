"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { useState } from "react";

type Row = { formation: string; count: number; pct: number };

type Props = {
  rows: Row[];
};

export function FormationFrequency({ rows }: Props) {
  const [expanded, setExpanded] = useState(false);
  if (rows.length === 0) {
    return <p className="font-sans text-sm text-slate-500">No formation tallies yet.</p>;
  }
  const top = expanded ? rows : rows.slice(0, 5);
  return (
    <div className="space-y-2">
      {top.map((r) => (
        <div key={r.formation} className="flex items-center gap-3">
          <span className="font-sans min-w-0 max-w-[48%] truncate text-sm text-slate-200 sm:max-w-[52%]">{r.formation}</span>
          <div className="h-[6px] min-w-0 flex-1 overflow-hidden rounded-full bg-slate-700">
            <svg className="h-full w-full text-emerald-500" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden>
              <rect x="0" y="0" width={Math.min(100, r.pct)} height="6" rx="3" fill="currentColor" />
            </svg>
          </div>
          <span className="font-mono w-14 shrink-0 text-left text-[11px] tabular-nums text-slate-400">{r.pct}%</span>
          {r.pct > 20 ? (
            <span className="hidden text-amber-400 sm:inline sm:max-w-[120px]" title="High concentration">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 8v5m0 4h.01" />
                <path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
              </svg>
            </span>
          ) : (
            <span className="w-4 shrink-0" />
          )}
        </div>
      ))}
      {rows.some((r) => r.pct > 20) ? (
        <p className="font-body pt-2 text-xs text-amber-400/95">
          <span className="mr-1 inline-flex align-middle" aria-hidden>
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v5m0 4h.01" />
              <path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
            </svg>
          </span>
          Opponents may key on a formation you use over 20% of the time.
        </p>
      ) : null}
      {rows.length > 5 ? (
        <button type="button" className="font-body text-sm text-emerald-400/90 hover:underline" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show less" : `Show all ${rows.length} formations`}
        </button>
      ) : null}
    </div>
  );
}
