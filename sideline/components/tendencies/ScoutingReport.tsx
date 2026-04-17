"use client";

import type { ScoutingReportRow } from "@/lib/tendenciesServer";
import { normalizePlayName } from "@/lib/utils";
import { useMemo } from "react";

function successRateClass(successRate: number): string {
  if (successRate >= 60) return "text-emerald-400";
  if (successRate >= 40) return "text-amber-400";
  return "text-red-400";
}

type Props = {
  rows: ScoutingReportRow[];
  overallSuccessRate: number;
};

export function ScoutingReport({ rows, overallSuccessRate }: Props) {
  if (rows.length === 0) {
    return (
      <p className="font-body text-sm text-slate-500">
        Not enough data yet. Scouting notes appear when you have at least five plays in a situation.
      </p>
    );
  }

  const sortedRows = useMemo(() => [...rows].sort((a, b) => b.total_plays - a.total_plays), [rows]);

  return (
    <div className="space-y-3">
      {sortedRows.map((r) => {
        if (r.total_plays === 0) {
          return (
            <div key={r.scenario} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="font-heading text-base uppercase tracking-wider text-white">{r.scenario}</p>
              <div className="mt-3 space-y-1">
                <p className="font-body text-sm text-slate-500">No plays logged in this situation yet.</p>
                <p className="font-body text-sm text-slate-500">This card will populate as you log more games.</p>
              </div>
            </div>
          );
        }
        const tendencySentence =
          r.pass_pct >= r.run_pct
            ? `You pass ${Math.round(r.pass_pct)}% of the time in this situation`
            : `You run ${Math.round(r.run_pct)}% of the time in this situation`;
        const topCallSuccessRate = Math.round(r.top_plays[0]?.success_rate ?? r.top_play?.success_rate ?? r.success_pct);
        const underperforming = topCallSuccessRate <= Math.round(overallSuccessRate - 10);
        return (
          <div key={r.scenario} className="min-h-[140px] rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-heading text-base uppercase tracking-wider text-white">{r.scenario}</p>
            </div>

            <div className="mt-3 space-y-1.5">
              <p className="font-body text-xs uppercase tracking-widest text-slate-500">TOP CALLS</p>
              <div className="space-y-1">
                {r.top_plays.slice(0, 3).map((play, idx) => (
                  <div key={`${play.formation}-${play.play_name}-${idx}`} className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate font-mono text-sm text-white">
                      <span className="mr-1 text-slate-500">{idx + 1}.</span>
                      {normalizePlayName(play.play_name)}
                    </p>
                    <p className="shrink-0 font-mono text-sm">
                      <span className={successRateClass(play.success_rate)}>{play.success_rate}%</span>
                      <span className="ml-1 text-xs text-slate-500">success</span>
                    </p>
                  </div>
                ))}
              </div>
              {underperforming ? <p className="font-body text-sm text-amber-400">⚠️ Below your average — consider adjusting</p> : null}
            </div>

            <div className="mt-3 space-y-1.5">
              <p className="font-body text-xs uppercase tracking-widest text-slate-500">TENDENCY</p>
              <p className="font-body text-sm text-slate-300">{tendencySentence}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
