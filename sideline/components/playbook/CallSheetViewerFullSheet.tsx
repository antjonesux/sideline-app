"use client";

import { CallSheetViewerPlayRow } from "@/components/playbook/CallSheetViewerPlayRow";
import { appShellSurfaceCardHoverClass } from "@/lib/constants/designTokens";
import { callSheetScenarioDisplayName, callSheetScenarioMarker, callSheetScenarioPlayCountLabel } from "@/lib/playbookUtils";
import type { SheetScenarioBlock } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

function allScenarioIds(scenarios: SheetScenarioBlock[]): Set<string> {
  return new Set(scenarios.map((s) => s.id));
}

export function CallSheetViewerFullSheet({ scenarios }: { scenarios: SheetScenarioBlock[] }) {
  const scenarioIdsKey = scenarios.map((s) => s.id).join(",");
  const [expanded, setExpanded] = useState<Set<string>>(() => allScenarioIds(scenarios));

  useEffect(() => {
    setExpanded(allScenarioIds(scenarios));
  }, [scenarioIdsKey]);

  function toggleSection(scenarioId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(scenarioId)) next.delete(scenarioId);
      else next.add(scenarioId);
      return next;
    });
  }

  return (
    <div className="grid grid-cols-2 items-start gap-3">
      {scenarios.map((block) => {
        const isExpanded = expanded.has(block.id);
        const count = block.plays.length;
        const sectionLabel = callSheetScenarioDisplayName(block.scenario).toUpperCase();
        const marker = callSheetScenarioMarker(block.scenario);

        return (
          <section
            key={block.id}
            className={cn(
              "self-start overflow-hidden rounded-xl border border-slate-700",
              !isExpanded && cn("bg-slate-900", appShellSurfaceCardHoverClass),
            )}
          >
            <button
              type="button"
              className={cn(
                "flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-start transition-colors",
                isExpanded && "bg-slate-900 hover:bg-slate-800/70",
                isExpanded ? "rounded-t-xl" : "rounded-xl",
              )}
              onClick={() => toggleSection(block.id)}
              aria-expanded={isExpanded}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className="shrink-0 font-mono text-base leading-none text-slate-500" aria-hidden>
                  {marker}
                </span>
                <span className="min-w-0 truncate font-heading text-sm font-bold uppercase tracking-wide text-white">
                  {sectionLabel}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-body text-xs text-slate-500">{callSheetScenarioPlayCountLabel(count)}</span>
                <svg
                  className={`h-4 w-4 shrink-0 text-slate-500 transition-transform motion-reduce:transition-none ${isExpanded ? "rotate-180" : ""}`}
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
              <div className="border-t border-slate-700 px-4 pb-2">
                {count === 0 ? (
                  <p className="py-2 font-body text-xs text-slate-500">No plays added yet.</p>
                ) : (
                  block.plays.map((play) => <CallSheetViewerPlayRow key={play.id} play={play} />)
                )}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
