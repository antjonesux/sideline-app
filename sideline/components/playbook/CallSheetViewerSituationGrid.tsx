"use client";

import {
  callSheetScenarioDisplayName,
  callSheetScenarioMarker,
  callSheetScenarioPlayCountLabel,
  callSheetViewerScenarioHelperText,
} from "@/lib/playbookUtils";
import type { SheetScenarioBlock } from "@/lib/types";

const situationCardClass =
  "flex min-h-[7.5rem] min-w-0 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-start transition-colors active:border-emerald-600/50 active:bg-slate-800/70";

export function CallSheetViewerSituationGrid({
  scenarios,
  onSelect,
}: {
  scenarios: SheetScenarioBlock[];
  onSelect: (scenario: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3" role="list" aria-label="Tactical situations">
      {scenarios.map((s) => {
        const count = s.plays.length;
        const helper = callSheetViewerScenarioHelperText(s.scenario);
        const marker = callSheetScenarioMarker(s.scenario);

        return (
          <button
            key={s.id}
            type="button"
            role="listitem"
            onClick={() => onSelect(s.scenario)}
            className={situationCardClass}
          >
            <div className="flex items-start gap-2">
              <span className="pt-0.5 font-mono text-base leading-none text-slate-500" aria-hidden>
                {marker}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-heading text-sm font-bold uppercase tracking-wide text-white">
                    {callSheetScenarioDisplayName(s.scenario)}
                  </p>
                  <p className="shrink-0 font-body text-xs text-slate-500">{callSheetScenarioPlayCountLabel(count)}</p>
                </div>
                {helper ? (
                  <p className="mt-1 line-clamp-2 font-body text-xs text-slate-400">{helper}</p>
                ) : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
