"use client";

import { SCENARIO_SHORT } from "@/lib/constants";
import { scenarioDisplayLabel, scenarioMaxSlots } from "@/lib/playbookUtils";
import type { SheetScenarioBlock } from "@/lib/types";

export function SituationList({
  scenarios,
  activeScenario,
  onSelect,
  variant,
}: {
  scenarios: SheetScenarioBlock[];
  activeScenario: string;
  onSelect: (s: string) => void;
  variant: "desktop" | "mobile";
}) {
  if (variant === "mobile") {
    return (
      <div className="overflow-x-auto touch-pan-x overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] flex gap-2 pb-2 lg:hidden">
        {scenarios.map((s) => {
          const max = scenarioMaxSlots(s.scenario);
          const n = s.plays.length;
          const short = SCENARIO_SHORT[s.scenario] ?? s.scenario;
          const active = s.scenario === activeScenario;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.scenario)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 font-body text-xs ${
                active ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-300"
              }`}
            >
              {short} {n}/{max}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <nav className="hidden min-h-0 flex-col gap-0.5 lg:flex" aria-label="Situations">
      {scenarios.map((s) => {
        const max = scenarioMaxSlots(s.scenario);
        const n = s.plays.length;
        const active = s.scenario === activeScenario;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.scenario)}
            className={`flex w-full items-center justify-between rounded-md border px-2 py-2 text-start font-body text-sm transition-colors ${
              active
                ? "border-slate-800 border-l-4 border-l-emerald-500 bg-slate-900 text-emerald-400"
                : "border-transparent text-slate-300 hover:bg-slate-900/80"
            }`}
          >
            <span className="font-body text-sm text-slate-200">{scenarioDisplayLabel(s.scenario)}</span>
            <span className="font-body text-[11px] text-slate-500">{n > 0 ? `${n} of ${max} plays` : "No plays added"}</span>
          </button>
        );
      })}
    </nav>
  );
}
