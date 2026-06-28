"use client";

import { CALL_SHEET_VIEWER_TAB_FULL, CALL_SHEET_VIEWER_TAB_NEEDS } from "@/lib/coachCopy";
import { cn } from "@/lib/utils";

export type CallSheetEditorTab = "situations" | "coach-view";

const TABS: { id: CallSheetEditorTab; label: string }[] = [
  { id: "situations", label: CALL_SHEET_VIEWER_TAB_NEEDS },
  { id: "coach-view", label: CALL_SHEET_VIEWER_TAB_FULL },
];

/** Quiet tab bar — active tab uses Run Game card surface treatment. */
export function CallSheetEditorTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: CallSheetEditorTab;
  onTabChange: (tab: CallSheetEditorTab) => void;
}) {
  return (
    <div
      className="grid grid-cols-2 gap-1 rounded-xl border border-slate-700 p-1"
      role="tablist"
      aria-label="Call sheet views"
    >
      {TABS.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "rounded-xl px-3 py-2.5 font-sans text-sm font-medium transition-colors",
              active
                ? "bg-emerald-400/10 text-emerald-400"
                : "text-slate-500 hover:text-slate-300",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
