"use client";

import type { SuggestionRow } from "@/lib/loggedPlayStats";
import { normalizePlayName } from "@/lib/utils";

export function PlaySuggestions({
  scenarioLabel,
  suggestions,
  busyId,
  onAdd,
}: {
  scenarioLabel: string;
  suggestions: SuggestionRow[];
  busyId: string | null;
  onAdd: (s: SuggestionRow) => void;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="app-card app-card-pad mt-6">
      <p className="font-display text-sm font-bold uppercase tracking-[0.12em] text-slate-400">Suggested</p>
      <ul className="mt-3 space-y-3">
        {suggestions.map((s) => {
          const id = `${s.formation}\t${s.play_name}`;
          return (
            <li key={id} className="app-card app-card-pad flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-mono text-xs font-medium uppercase text-white">{normalizePlayName(s.play_name)}</p>
                <p className="mt-1 font-mono text-[11px] text-slate-500">
                  {s.success_rate}% success · {s.uses} calls · {s.formation}
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === id}
                onClick={() => onAdd(s)}
                className="btn-secondary shrink-0 px-3 py-2 text-xs text-emerald-300 hover:border-emerald-600/50 hover:bg-emerald-500/10 disabled:opacity-50"
              >
                Add play
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
