"use client";

import type { SuggestionRow } from "@/lib/loggedPlayStats";

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
    <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <p className="font-barlow-condensed text-sm font-bold uppercase tracking-wide text-slate-400">Suggested</p>
      <ul className="mt-3 space-y-3">
        {suggestions.map((s) => {
          const id = `${s.formation}\t${s.play_name}`;
          return (
            <li key={id} className="flex flex-col gap-2 rounded-lg border border-slate-800/80 bg-slate-950/40 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-mono text-xs font-medium uppercase text-white">
                  💡 {s.play_name}
                </p>
                <p className="mt-1 font-mono text-[11px] text-slate-500">
                  {s.success_rate}% success on {scenarioLabel} ({s.uses} uses) · {s.formation}
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === id}
                onClick={() => onAdd(s)}
                className="shrink-0 rounded-lg border border-emerald-700/50 bg-emerald-500/10 px-3 py-1.5 font-barlow text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
              >
                + Add
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
