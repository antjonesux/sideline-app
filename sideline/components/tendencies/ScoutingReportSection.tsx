"use client";

import { TENDENCIES_SCOUTING_REPORT_SUBHEADING, TENDENCIES_SECTION_HEADING_CLASS } from "@/lib/coachCopy";
import { ScoutingFormationsReport } from "@/components/tendencies/ScoutingFormationsReport";
import { ScoutingReport } from "@/components/tendencies/ScoutingReport";
import type { ScoutingFormationReportRow, ScoutingReportRow } from "@/lib/tendenciesServer";
import { useState } from "react";

type Tab = "situations" | "formations";

type Props = {
  situationRows: ScoutingReportRow[];
  formationRows: ScoutingFormationReportRow[];
};

export function ScoutingReportSection({ situationRows, formationRows }: Props) {
  const [tab, setTab] = useState<Tab>("situations");

  return (
    <section className="space-y-3">
      <div className="space-y-2">
        <h2 className={TENDENCIES_SECTION_HEADING_CLASS}>Scouting Report</h2>
        <p className="font-sans text-[13px] font-normal leading-snug text-slate-400">
          {TENDENCIES_SCOUTING_REPORT_SUBHEADING}
        </p>
        <div className="grid grid-cols-2 border-b border-slate-800" role="tablist" aria-label="Scouting report views">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "situations"}
            onClick={() => setTab("situations")}
            className={`flex min-h-12 items-center justify-center border-b-2 px-2 text-center text-sm font-sans font-medium transition-colors ${
              tab === "situations" ? "border-emerald-500 text-white" : "border-transparent text-slate-400"
            }`}
          >
            Situations
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "formations"}
            onClick={() => setTab("formations")}
            className={`flex min-h-12 items-center justify-center border-b-2 px-2 text-center text-sm font-sans font-medium transition-colors ${
              tab === "formations" ? "border-emerald-500 text-white" : "border-transparent text-slate-400"
            }`}
          >
            Formations
          </button>
        </div>
      </div>

      {tab === "situations" ? (
        <ScoutingReport rows={situationRows} />
      ) : (
        <ScoutingFormationsReport rows={formationRows} />
      )}
    </section>
  );
}
