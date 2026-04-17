"use client";

import { deriveFieldZoneForPreview, deriveScenarioForPreview } from "@/lib/csvImportPreview";
import type { ParsedCsvRow } from "@/lib/importCsv";
import { useMemo } from "react";
import { ResultBadge } from "./ResultBadge";

function quarterLabel(q: string): string {
  const t = q.trim().toUpperCase();
  if (t === "OT" || t === "5") return "OT";
  return `Q${q}`;
}

function yardsClass(y: number): string {
  if (y > 0) return "text-emerald-400";
  if (y < 0) return "text-red-400";
  return "text-slate-500";
}

type Props = {
  rows: ParsedCsvRow[];
  errorByLine: Map<number, string[]>;
};

export function ImportPreviewTable({ rows, errorByLine }: Props) {
  const sorted = useMemo(() => [...rows].sort((a, b) => parseInt(a.play_number, 10) - parseInt(b.play_number, 10)), [rows]);

  return (
    <div className="app-card max-h-[340px] overflow-auto">
      <table className="min-w-full divide-y divide-slate-800 text-left text-xs">
        <thead className="app-accordion-header-row sticky top-0 z-10">
          <tr className="font-mono uppercase tracking-wide text-slate-500">
            <th className="px-2 py-2">#</th>
            <th className="px-2 py-2">Drv</th>
            <th className="px-2 py-2">Q</th>
            <th className="px-2 py-2">Dn &amp; Dist</th>
            <th className="px-2 py-2">Yard Line</th>
            <th className="px-2 py-2">Formation</th>
            <th className="px-2 py-2">Play</th>
            <th className="px-2 py-2">Result</th>
            <th className="px-2 py-2">Yds</th>
            <th className="px-2 py-2">Scenario</th>
            <th className="px-2 py-2 pr-4">Zone</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 bg-slate-900/80">
          {sorted.map((r, i) => {
            const isNewDrive = i > 0 && r.drive_number !== sorted[i - 1].drive_number;
            const errs = errorByLine.get(r._line);
            const down = parseInt(r.down, 10);
            const dist = parseInt(r.distance, 10);
            const yards = parseInt(r.yards.replace(/,/g, ""), 10);
            const scenario =
              !Number.isNaN(down) && !Number.isNaN(dist) ? deriveScenarioForPreview(down, dist) : "—";
            const zone = r.yard_line ? deriveFieldZoneForPreview(r.yard_line) : "—";
            const borderTop = isNewDrive ? "border-t-2 border-amber-500" : "";

            return (
              <tr key={`${r._line}-${r.play_number}`} className={`${borderTop} ${errs?.length ? "bg-red-950/25" : ""}`}>
                <td className="px-2 py-1.5 font-mono text-slate-300">{r.play_number}</td>
                <td className={`px-2 py-1.5 font-mono ${isNewDrive ? "text-amber-400" : "text-slate-300"}`}>{r.drive_number}</td>
                <td className="px-2 py-1.5 font-mono text-slate-400">{quarterLabel(r.quarter)}</td>
                <td className="px-2 py-1.5 font-mono text-slate-300">{`${r.down} & ${r.distance}`}</td>
                <td className="px-2 py-1.5 font-mono text-slate-300">{r.yard_line}</td>
                <td className="max-w-[100px] truncate px-2 py-1.5 text-slate-300" title={r.formation}>
                  {r.formation}
                </td>
                <td className="max-w-[120px] truncate px-2 py-1.5 text-slate-200" title={r.play_name}>
                  {r.play_name}
                </td>
                <td className="px-2 py-1.5">
                  <ResultBadge label={r.result} />
                </td>
                <td className={`px-2 py-1.5 font-mono ${Number.isNaN(yards) ? "text-slate-500" : yardsClass(yards)}`}>{r.yards}</td>
                <td className="px-2 py-1.5 text-slate-400">{scenario}</td>
                <td className="px-2 py-1.5 pr-4 text-slate-400">{zone}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
