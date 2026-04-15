"use client";

import type { ParsedCsvRow } from "@/lib/importCsv";
import { useMemo, useState } from "react";
import { ResultBadge } from "./ResultBadge";

type Props = { rows: ParsedCsvRow[] };

export function ImportPreviewDrives({ rows }: Props) {
  const [openDrive, setOpenDrive] = useState<number | null>(null);

  const drives = useMemo(() => {
    const map = new Map<number, ParsedCsvRow[]>();
    for (const r of rows) {
      const d = parseInt(r.drive_number, 10);
      if (Number.isNaN(d)) continue;
      const list = map.get(d) ?? [];
      list.push(r);
      map.set(d, list);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([num, plays]) => ({
        num,
        plays: [...plays].sort((a, b) => parseInt(a.play_number, 10) - parseInt(b.play_number, 10)),
      }));
  }, [rows]);

  return (
    <div className="space-y-3">
      {drives.map(({ num, plays }) => {
        const yards = plays.reduce((s, p) => {
          const y = parseInt(p.yards.replace(/,/g, ""), 10);
          return s + (Number.isNaN(y) ? 0 : y);
        }, 0);
        const last = plays[plays.length - 1];
        const q = plays[0]?.quarter?.trim() ?? "";
        const qLabel = q.toUpperCase() === "OT" || q === "5" ? "OT" : `Q${q}`;
        const expanded = openDrive === num;

        return (
          <div key={num} className="app-card overflow-hidden">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpenDrive(expanded ? null : num)}
              className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl p-4 text-left transition-colors hover:bg-slate-800/60"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <span className="font-heading text-xl font-bold uppercase tracking-wide text-amber-400">Drive {num}</span>
                <span className="font-mono text-xs uppercase tracking-wide text-slate-500">{qLabel}</span>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span className={`font-mono text-sm font-bold ${yards >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {yards >= 0 ? "+" : ""}
                  {yards} yds
                </span>
                {last ? <ResultBadge label={last.result} /> : null}
                <span
                  className={`ml-1 inline-flex size-8 items-center justify-center rounded-md border border-slate-700 text-slate-400 transition-transform ${
                    expanded ? "rotate-180" : ""
                  }`}
                  aria-hidden
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
            </button>
            {expanded ? (
              <div className="border-t border-slate-800 px-4 pb-4 pt-2">
                <div className="flex flex-wrap gap-2">
                  {plays.map((p) => (
                    <span
                      key={p._line}
                      className="rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-[10px] text-slate-300"
                    >
                      {p.play_name}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
