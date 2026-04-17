"use client";

import { ScoutingFormationsReport } from "@/components/tendencies/ScoutingFormationsReport";
import { ScoutingReport } from "@/components/tendencies/ScoutingReport";
import type { ScoutingFormationReportRow, ScoutingReportRow } from "@/lib/tendenciesServer";
import { useState } from "react";

type Tab = "situations" | "formations";

type Props = {
  situationRows: ScoutingReportRow[];
  formationRows: ScoutingFormationReportRow[];
  overallSuccessRate: number;
};

export function ScoutingReportSection({ situationRows, formationRows, overallSuccessRate }: Props) {
  const [tab, setTab] = useState<Tab>("situations");

  return (
    <section className="space-y-3">
      <div className="space-y-2">
        <h2 className="app-section-title">Scouting Report</h2>
        <p className="font-body text-[13px] font-normal leading-snug text-slate-400">
          What an opposing staff might say about your tendencies.
        </p>
        <nav className="inline-flex gap-1 border-b border-slate-800" aria-label="Scouting report views">
          <button
            type="button"
            onClick={() => setTab("situations")}
            className={`font-body shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
              tab === "situations" ? "border-emerald-500 text-emerald-300" : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            Situations
          </button>
          <button
            type="button"
            onClick={() => setTab("formations")}
            className={`font-body shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
              tab === "formations" ? "border-emerald-500 text-emerald-300" : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            Formations
          </button>
        </nav>
      </div>

      {tab === "situations" ? (
        <ScoutingReport rows={situationRows} overallSuccessRate={overallSuccessRate} />
      ) : (
        <ScoutingFormationsReport rows={formationRows} overallSuccessRate={overallSuccessRate} />
      )}
    </section>
  );
}
