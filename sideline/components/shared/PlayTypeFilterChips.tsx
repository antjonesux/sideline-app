"use client";

import type { OffensiveCatalogPlayType } from "@/lib/playbook";
import { cn } from "@/lib/utils";

export type PlayTypeFilterValue = "ALL" | OffensiveCatalogPlayType;

const OPTIONS: { value: PlayTypeFilterValue; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "RUN", label: "RUN" },
  { value: "PASS", label: "PASS" },
  { value: "RPO", label: "RPO" },
];

/**
 * Client-side play-type match against already-resolved catalog types
 * (`resolveCfbBrowserPlayType` / `playTypeResolution`). Does not re-resolve.
 */
export function matchesPlayTypeFilter(
  playType: string | null | undefined,
  filter: PlayTypeFilterValue,
): boolean {
  if (filter === "ALL") return true;
  return (playType ?? "").trim().toUpperCase() === filter;
}

type PlayTypeFilterChipsProps = {
  value: PlayTypeFilterValue;
  onChange: (next: PlayTypeFilterValue) => void;
  className?: string;
  /** Accessible name for the chip group. */
  "aria-label"?: string;
};

/**
 * Exclusive All / RUN / PASS / RPO chip bar for play-list filtering.
 * Parents own state; filter resets with navigation (no persistence).
 */
export function PlayTypeFilterChips({
  value,
  onChange,
  className,
  "aria-label": ariaLabel = "Filter by play type",
}: PlayTypeFilterChipsProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 font-body text-xs transition-colors",
              active
                ? "bg-emerald-500 text-slate-950"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
