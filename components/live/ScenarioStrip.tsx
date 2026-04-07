"use client";

import { SCENARIOS, type Scenario } from "@/lib/liveTypes";

export function ScenarioStrip({
  active,
  onSelect,
}: {
  active: Scenario;
  onSelect: (scenario: Scenario) => void;
}) {
  return (
    <div className="border-y border-slate-800 px-2 py-2">
      <div className="flex gap-2 overflow-x-auto">
        {SCENARIOS.map((s) => (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className={`whitespace-nowrap border-b px-2 py-1 text-xs ${s === active ? "border-amber-400 text-amber-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            {s.replace("Down", "").replace("Opening ", "")}
          </button>
        ))}
      </div>
    </div>
  );
}
