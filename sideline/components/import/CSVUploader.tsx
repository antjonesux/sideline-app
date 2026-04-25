"use client";

import { validateAllRows, type ParsedCsvRow, type RowValidationIssue, type ValidatedImportPlay } from "@/lib/importCsv";
import Papa from "papaparse";
import { useCallback, useRef, useState } from "react";

type Props = {
  onParsed: (parsed: ParsedCsvRow[], valid: ValidatedImportPlay[], errors: RowValidationIssue[]) => void;
  onParseFatal: (message: string) => void;
  /** Omit section title when nested in a larger layout. */
  embedded?: boolean;
};

export function CSVUploader({ onParsed, onParseFatal, embedded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handleRows = useCallback(
    (data: Record<string, unknown>[]) => {
      if (!data.length) {
        onParseFatal("The CSV has no data rows.");
        return;
      }
      const parsed: ParsedCsvRow[] = data.map((row, i) => {
        const r = row as Record<string, string>;
        return {
          drive_number: String(r.drive_number ?? ""),
          play_number: String(r.play_number ?? ""),
          quarter: String(r.quarter ?? ""),
          down: String(r.down ?? ""),
          distance: String(r.distance ?? ""),
          yard_line: String(r.yard_line ?? ""),
          formation: String(r.formation ?? ""),
          play_name: String(r.play_name ?? ""),
          result: String(r.result ?? ""),
          yards: String(r.yards ?? ""),
          score_context: r.score_context != null ? String(r.score_context) : "",
          note: r.note != null ? String(r.note) : "",
          zone: r.zone != null ? String(r.zone) : "",
          _line: i + 2,
        };
      });

      const { valid_rows, errors } = validateAllRows(parsed);
      onParsed(parsed, valid_rows, errors);
    },
    [onParsed, onParseFatal],
  );

  const parseFile = useCallback(
    (file: File) => {
      const fileName = file.name.toLowerCase();
      if (!(fileName.endsWith(".csv") || fileName.endsWith(".tsv") || fileName.endsWith(".txt"))) {
        onParseFatal("Please choose a CSV-compatible file (.csv, .tsv, .txt).");
        return;
      }
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase(),
        complete: (results) => {
          if (results.errors?.length) {
            const fatal = results.errors.find((e) => e.type === "Quotes" || e.type === "Delimiter");
            if (fatal) {
              onParseFatal(fatal.message || "Could not parse CSV.");
              return;
            }
          }
          const rows = (results.data ?? []).filter((row) =>
            Object.keys(row).some((k) => String((row as Record<string, string>)[k] ?? "").trim() !== ""),
          );
          if (!rows.length) {
            onParseFatal("No rows found. Check headers and data.");
            return;
          }
          handleRows(rows as Record<string, unknown>[]);
        },
        error: (err) => onParseFatal(err.message || "Parse failed."),
      });
    },
    [handleRows, onParseFatal],
  );

  return (
    <div className="space-y-6">
      {embedded ? null : <h3 className="font-heading text-xl font-bold uppercase tracking-[0.12em] text-slate-100 text-2xl">Upload CSV</h3>}

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain,application/vnd.ms-excel"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && parseFile(e.target.files[0])}
      />

      <button
        type="button"
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files[0];
          if (f) parseFile(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex min-h-[180px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed bg-transparent px-4 py-10 text-center transition-colors ${
          drag ? "border-emerald-500" : "border-slate-700 hover:border-emerald-500"
        }`}
      >
        <p className="font-body text-sm text-slate-200">Drop your CSV here or click to browse</p>
        <p className="mt-2 font-body text-xs text-slate-500">sideline_game_template.csv</p>
      </button>

    </div>
  );
}
