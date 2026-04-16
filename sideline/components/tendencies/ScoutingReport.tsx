"use client";

import type { ScoutingReportRow } from "@/lib/tendenciesServer";
import { scoutingCardAccentClass, scoutingCoachingInsight, scoutingSuccessDotClass } from "@/lib/scoutingCoachingCopy";

type Props = {
  rows: ScoutingReportRow[];
};

export function ScoutingReport({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <p className="font-body text-sm text-slate-500">
        Not enough data yet. Scouting notes appear when you have at least five plays in a situation.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const insight = scoutingCoachingInsight(r);
        const dot = scoutingSuccessDotClass(r.success_pct);
        const accent = scoutingCardAccentClass(r.success_pct);
        return (
          <div key={r.scenario} className={`app-card app-card-pad ${accent}`}>
            <div className="flex items-start justify-between gap-3">
              <p className="font-heading text-[14px] font-semibold uppercase tracking-wide text-slate-100">{r.scenario}</p>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-base font-medium tabular-nums text-slate-200">{r.success_pct}% success</span>
                <span className={`size-2 shrink-0 rounded-full ${dot}`} title="Success tier" />
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-700">
                <div className="flex h-full w-full">
                  <div className="h-full bg-emerald-500" style={{ width: `${r.run_pct}%` }} />
                  <div className="h-full bg-blue-500" style={{ width: `${r.pass_pct}%` }} />
                </div>
              </div>
              <p className="shrink-0 font-mono text-[11px] tabular-nums text-slate-400">
                {r.run_pct}% run <span className="text-slate-600">·</span> {r.pass_pct}% pass
              </p>
            </div>

            <p className="mt-3 font-body text-[13px] font-normal leading-snug text-slate-100">{insight}</p>

            {r.top_play ? (
              <div className="mt-3 inline-flex max-w-full flex-wrap items-baseline gap-x-3 gap-y-1 rounded-md bg-slate-800 px-3 py-2">
                <span className="font-body text-[10px] font-medium uppercase tracking-wide text-slate-500">Top play</span>
                <span className="font-mono text-[11px] font-medium uppercase text-white">{r.top_play.play_name}</span>
                <span className="font-mono text-[11px] font-normal tabular-nums text-slate-500">
                  {Math.round(r.top_play.success_rate)}% · {r.top_play.uses} uses
                </span>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
