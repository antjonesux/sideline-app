"use client";

import type { ParsedCsvRow } from "@/lib/importCsv";
import { useMemo } from "react";
import { ResultBadge } from "./ResultBadge";

type Props = { rows: ParsedCsvRow[] };

export function ImportPreviewDrives({ rows }: Props) {
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

        return (
          <div key={num} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-display text-xl text-amber-400">Drive {num}</span>
                <span className="font-mono text-xs uppercase tracking-wide text-slate-500">{qLabel}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`font-mono text-sm font-bold ${yards >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {yards >= 0 ? "+" : ""}
                  {yards} yds
                </span>
                {last ? <ResultBadge label={last.result} /> : null}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {plays.map((p) => (
                <span key={p._line} className="rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-[10px] text-slate-300">
                  {p.play_name}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
