"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { Button } from "@/components/ui/button";
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
      <h2 className="font-heading text-xl font-bold uppercase tracking-[0.12em] text-slate-100">Preview & confirm</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Calls", value: stats.plays },
          { label: "Drives", value: stats.drives },
          { label: "Total yards", value: stats.yards },
          { label: "TDs", value: stats.tds },
          { label: "Turnovers", value: stats.to },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-center">
            <p className="font-mono text-3xl font-bold tabular-nums text-white">{s.value}</p>
            <p className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {issueRowCount > 0 ? (
        <div className="rounded-lg border border-red-800/30 bg-red-900/20 p-4 text-sm text-red-200" role="alert">
          <button type="button" className="flex w-full items-start justify-between gap-2 text-left" onClick={() => setExpandErrors((e) => !e)}>
            <span className="inline-flex items-center gap-1 font-body">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 8v5m0 4h.01" />
                <path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
              </svg>
              {issueRowCount} row(s) with issues (will be skipped on import)
            </span>
            <span className="shrink-0 font-body text-xs text-red-300/80">{expandErrors ? "Collapse" : "Expand"}</span>
          </button>
          {expandErrors ? (
            <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-red-100/90">
              {firstErrors.map((e) => (
                <li key={e.line}>
                  <span className="font-body">Line </span>
                  <span className="font-mono">{e.line}</span>
                  <span className="font-body">: {e.errors.join("; ")}</span>
                </li>
              ))}
              {validationErrors.length > 5 ? <li>…</li> : null}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-700 bg-slate-900 flex p-1">
        <button
          type="button"
          data-no-press
          onClick={() => setTab("pbp")}
          className={`min-h-11 flex-1 rounded-md py-2 font-body text-xs font-semibold uppercase tracking-wide ${
            tab === "pbp" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-500"
          }`}
        >
          Play-by-play
        </button>
        <button
          type="button"
          data-no-press
          onClick={() => setTab("drive")}
          className={`min-h-11 flex-1 rounded-md py-2 font-body text-xs font-semibold uppercase tracking-wide ${
            tab === "drive" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-500"
          }`}
        >
          By drive
        </button>
      </div>

      <div
        key={tab}
        className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-100"
      >
        {tab === "pbp" ? (
          <ImportPreviewTable rows={parsedRows} errorByLine={errorByLine} />
        ) : (
          <ImportPreviewDrives rows={parsedRows} />
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" variant="secondary" className="py-3 sm:max-w-[200px]" disabled={continueBusy} onClick={onReupload}>
          Re-upload
        </Button>
        <Button
          type="button"
          variant="default"
          size="lg"
          className="w-full flex-1"
          disabled={validRows.length === 0 || continueBusy}
          onClick={async () => {
            setContinueBusy(true);
            try {
              await onNext();
            } finally {
              setContinueBusy(false);
            }
          }}
        >
          {continueBusy ? "Working…" : importTargetSessionId ? "Import to current game" : "Next: tag this game"}
        </Button>
      </div>
    </div>
  );
}
