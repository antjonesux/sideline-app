"use client";

import { useImportStore } from "@/store/importStore";
import { useMemo, useState } from "react";
import { ImportPreviewDrives } from "./ImportPreviewDrives";
import { ImportPreviewTable } from "./ImportPreviewTable";

type Props = {
  onReupload: () => void;
  onNext: () => void | Promise<void>;
};

export function ImportPreview({ onReupload, onNext }: Props) {
  const { parsedRows, validRows, validationErrors, importTargetSessionId } = useImportStore();
  const [continueBusy, setContinueBusy] = useState(false);
  const [tab, setTab] = useState<"pbp" | "drive">("pbp");
  const [expandErrors, setExpandErrors] = useState(false);

  const errorByLine = useMemo(() => {
    const m = new Map<number, string[]>();
    for (const e of validationErrors) m.set(e.line, e.errors);
    return m;
  }, [validationErrors]);

  const issueRowCount = useMemo(() => new Set(validationErrors.map((e) => e.line)).size, [validationErrors]);

  const stats = useMemo(() => {
    const drives = new Set(validRows.map((r) => r.drive_number)).size;
    const yards = validRows.reduce((s, r) => s + r.yards, 0);
    const tds = validRows.filter((r) => r.result === "TOUCHDOWN").length;
    const to = validRows.filter((r) => r.result === "TURNOVER").length;
    return { plays: validRows.length, drives, yards, tds, to };
  }, [validRows]);

  const firstErrors = useMemo(() => validationErrors.slice(0, 5), [validationErrors]);

  return (
    <div className="space-y-6">
      <h2 className="font-display text-3xl tracking-wide text-white">Preview & Confirm</h2>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          { label: "Plays", value: stats.plays },
          { label: "Drives", value: stats.drives },
          { label: "Total Yards", value: stats.yards },
          { label: "TDs", value: stats.tds },
          { label: "Turnovers", value: stats.to },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-center">
            <p className="font-display text-3xl text-white">{s.value}</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {issueRowCount > 0 ? (
        <div
          className="rounded-lg border border-red-800/30 bg-red-900/20 p-4 text-sm text-red-200"
          role="alert"
        >
          <button type="button" className="flex w-full items-start justify-between gap-2 text-left" onClick={() => setExpandErrors((e) => !e)}>
            <span>
              ⚠ {issueRowCount} row(s) with issues (will be skipped on import)
            </span>
            <span className="shrink-0 font-mono text-xs text-red-300/80">{expandErrors ? "▲" : "▼"}</span>
          </button>
          {expandErrors ? (
            <ul className="mt-3 list-inside list-disc space-y-1 font-mono text-xs text-red-100/90">
              {firstErrors.map((e) => (
                <li key={e.line}>
                  Line {e.line}: {e.errors.join("; ")}
                </li>
              ))}
              {validationErrors.length > 5 ? <li>…</li> : null}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="flex rounded-lg border border-slate-700 bg-slate-900 p-1">
        <button
          type="button"
          onClick={() => setTab("pbp")}
          className={`flex-1 rounded-md py-2 font-mono text-xs font-semibold uppercase tracking-wide ${
            tab === "pbp" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-500"
          }`}
        >
          Play-by-Play
        </button>
        <button
          type="button"
          onClick={() => setTab("drive")}
          className={`flex-1 rounded-md py-2 font-mono text-xs font-semibold uppercase tracking-wide ${
            tab === "drive" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-500"
          }`}
        >
          By Drive
        </button>
      </div>

      {tab === "pbp" ? (
        <ImportPreviewTable rows={parsedRows} errorByLine={errorByLine} />
      ) : (
        <ImportPreviewDrives rows={parsedRows} />
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={continueBusy}
          onClick={onReupload}
          className="rounded-lg border border-slate-600 bg-transparent px-4 py-3 font-mono text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
        >
          ← Re-upload
        </button>
        <button
          type="button"
          disabled={validRows.length === 0 || continueBusy}
          onClick={async () => {
            setContinueBusy(true);
            try {
              await onNext();
            } finally {
              setContinueBusy(false);
            }
          }}
          className="flex-1 rounded-lg bg-emerald-500 py-4 font-display text-xl tracking-wide text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
        >
          {continueBusy ? "Working…" : importTargetSessionId ? "Import to current game" : "Next → Tag This Game"}
        </button>
      </div>
    </div>
  );
}
