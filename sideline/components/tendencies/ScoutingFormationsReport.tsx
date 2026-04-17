"use client";

import type { ScoutingFormationReportRow } from "@/lib/tendenciesServer";
import { normalizePlayName } from "@/lib/utils";
import { useMemo, useState } from "react";

function successRateClass(successRate: number): string {
  if (successRate >= 60) return "text-emerald-400";
  if (successRate >= 40) return "text-amber-400";
  return "text-red-400";
}

type Props = {
  rows: ScoutingFormationReportRow[];
  overallSuccessRate: number;
};

export function ScoutingFormationsReport({ rows, overallSuccessRate }: Props) {
  const [showAll, setShowAll] = useState(false);

  if (rows.length === 0) {
    return (
      <p className="font-body text-sm text-slate-400">
        No formation red flags. You&apos;re using a healthy variety of looks.
      </p>
    );
  }

  const sortedRows = useMemo(() => [...rows].sort((a, b) => b.uses - a.uses), [rows]);
  const visibleRows = showAll ? sortedRows : sortedRows.slice(0, 5);

  return (
    <div className="space-y-3">
      {visibleRows.map((r) => {
        if (r.uses === 0) {
          return (
            <div key={r.formation} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="font-heading text-base uppercase tracking-wider text-white">{r.formation}</p>
              <div className="mt-3 space-y-1">
                <p className="font-body text-sm text-slate-500">No plays logged in this formation yet.</p>
                <p className="font-body text-sm text-slate-500">This card will populate as you log more games.</p>
              </div>
            </div>
          );
        }
        const topCallSuccessRate = Math.round(r.top_plays[0]?.success_rate ?? r.top_play?.success_rate ?? r.success_pct);
        const underperforming = topCallSuccessRate <= Math.round(overallSuccessRate - 10);
        return (
          <div key={r.formation} className="min-h-[140px] rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-heading text-base uppercase tracking-wider text-white">{r.formation}</p>
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
              <p className="font-body text-xs uppercase tracking-widest text-slate-500">USAGE</p>
              <p className="font-body text-sm text-slate-300">{Math.round(r.snap_pct)}% of your total plays</p>
            </div>
          </div>
        );
      })}
      {sortedRows.length > 5 ? (
        <button type="button" className="btn-secondary w-full text-sm" onClick={() => setShowAll((prev) => !prev)}>
          {showAll ? "Show top 5 formations" : `Show all formations (${sortedRows.length})`}
        </button>
      ) : null}
    </div>
  );
}
