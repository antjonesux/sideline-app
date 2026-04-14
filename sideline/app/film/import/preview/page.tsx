"use client";

import { ImportPreview } from "@/components/import/ImportPreview";
import { BackToFilmLink } from "@/components/shared/BackToFilmLink";
import { useImportStore } from "@/store/importStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function FilmImportPreviewPage() {
  const router = useRouter();
  const { parsedRows, setParsedData, setStep } = useImportStore();

  useEffect(() => {
    if (parsedRows.length === 0) {
      router.replace("/film/import");
    }
  }, [parsedRows.length, router]);

  if (parsedRows.length === 0) {
    return (
      <section className="pb-8">
        <BackToFilmLink />
        <p className="mt-6 text-sm text-slate-400">Loading preview…</p>
      </section>
    );
  }

  return (
    <section className="space-y-8 pb-8">
      <BackToFilmLink />

      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:p-6">
        <ImportPreview
          onReupload={() => {
            setParsedData([], [], []);
            setStep(1);
            router.push("/film/import");
          }}
          onNext={() => {
            setStep(3);
            router.push("/film/import/save");
          }}
        />
      </div>
    </section>
  );
}
