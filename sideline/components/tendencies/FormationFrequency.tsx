"use client";

import { useState } from "react";

type Row = { formation: string; count: number; pct: number };

type Props = {
  rows: Row[];
};

export function FormationFrequency({ rows }: Props) {
  const [expanded, setExpanded] = useState(false);
  if (rows.length === 0) {
    return <p className="font-body text-sm text-slate-500">No formation data.</p>;
  }
  const top = expanded ? rows : rows.slice(0, 5);
  return (
    <div className="space-y-2">
      {top.map((r) => (
        <div key={r.formation} className="flex items-center gap-3">
          <span className="font-body min-w-0 max-w-[48%] truncate text-sm text-slate-200 sm:max-w-[52%]">{r.formation}</span>
          <div className="h-[6px] min-w-0 flex-1 overflow-hidden rounded-full bg-slate-700">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, r.pct)}%` }} />
          </div>
          <span className="font-mono w-14 shrink-0 text-left text-[11px] tabular-nums text-slate-400">{r.pct}%</span>
          {r.pct > 20 ? (
            <span className="font-mono hidden text-[10px] text-amber-400 sm:inline sm:max-w-[120px]" title="High concentration">
              ⚠
            </span>
          ) : (
            <span className="w-4 shrink-0" />
          )}
        </div>
      ))}
      {rows.some((r) => r.pct > 20) ? (
        <p className="font-body pt-2 text-xs text-amber-400/95">
          <span className="mr-1">⚠</span> Opponents may key on a formation you use over 20% of the time.
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
