"use client";

import { CSVUploader } from "@/components/import/CSVUploader";
import { GameSetupForm } from "@/components/import/GameSetupForm";
import { ImportConfirmation } from "@/components/import/ImportConfirmation";
import { ImportPreview } from "@/components/import/ImportPreview";
import { ImportStepper } from "@/components/import/ImportStepper";
import { TemplateDownload } from "@/components/import/TemplateDownload";
import { IMPORT_SAMPLE_PLAYS } from "@/lib/importSamplePlays";
import { validateAllRows, type ParsedCsvRow, type ValidatedImportPlay } from "@/lib/importCsv";
import { useImportStore } from "@/store/importStore";
import Link from "next/link";
import { useCallback, useState } from "react";

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
  }));
}

export default function ImportPage() {
  const {
    step,
    gameSetup,
    templateDownloaded,
    validRows,
    importedSessionId,
    setStep,
    setGameSetup,
    setTemplateDownloaded,
    setParsedData,
    setImportedSession,
    setImportLoading,
  } = useImportStore();

  const [parseError, setParseError] = useState<string | null>(null);

  const onExecuteImport = useCallback(async () => {
    if (!gameSetup || validRows.length === 0) return;
    setImportLoading(true);
    try {
      const res = await fetch("/api/import/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: gameSetup, plays: validRows }),
      });
      const body = (await res.json().catch(() => ({}))) as { session_id?: string; error?: string };
      if (!res.ok || !body.session_id) {
        window.alert(body.error ?? "Import failed.");
        return;
      }
      setImportedSession(body.session_id);
      setStep(5);
    } finally {
      setImportLoading(false);
    }
  }, [gameSetup, validRows, setImportLoading, setImportedSession, setStep]);

  return (
    <section className="space-y-8 pb-8">
      <div className="flex items-center justify-between gap-4">
        <Link href="/film" className="text-sm text-slate-400 hover:text-slate-200">
          ← Film Room
        </Link>
      </div>

      <ImportStepper step={step} />

      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:p-6">
        {step === 1 ? (
          <GameSetupForm
            key={gameSetup ? `${gameSetup.offensive_team}|${gameSetup.final_score}|${gameSetup.result}` : "new"}
            initialSetup={gameSetup}
            onNext={(s) => {
              setGameSetup(s);
              setStep(2);
            }}
          />
        ) : null}

        {step === 2 && gameSetup ? (
          <TemplateDownload
            templateDownloaded={templateDownloaded}
            onDownloaded={() => setTemplateDownloaded(true)}
            onNext={() => setStep(3)}
          />
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <CSVUploader
              onParsed={(parsed, valid, errors) => {
                setParseError(null);
                setParsedData(parsed, valid, errors);
                setStep(4);
              }}
              onParseFatal={(msg) => setParseError(msg)}
              onSample={() => {
                const parsed = validatedToParsedRows(IMPORT_SAMPLE_PLAYS);
                const { valid_rows, errors } = validateAllRows(parsed);
                setParseError(null);
                setParsedData(parsed, valid_rows, errors);
                setStep(4);
              }}
            />
            {parseError ? (
              <div className="rounded-lg border border-red-800 bg-red-900/20 p-4 text-sm text-red-200" role="alert">
                {parseError}
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 4 ? (
          <ImportPreview
            onReupload={() => {
              setParsedData([], [], []);
              setStep(3);
            }}
            onImport={onExecuteImport}
          />
        ) : null}

        {step === 5 && importedSessionId ? (
          <ImportConfirmation playCount={validRows.length} sessionId={importedSessionId} />
        ) : null}
      </div>
    </section>
  );
}
