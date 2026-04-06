"use client";

import type { AdjustedSituationalCall } from "@/lib/gamePlanTypes";
import { useEffect, useRef } from "react";

export function InGameCallSheet({
  calls,
  activeSituation,
  onSelectSituation,
}: {
  calls: AdjustedSituationalCall[];
  activeSituation: string | null;
  onSelectSituation: (situation: string) => void;
}) {
  const sorted = [...calls].sort((a, b) => a.priority - b.priority);
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!activeSituation) return;
    const el = rowRefs.current[activeSituation];
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeSituation]);

  return (
    <div className="space-y-3 px-2 pb-24 pt-2 md:px-4">
      {sorted.map((row) => {
        const active = activeSituation === row.situation;
        return (
          <button
            key={row.id}
            type="button"
            data-situation={row.situation}
            ref={(el) => {
              rowRefs.current[row.situation] = el;
            }}
            onClick={() => onSelectSituation(row.situation)}
            className={`w-full rounded-lg border-2 px-4 py-5 text-left transition md:px-6 md:py-6 ${
              active
                ? "border-[var(--amber)] bg-black/50 shadow-[0_0_0_1px_rgba(244,165,34,0.35)]"
                : "border-white/15 bg-black/35 hover:border-white/25"
            }`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-display text-xl tracking-wide text-[var(--chalk)] md:text-2xl">
                {row.situation}
              </span>
              {row.down != null ? (
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--chalk-muted)]">
                  D{row.down}
                  {row.distance_min != null
                    ? ` · ${row.distance_min}${row.distance_max != null && row.distance_max !== row.distance_min ? `–${row.distance_max}` : ""}`
                    : ""}
                </span>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 font-mono text-base text-[var(--chalk)] sm:grid-cols-2">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--chalk-muted)]">
                  Formation
                </div>
                <div className="mt-1 font-medium">{row.formation}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--chalk-muted)]">
                  Play
                </div>
                <div className="mt-1 text-[var(--amber-soft)]">{row.play_type}</div>
              </div>
            </div>
            <p className="mt-4 border-t border-white/10 pt-4 font-mono text-sm leading-relaxed text-[var(--chalk-soft)]">
              <span className="text-[var(--chalk)]">Why · </span>
              {row.rationale}
            </p>
          </button>
        );
      })}
    </div>
  );
}
