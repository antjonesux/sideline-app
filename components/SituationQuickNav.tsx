"use client";

import { SITUATION_QUICK_NAV } from "@/lib/situationNav";

export function SituationQuickNav({
  activeSituation,
  onSelect,
}: {
  activeSituation: string | null;
  onSelect: (situation: string) => void;
}) {
  return (
    <nav
      className="sticky top-0 z-20 -mx-4 border-b border-white/10 bg-[var(--bg)]/95 px-4 py-3 backdrop-blur md:-mx-10 md:px-10"
      aria-label="Situation quick nav"
    >
      <div className="flex gap-2 overflow-x-auto pb-1 font-mono text-[11px] uppercase tracking-wider md:flex-wrap md:overflow-visible">
        {SITUATION_QUICK_NAV.map(({ label, situation }) => {
          const on = activeSituation === situation;
          return (
            <button
              key={situation}
              type="button"
              onClick={() => onSelect(situation)}
              className={`shrink-0 rounded border px-3 py-2 transition ${
                on
                  ? "border-[var(--amber)] bg-[var(--amber)]/15 text-[var(--chalk)]"
                  : "border-white/15 bg-black/30 text-[var(--chalk-muted)] hover:border-white/25 hover:text-[var(--chalk-soft)]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
