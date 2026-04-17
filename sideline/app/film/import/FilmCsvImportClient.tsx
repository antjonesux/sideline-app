"use client";

import { CSVUploader } from "@/components/import/CSVUploader";
import { TemplateDownload } from "@/components/import/TemplateDownload";
import { BackToFilmLink } from "@/components/shared/BackToFilmLink";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { useImportStore } from "@/store/importStore";
import { useToastStore } from "@/store/toastStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  initialAttachSessionId: string | null;
};

export default function FilmCsvImportClient({ initialAttachSessionId }: Props) {
  const router = useRouter();
  const setParsedData = useImportStore((s) => s.setParsedData);
  const setStep = useImportStore((s) => s.setStep);
  const setGameSetup = useImportStore((s) => s.setGameSetup);
  const setImportedSession = useImportStore((s) => s.setImportedSession);
  const setImportTargetSessionId = useImportStore((s) => s.setImportTargetSessionId);
  const reset = useImportStore((s) => s.reset);
  const [parseError, setParseError] = useState<string | null>(null);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    reset();
    const id = initialAttachSessionId?.trim();
    if (id) setImportTargetSessionId(id);
  }, [reset, setImportTargetSessionId, initialAttachSessionId]);

  return (
    <section className="space-y-8 pb-8">
      <Breadcrumb segments={[{ label: "Film", href: "/film" }, { label: "Import" }]} />
      <BackToFilmLink />

      <div className="app-shell">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="app-page-title">Import game</h1>
            <p className="font-body text-sm text-slate-400">Upload your game plays as a CSV file.</p>
          </div>
          <div className="shrink-0 self-end sm:self-start">
            <TemplateDownload variant="headerInline" />
          </div>
        </div>

        <div className="mt-6">
          <div className="app-card app-card-pad">
            <CSVUploader
              embedded
              onParsed={(parsed, valid, errors) => {
                setParseError(null);
                if (valid.length === 0) {
                  setParsedData(parsed, valid, errors);
                  setParseError("No valid plays found. Fix CSV row issues and upload again.");
                  addToast("Some rows had errors", "warning");
                  return;
                }
                if (errors.length > 0) addToast("Some rows had errors", "warning");
                setParsedData(parsed, valid, errors);
                setGameSetup(null);
                setImportedSession(null);
                setStep(2);
                router.push("/film/import/preview");
              }}
              onParseFatal={(msg) => {
                setParseError(msg);
                addToast("Import failed", "error");
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
