"use client";

import { CSVUploader } from "@/components/import/CSVUploader";
import { TemplateDownload } from "@/components/import/TemplateDownload";
import { BackNavLink } from "@/components/shared/BackNavLink";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { IMPORT_FAILED, IMPORT_PARTIAL } from "@/lib/coachCopy";
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
      <BackNavLink />

      <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="font-heading text-3xl leading-none font-bold uppercase tracking-[0.14em] text-white sm:text-4xl">Import film</h1>
            <p className="font-sans text-sm text-slate-400">Upload calls as a CSV.</p>
          </div>
          <div className="w-full sm:w-auto">
            <TemplateDownload variant="headerInline" />
          </div>
        </div>

        <div className="mt-6">
          <CSVUploader
            embedded
            onParsed={(parsed, valid, errors) => {
              setParseError(null);
              if (valid.length === 0) {
                setParsedData(parsed, valid, errors);
                setParseError("No clean rows in that file. Fix the sheet and upload again.");
                addToast(IMPORT_PARTIAL, "warning");
                return;
              }
              if (errors.length > 0) addToast(IMPORT_PARTIAL, "warning");
              setParsedData(parsed, valid, errors);
              setGameSetup(null);
              setImportedSession(null);
              setStep(2);
              router.push("/film/import/preview");
            }}
            onParseFatal={(msg) => {
              setParseError(msg);
              addToast(IMPORT_FAILED, "error");
            }}
          />
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
