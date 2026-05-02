"use client";

import type { SuggestionRow } from "@/lib/loggedPlayStats";
import { resolveCfbDisplayPlayType } from "@/lib/playbook";
import { scenarioDisplayLabel } from "@/lib/playbookUtils";
import { PlayTypeBadge } from "@/components/game-plan/PlayTypeBadge";
import { Button } from "@/components/ui/button";
import { normalizePlayName } from "@/lib/utils";

export function PlaySuggestions({
  scenarioLabel,
  suggestions,
  busyId,
  onAdd,
  scenarioFull,
}: {
  scenarioLabel: string;
  suggestions: SuggestionRow[];
  busyId: string | null;
  onAdd: (s: SuggestionRow) => void;
  scenarioFull?: boolean;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-[0.12em] text-slate-400">
        Suggested
        <span className="sr-only">{` for ${scenarioDisplayLabel(scenarioLabel)}`}</span>
      </h3>
      <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1 sm:px-4">
        {suggestions.map((s, i) => {
          const id = `${s.formation}\t${s.play_name}`;
          const displayType = resolveCfbDisplayPlayType(s.play_name, s.play_type ?? null);
          return (
            <div key={id} className="border-b border-slate-800/90 py-3 last:border-b-0">
              <div className="flex gap-3">
                <span className="w-6 shrink-0 pt-0.5 font-mono text-[13px] tabular-nums text-slate-500">{i + 1}.</span>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-body text-[15px] leading-snug text-slate-100">
                    <span className="font-body font-normal text-slate-200">{s.formation}</span>
                    <span className="text-slate-600">→</span>
                    <span className="font-mono text-[12px] font-medium uppercase text-white">{normalizePlayName(s.play_name)}</span>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] leading-relaxed text-slate-400">
                    <PlayTypeBadge type={displayType} />
                    <span className="min-w-0">
                      <span className="tabular-nums text-slate-300">{s.avg_yards.toFixed(1)}</span>
                      <span className="ml-1">avg yds</span>
                      <span className="mx-1.5 text-slate-600">·</span>
                      <span className="tabular-nums">{s.uses}</span> {s.uses === 1 ? "call" : "calls"}
                      {s.pooled ? (
                        <>
                          <span className="mx-1.5 text-slate-600">·</span>
                          <span>Similar situations</span>
                        </>
                      ) : null}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-9 w-9 shrink-0 self-center p-0 text-emerald-300 hover:border-emerald-600/50 hover:bg-emerald-500/10 disabled:opacity-50 [&_svg]:size-5"
                  disabled={busyId === id}
                  onClick={() => onAdd(s)}
                  aria-label={scenarioFull ? "Replace a play" : "Add play"}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
