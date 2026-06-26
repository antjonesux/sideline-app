"use client";

import { CallSheetViewerFullSheet } from "@/components/playbook/CallSheetViewerFullSheet";
import { CallSheetViewerHeader } from "@/components/playbook/CallSheetViewerHeader";
import { CallSheetViewerSituationGrid } from "@/components/playbook/CallSheetViewerSituationGrid";
import {
  CALL_SHEET_VIEWER_TAB_FULL,
  CALL_SHEET_VIEWER_TAB_HINT,
  CALL_SHEET_VIEWER_TAB_NEEDS,
} from "@/lib/coachCopy";
import type { PlaybookSummary, SheetScenarioBlock } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useState } from "react";

type ViewerTab = "needs" | "full";

const tabButtonClass =
  "min-h-11 rounded-md px-2 py-2 font-sans text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500";

export function CallSheetViewerHome({
  sheetName,
  sheets,
  activeSheetId,
  scenarios,
  onSelectSituation,
  showNeedsTab = true,
}: {
  sheetName: string;
  sheets: PlaybookSummary[];
  activeSheetId: string;
  scenarios: SheetScenarioBlock[];
  onSelectSituation: (scenario: string) => void;
  /** Legacy down-and-distance sheets skip the tactical grid tab. */
  showNeedsTab?: boolean;
}) {
  const [tab, setTab] = useState<ViewerTab>(showNeedsTab ? "needs" : "full");

  return (
    <div className="space-y-4">
      <CallSheetViewerHeader sheetName={sheetName} sheets={sheets} activeSheetId={activeSheetId} />

      {showNeedsTab ? (
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1" role="tablist" aria-label="Call sheet views">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "needs"}
            className={cn(tabButtonClass, tab === "needs" ? "bg-slate-800 text-white" : "text-slate-400")}
            onClick={() => setTab("needs")}
          >
            {CALL_SHEET_VIEWER_TAB_NEEDS}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "full"}
            className={cn(tabButtonClass, tab === "full" ? "bg-slate-800 text-white" : "text-slate-400")}
            onClick={() => setTab("full")}
          >
            {CALL_SHEET_VIEWER_TAB_FULL}
          </button>
        </div>
      ) : null}

      {showNeedsTab && tab === "needs" ? (
        <div role="tabpanel">
          <p className="mb-4 font-body text-sm text-slate-400">{CALL_SHEET_VIEWER_TAB_HINT}</p>
          <CallSheetViewerSituationGrid scenarios={scenarios} onSelect={onSelectSituation} />
        </div>
      ) : (
        <div role="tabpanel">
          <CallSheetViewerFullSheet scenarios={scenarios} />
        </div>
      )}
    </div>
  );
}
