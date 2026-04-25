"use client";

import { ImportPreview } from "@/components/import/ImportPreview";
import { ImportPreviewSkeleton } from "@/components/shared/AppSkeleton";
import { BackToFilmLink } from "@/components/shared/BackToFilmLink";
import { tendenciesQueryKeys } from "@/lib/tendenciesQueryKeys";
import { useImportStore } from "@/store/importStore";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function FilmImportPreviewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { parsedRows, setParsedData, setStep, reset } = useImportStore();

  useEffect(() => {
    if (parsedRows.length === 0) {
      router.replace("/film/import");
    }
  }, [parsedRows.length, router]);

  if (parsedRows.length === 0) {
    return (
      <section className="space-y-6">
        <BackToFilmLink />
        <ImportPreviewSkeleton />
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <BackToFilmLink />

      <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-6">
        <ImportPreview
          onReupload={() => {
            const attachId = useImportStore.getState().importTargetSessionId;
            setParsedData([], [], []);
            setStep(1);
            router.push(attachId ? `/film/import?game_session_id=${encodeURIComponent(attachId)}` : "/film/import");
          }}
          onNext={async () => {
            const targetId = useImportStore.getState().importTargetSessionId;
            const validRows = useImportStore.getState().validRows;
            if (targetId) {
              const res = await fetch("/api/import/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ game_session_id: targetId, plays: validRows }),
              });
              const body = (await res.json().catch(() => ({}))) as { session_id?: string; error?: string };
              if (!res.ok || !body.session_id) {
                window.alert(body.error ?? "Import failed.");
                return;
              }
              void queryClient.invalidateQueries({ queryKey: tendenciesQueryKeys.all });
              void queryClient.invalidateQueries({ queryKey: ["games", "list"] });
              reset();
              router.push(`/film/${body.session_id}`);
              return;
            }
            setStep(3);
            router.push("/film/import/save");
          }}
        />
      </div>
    </section>
  );
}
