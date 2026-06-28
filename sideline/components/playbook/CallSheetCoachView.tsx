"use client";

import { CALL_SHEET_SCENARIOS, SITUATION_COLORS, type CallSheetScenario } from "@/lib/constants";
import { CALL_SHEET_COACH_VIEW_EMPTY, CALL_SHEET_VIEWER_SITUATION_EMPTY } from "@/lib/coachCopy";
import {
  callSheetScenarioDisplayName,
  callSheetScenarioMarker,
  callSheetScenarioPlayCountLabel,
} from "@/lib/playbookUtils";
import type { SheetScenarioBlock } from "@/lib/types";
import { cn, normalizePlayName } from "@/lib/utils";
import { useMemo, useState } from "react";

function orderedScenarioBlocks(scenarios: SheetScenarioBlock[]): SheetScenarioBlock[] {
  return CALL_SHEET_SCENARIOS.flatMap((name) => {
    const block = scenarios.find((s) => s.scenario === name);
    return block ? [block] : [];
  });
}

export function CallSheetCoachView({ scenarios }: { scenarios: SheetScenarioBlock[] }) {
  const orderedBlocks = useMemo(() => orderedScenarioBlocks(scenarios), [scenarios]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const totalPlays = useMemo(
    () => scenarios.reduce((acc, scenario) => acc + scenario.plays.length, 0),
    [scenarios],
  );

  if (totalPlays === 0) {
    return (
      <div className="flex min-h-[40dvh] flex-col items-center justify-center px-4 text-center">
        <p className="font-body text-sm text-slate-400">{CALL_SHEET_COACH_VIEW_EMPTY}</p>
      </div>
    );
  }

  function toggleSection(scenarioId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(scenarioId)) next.delete(scenarioId);
      else next.add(scenarioId);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {orderedBlocks.map((block) => {
        const isExpanded = expanded.has(block.id);
        const count = block.plays.length;
        const sectionLabel = callSheetScenarioDisplayName(block.scenario).toUpperCase();
        const marker = callSheetScenarioMarker(block.scenario as CallSheetScenario);
        const colors =
          SITUATION_COLORS[block.scenario as CallSheetScenario] ?? SITUATION_COLORS["Run Game"];
        const sortedPlays = [...block.plays].sort((a, b) => a.play_order - b.play_order);

        return (
          <section key={block.id} className="overflow-hidden rounded-xl">
            <button
              type="button"
              className={cn(
                "flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-start transition-colors",
                colors.bg,
                isExpanded ? "rounded-t-xl" : "rounded-xl",
              )}
              onClick={() => toggleSection(block.id)}
              aria-expanded={isExpanded}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className={cn("shrink-0 font-mono text-base leading-none", colors.text)} aria-hidden>
                  {marker}
                </span>
                <span
                  className={cn(
                    "min-w-0 truncate font-heading text-sm font-bold uppercase tracking-wide",
                    colors.text,
                  )}
                >
                  {sectionLabel}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className={cn("font-body text-xs opacity-80", colors.text)}>
                  {callSheetScenarioPlayCountLabel(count)}
                </span>
                <svg
                  className={cn(
                    "h-4 w-4 shrink-0 opacity-80 transition-transform motion-reduce:transition-none",
                    colors.text,
                    isExpanded && "rotate-180",
                  )}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </button>
            {isExpanded ? (
              <div className="rounded-b-xl bg-slate-900 px-4 pb-2">
                {count === 0 ? (
                  <p className="py-2 font-body text-xs text-slate-500">{CALL_SHEET_VIEWER_SITUATION_EMPTY}</p>
                ) : (
                  sortedPlays.map((play) => (
                    <div
                      key={play.id}
                      className="flex min-h-11 items-center justify-between gap-3 border-b border-slate-700/50 py-3 last:border-b-0"
                    >
                      <p className="min-w-0 truncate font-body text-sm uppercase tracking-wide text-white">
                        {normalizePlayName(play.play_name)}
                      </p>
                      <p className="shrink-0 truncate font-body text-sm text-slate-400">{play.formation}</p>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
