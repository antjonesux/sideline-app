"use client";

import { deriveFieldZoneForPreview, deriveScenarioForPreview } from "@/lib/csvImportPreview";
import type { ParsedCsvRow } from "@/lib/importCsv";
import { normalizePlayName } from "@/lib/utils";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
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
  return "text-slate-500 dark:text-slate-500";
}

type Props = {
  rows: ParsedCsvRow[];
  errorByLine: Map<number, string[]>;
};

export function ImportPreviewTable({ rows, errorByLine }: Props) {
  const sorted = useMemo(() => [...rows].sort((a, b) => parseInt(a.play_number, 10) - parseInt(b.play_number, 10)), [rows]);

  const columns: DataTableColumn<ParsedCsvRow & { _borderTop?: boolean }>[] = useMemo(
    () => [
      {
        key: "play_number",
        header: "#",
        width: "w-[44px]",
        render: (r) => <span className="font-mono text-xs text-slate-300">{r.play_number}</span>,
      },
      {
        key: "drive_number",
        header: "DRV",
        width: "w-[44px]",
        render: (r) => (
          <span className={`font-mono text-xs ${r._borderTop ? "text-amber-400" : "text-slate-300"}`}>{r.drive_number}</span>
        ),
      },
      {
        key: "quarter",
        header: "Q",
        width: "w-[40px]",
        render: (r) => <span className="font-mono text-xs text-slate-400">{quarterLabel(r.quarter)}</span>,
      },
      {
        key: "dn_dist",
        header: "DN & DIST",
        width: "w-[72px]",
        render: (r) => (
          <span className="font-mono text-xs text-slate-300">
            {r.down} & {r.distance}
          </span>
        ),
      },
      {
        key: "yard_line",
        header: "YARD LINE",
        width: "w-[88px]",
        render: (r) => <span className="font-mono text-xs text-slate-300">{r.yard_line}</span>,
      },
      {
        key: "formation",
        header: "FORMATION",
        width: "min-w-[100px]",
        render: (r) => (
          <span className="max-w-[140px] truncate font-sans text-xs text-slate-300" title={r.formation}>
            {r.formation}
          </span>
        ),
      },
      {
        key: "play_name",
        header: "PLAY",
        width: "min-w-[120px]",
        render: (r) => (
          <span className="max-w-[160px] truncate font-mono text-xs text-slate-200" title={normalizePlayName(r.play_name)}>
            {normalizePlayName(r.play_name)}
          </span>
        ),
      },
      {
        key: "result",
        header: "RESULT",
        width: "min-w-[100px]",
        render: (r) => <ResultBadge label={r.result} />,
      },
      {
        key: "yards",
        header: "YDS",
        width: "w-[52px]",
        render: (r) => {
          const y = parseInt(r.yards.replace(/,/g, ""), 10);
          return (
            <span className={`font-mono text-xs ${Number.isNaN(y) ? "text-slate-500" : yardsClass(y)}`}>{r.yards}</span>
          );
        },
      },
      {
        key: "scenario",
        header: "SCENARIO",
        width: "min-w-[88px]",
        render: (r) => {
          const down = parseInt(r.down, 10);
          const dist = parseInt(r.distance, 10);
          const scenario =
            !Number.isNaN(down) && !Number.isNaN(dist) ? deriveScenarioForPreview(down, dist) : "—";
          return <span className="font-sans text-xs text-slate-400">{scenario}</span>;
        },
      },
      {
        key: "zone",
        header: "ZONE",
        width: "min-w-[72px]",
        render: (r) => {
          const zone = r.yard_line ? deriveFieldZoneForPreview(r.yard_line) : "—";
          return <span className="font-sans text-xs text-slate-400">{zone}</span>;
        },
      },
    ],
    [],
  );

  const tableRows = useMemo(() => {
    return sorted.map((r, i) => ({
      ...r,
      _borderTop: i > 0 && r.drive_number !== sorted[i - 1]?.drive_number,
    }));
  }, [sorted]);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 max-h-[340px] min-w-0 overflow-auto">
      <DataTable
        stickyHeader
        wrapperClassName="-mx-0 overflow-x-auto px-0"
        columns={columns}
        rows={tableRows}
        getRowKey={(r) => `${r._line}-${r.play_number}`}
        rowClassName={(r) => {
          const errs = errorByLine.get(r._line);
          const top = r._borderTop ? "border-t-2 border-amber-500" : "";
          return `${top} ${errs?.length ? "bg-red-950/25" : ""}`.trim();
        }}
      />
    </div>
  );
}
