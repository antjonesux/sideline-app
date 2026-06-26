"use client";

import {
  callSheetScenarioDisplayName,
  callSheetScenarioHelperText,
  callSheetScenarioMarker,
  maxSlotsForSheetScenario,
} from "@/lib/playbookUtils";
import type { SheetScenarioBlock } from "@/lib/types";

const situationCardClass =
  "flex min-h-[8.5rem] min-w-0 w-full flex-col rounded-xl border border-slate-700 bg-slate-900 p-4 text-start transition-colors hover:border-emerald-600/50 hover:bg-slate-800/70";

export function CallSheetSituationGrid({
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
        const max = maxSlotsForSheetScenario(s.scenario);
        const helper = callSheetScenarioHelperText(s.scenario);
        const marker = callSheetScenarioMarker(s.scenario);

        return (
          <button
            key={s.id}
            type="button"
            role="listitem"
            onClick={() => onSelect(s.scenario)}
            className={situationCardClass}
          >
            <span className="font-mono text-base leading-none text-slate-500" aria-hidden>
              {marker}
            </span>
            <div className="mt-2 min-w-0 flex-1">
              <p className="font-heading text-base font-bold uppercase tracking-wide text-white sm:text-lg">
                {callSheetScenarioDisplayName(s.scenario)}
              </p>
              {helper ? (
                <p className="mt-1 line-clamp-2 font-body text-sm text-slate-400">{helper}</p>
              ) : null}
            </div>
            <p className="mt-2 font-body text-xs text-slate-500">
              {count}/{max} calls
            </p>
          </button>
        );
      })}
    </div>
  );
}
