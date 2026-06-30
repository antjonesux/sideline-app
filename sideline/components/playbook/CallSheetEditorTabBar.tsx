"use client";

import { CALL_SHEET_VIEWER_TAB_FULL, CALL_SHEET_VIEWER_TAB_NEEDS } from "@/lib/coachCopy";
import { cn } from "@/lib/utils";

export type CallSheetEditorTab = "situations" | "coach-view";

const TABS: { id: CallSheetEditorTab; label: string }[] = [
  { id: "situations", label: CALL_SHEET_VIEWER_TAB_NEEDS },
  { id: "coach-view", label: CALL_SHEET_VIEWER_TAB_FULL },
];

/** Quiet tab bar — active tab: landing CTA fill (`emerald-600` / #059669), white label. */
export function CallSheetEditorTabBar({
  activeTab,
  onTabChange,
  density = "default",
}: {
  activeTab: CallSheetEditorTab;
  onTabChange: (tab: CallSheetEditorTab) => void;
  /** Compact pill for desktop/tablet builder toolbar row. */
  density?: "default" | "compact";
}) {
  const compact = density === "compact";

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-1 rounded-xl border border-slate-700 p-1",
        compact && "inline-grid w-auto shrink-0 rounded-lg border-0 bg-slate-900 p-0.5",
      )}
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
              compact && "rounded-md px-3.5 py-1.5 text-xs",
              active
                ? "bg-emerald-600 text-white font-medium"
                : compact
                  ? "text-slate-500 hover:text-white"
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
