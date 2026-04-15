"use client";

import { CSVUploader } from "@/components/import/CSVUploader";
import { TemplateDownload } from "@/components/import/TemplateDownload";
import { BackToFilmLink } from "@/components/shared/BackToFilmLink";
import { validateAllRows, type ParsedCsvRow, type ValidatedImportPlay } from "@/lib/importCsv";
import { IMPORT_SAMPLE_PLAYS } from "@/lib/importSamplePlays";
import { useImportStore } from "@/store/importStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function validatedToParsedRows(plays: ValidatedImportPlay[]): ParsedCsvRow[] {
  return plays.map((p, i) => ({
    _line: i + 2,
    drive_number: String(p.drive_number),
    play_number: String(p.play_number),
    quarter: p.quarter >= 5 ? "OT" : String(p.quarter),
    down: String(p.down),
    distance: String(p.distance),
    yard_line: p.yard_line,
    formation: p.formation,
    play_name: p.play_name,
    result: p.result,
    yards: String(p.yards),
    score_context: p.score_context ?? "",
    note: p.note ?? "",
    zone: p.zone ?? "",
  }));
}

export default function FilmCsvImportPage() {
  const router = useRouter();
  const setParsedData = useImportStore((s) => s.setParsedData);
  const setStep = useImportStore((s) => s.setStep);
  const setGameSetup = useImportStore((s) => s.setGameSetup);
  const setImportedSession = useImportStore((s) => s.setImportedSession);
  const reset = useImportStore((s) => s.reset);
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    reset();
  }, [reset]);

  return (
    <section className="space-y-8 pb-8">
      <BackToFilmLink />

      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:p-6">
        <div className="space-y-2">
          <h1 className="font-display text-3xl tracking-wide text-white">Import Game</h1>
          <p className="text-sm text-slate-400">Upload your game plays as a CSV file.</p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <TemplateDownload embedded compact />
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <CSVUploader
              embedded
              onParsed={(parsed, valid, errors) => {
                setParseError(null);
                if (valid.length === 0) {
                  setParsedData(parsed, valid, errors);
                  setParseError("No valid plays found. Fix CSV row issues and upload again.");
                  return;
                }
                setParsedData(parsed, valid, errors);
                setGameSetup(null);
                setImportedSession(null);
                setStep(2);
                router.push("/film/import/preview");
              }}
              onParseFatal={(msg) => setParseError(msg)}
              onSample={() => {
                const parsed = validatedToParsedRows(IMPORT_SAMPLE_PLAYS);
                const { valid_rows, errors } = validateAllRows(parsed);
                setParsedData(parsed, valid_rows, errors);
                setGameSetup(null);
                setImportedSession(null);
                setStep(2);
                router.push("/film/import/preview");
              }}
            />
          </div>
        </div>

        {parseError ? (
          <div className="mt-6 rounded-lg border border-red-800 bg-red-900/20 p-4 text-sm text-red-200" role="alert">
            {parseError}
          </div>
        ) : null}
      </div>
    </section>
  );
}
