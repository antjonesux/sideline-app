"use client";

import { ImportConfirmation } from "@/components/import/ImportConfirmation";
import { BackNavLink } from "@/components/shared/BackNavLink";
import { useImportStore } from "@/store/importStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function FilmImportCompletePage() {
  const router = useRouter();
  const { importedSessionId, validRows } = useImportStore();

  useEffect(() => {
    if (!importedSessionId) {
      router.replace("/film/import");
    }
  }, [importedSessionId, router]);

  if (!importedSessionId) {
    return (
      <section>
        <BackNavLink />
        <p className="mt-6 text-sm text-slate-400">Finalizing import…</p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <BackNavLink />
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-6">
        <ImportConfirmation playCount={validRows.length} sessionId={importedSessionId} />
      </div>
    </section>
  );
}
