"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { DataTable } from "@/components/shared/DataTable";
import { drivePlayTableColumns, type DrivePlayTableRow } from "@/components/shared/drivePlayTableColumns";
import { csvResultLabelToDbTag, normalizeCsvResult } from "@/lib/importCsv";
import type { ParsedCsvRow } from "@/lib/importCsv";
import { useMemo, useState } from "react";
import { ResultBadge } from "./ResultBadge";

type Props = { rows: ParsedCsvRow[] };

function csvRowToDrivePlay(p: ParsedCsvRow): DrivePlayTableRow & { id: string } {
  const y = parseInt(p.yards.replace(/,/g, ""), 10);
  const canon = normalizeCsvResult(p.result);
  return {
    id: `csv-${p._line}`,
    formation: p.formation,
    play_name: p.play_name,
    result_tag: canon ? csvResultLabelToDbTag(canon) : p.result,
    yards_gained: Number.isNaN(y) ? 0 : y,
    down: parseInt(p.down, 10),
    distance: parseInt(p.distance, 10),
    is_inches: undefined,
  };
}

export function ImportPreviewDrives({ rows }: Props) {
  const [openDrive, setOpenDrive] = useState<number | null>(null);
  const driveCols = useMemo(() => drivePlayTableColumns(), []);

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

        const playCount = plays.length;
        const yardsLabel = yards >= 0 ? `+${yards}` : String(yards);
        const yardsClass = yards > 0 ? "text-emerald-500" : yards < 0 ? "text-red-600" : "text-slate-400";
        const lastResultCanon = last ? normalizeCsvResult(last.result) : null;

        return (
          <div key={num} className="app-card overflow-hidden">
            <button
              type="button"
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse drive plays" : "Expand drive plays"}
              onClick={() => setOpenDrive(expanded ? null : num)}
              className="app-no-press-scale flex w-full min-w-0 items-center gap-3 border-b border-slate-800/90 bg-slate-900 py-3 pl-4 pr-3 text-left transition-colors hover:bg-slate-800/50"
            >
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-0 gap-y-1 text-[13px] text-slate-400">
                <span className="font-heading shrink-0 text-[15px] font-bold uppercase tracking-[1.2px] text-amber-400">
                  Drive {num}
                </span>
                {last ? (
                  <>
                    <span className="mx-1.5 shrink-0 text-slate-500">·</span>
                    <span className="shrink-0">
                      <ResultBadge label={lastResultCanon ? csvResultLabelToDbTag(lastResultCanon) : last.result} />
                    </span>
                  </>
                ) : null}
                <span className="mx-1.5 shrink-0 text-slate-500">·</span>
                <span className="font-body whitespace-nowrap">{qLabel}</span>
                <span className="mx-1.5 shrink-0 text-slate-500">·</span>
                <span className="whitespace-nowrap">
                  <span className="font-mono tabular-nums text-slate-300">{playCount}</span>
                  <span className="font-body ml-1">{playCount === 1 ? "play" : "plays"}</span>
                </span>
                <span className="mx-1.5 shrink-0 text-slate-500">·</span>
                <span className="whitespace-nowrap">
                  <span className={`font-mono tabular-nums ${yardsClass}`}>{yardsLabel}</span>
                  <span className="font-body ml-1">yds</span>
                </span>
              </div>
              <span className="inline-flex size-11 shrink-0 items-center justify-center text-slate-400" aria-hidden>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </button>
            {expanded ? (
              <div className="border-t border-slate-800/80 bg-slate-950/40 px-3 py-1 sm:px-4">
                <DataTable
                  columns={driveCols}
                  rows={plays.map(csvRowToDrivePlay)}
                  getRowKey={(p) => p.id}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
