"use client";

import { SCENARIO_SHORT } from "@/lib/constants";
import { scenarioMaxSlots } from "@/lib/playbookUtils";
import type { SheetScenarioBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

const BLEED_OUTER =
  "shrink-0 ms-[calc(50%-50vw)] me-[calc(50%-50vw)] w-screen max-w-[100vw]";
const SCROLL_ROW =
  "overflow-x-auto touch-pan-x overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] flex gap-2 pb-2 [&::-webkit-scrollbar]:hidden";
const SPACER =
  "shrink-0 w-[calc((100vw-min(100vw,48rem))/2+theme(spacing.4)-theme(spacing.2))] sm:w-[calc((100vw-min(100vw,48rem))/2+theme(spacing.6)-theme(spacing.2))]";

export function PlaySheetSituationChipScroll({
  scenarios,
  selectedScenario,
  onSelect,
  tabSemantics = false,
  hideFromLg = false,
}: {
  scenarios: SheetScenarioBlock[];
  selectedScenario: string;
  onSelect: (scenario: string) => void;
  /** Film My Sheet: `tab` / `tablist` roles inside Radix `Tabs`. */
  tabSemantics?: boolean;
  /** Play Sheet: strip hidden at `lg+` when the desktop sidebar lists situations. */
  hideFromLg?: boolean;
}) {
  if (scenarios.length === 0) return null;

  const chips = scenarios.map((s) => {
    const max = scenarioMaxSlots(s.scenario);
    const n = s.plays.length;
    const short = SCENARIO_SHORT[s.scenario] ?? s.scenario;
    const active = s.scenario === selectedScenario;
    return (
      <button
        key={s.id}
        type="button"
        onClick={() => onSelect(s.scenario)}
        {...(tabSemantics ? { role: "tab" as const, "aria-selected": active } : {})}
        className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 font-body text-xs ${
          active ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-300"
        }`}
      >
        {short} {n}/{max}
      </button>
    );
  });

  return (
    <div className={cn(BLEED_OUTER, hideFromLg && "lg:hidden")}>
      {tabSemantics ? (
        <div className={SCROLL_ROW} role="tablist" aria-label="Play sheet situations">
          <span aria-hidden className={SPACER} />
          {chips}
          <span aria-hidden className={SPACER} />
        </div>
      ) : (
        <nav className={SCROLL_ROW} aria-label="Situations">
          <span aria-hidden className={SPACER} />
          {chips}
          <span aria-hidden className={SPACER} />
        </nav>
      )}
    </div>
  );
}
