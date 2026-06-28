"use client";

import { cn } from "@/lib/utils";

export type SegmentTab<T extends string> = {
  id: T;
  label: string;
};

/** Two-option segmented control — same pattern as sign-in / create-account on `LoginForm`. */
export function SegmentTabBar<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  ariaLabel,
}: {
  tabs: [SegmentTab<T>, SegmentTab<T>];
  activeTab: T;
  onTabChange: (tab: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      className="grid grid-cols-2 gap-1 rounded-lg border border-slate-700 bg-slate-900 p-1"
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "rounded-md px-3 py-2 font-sans text-sm font-medium transition-colors",
              active ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
