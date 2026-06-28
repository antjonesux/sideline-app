"use client";

import { SITUATION_COLORS, type CallSheetScenario } from "@/lib/constants";
import {
  callSheetScenarioDisplayName,
  callSheetScenarioHelperText,
  callSheetScenarioMarker,
  callSheetScenarioPlayCountLabel,
} from "@/lib/playbookUtils";
import type { SheetScenarioBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CallSheetSituationGrid({
  scenarios,
  onSelect,
  getOptionState,
}: {
  scenarios: SheetScenarioBlock[];
  onSelect: (scenario: string) => void;
  getOptionState?: (block: SheetScenarioBlock) => { disabled?: boolean; statusLabel?: string };
}) {
  return (
    <div className="grid grid-cols-2 gap-3" role="list" aria-label="Tactical situations">
      {scenarios.map((s) => {
        const count = s.plays.length;
        const optionState = getOptionState?.(s);
        const disabled = optionState?.disabled ?? false;
        const statusLabel =
          optionState?.statusLabel ?? callSheetScenarioPlayCountLabel(count);
        const helper = callSheetScenarioHelperText(s.scenario);
        const marker = callSheetScenarioMarker(s.scenario);
        const colors =
          SITUATION_COLORS[s.scenario as CallSheetScenario] ?? SITUATION_COLORS["Run Game"];

        return (
          <button
            key={s.id}
            type="button"
            role="listitem"
            disabled={disabled}
            onClick={() => onSelect(s.scenario)}
            className={cn(
              "flex min-h-[8.5rem] min-w-0 w-full flex-col rounded-xl p-4 text-start transition-colors",
              disabled
                ? "cursor-not-allowed opacity-50"
                : "hover:brightness-110",
              colors.bg,
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={cn("font-mono text-base leading-none", colors.text)} aria-hidden>
                {marker}
              </span>
              <span className={cn("shrink-0 font-body text-xs opacity-80", colors.text)}>
                {statusLabel}
              </span>
            </div>
            <div className="mt-2 min-w-0 flex-1">
              <p
                className={cn(
                  "font-heading text-base font-bold uppercase tracking-wide sm:text-lg",
                  colors.text,
                )}
              >
                {callSheetScenarioDisplayName(s.scenario)}
              </p>
              {helper ? (
                <p className={cn("mt-1 line-clamp-2 font-body text-sm opacity-70", colors.text)}>
                  {helper}
                </p>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
