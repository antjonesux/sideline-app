"use client";

import { CallSheetViewerPlayRow } from "@/components/playbook/CallSheetViewerPlayRow";
import { callSheetScenarioDisplayName, callSheetScenarioPlayCountLabel } from "@/lib/playbookUtils";
import type { SheetScenarioBlock } from "@/lib/types";
import { useState } from "react";

export function CallSheetViewerFullSheet({ scenarios }: { scenarios: SheetScenarioBlock[] }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  function toggleSection(scenarioId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(scenarioId)) next.delete(scenarioId);
      else next.add(scenarioId);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {scenarios.map((block) => {
        const isCollapsed = collapsed.has(block.id);
        const count = block.plays.length;
        const sectionLabel = callSheetScenarioDisplayName(block.scenario).toUpperCase();

        return (
          <section key={block.id} className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-start"
              onClick={() => toggleSection(block.id)}
              aria-expanded={!isCollapsed}
            >
              <span className="font-heading text-sm font-bold tracking-wide text-slate-200">{sectionLabel}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-body text-xs text-slate-500">{callSheetScenarioPlayCountLabel(count)}</span>
                <svg
                  className={`h-4 w-4 shrink-0 text-slate-500 transition-transform motion-reduce:transition-none ${isCollapsed ? "" : "rotate-180"}`}
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
            {!isCollapsed ? (
              <div className="border-t border-slate-800 px-4 pb-1">
                {count === 0 ? (
                  <p className="py-3 font-body text-sm text-slate-500">No plays added yet.</p>
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
