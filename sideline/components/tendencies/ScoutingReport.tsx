"use client";

import type { ScoutingReportRow } from "@/lib/tendenciesServer";
import { scoutingCardAccentClass, scoutingCoachingInsight } from "@/lib/scoutingCoachingCopy";

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
        const accent = scoutingCardAccentClass(r.success_pct);
        const tendencyHeadline =
          r.pass_pct >= r.run_pct ? `You pass ${Math.round(r.pass_pct)}% of the time` : `You run ${Math.round(r.run_pct)}% of the time`;
        return (
          <div key={r.scenario} className={`app-card app-card-pad ${accent}`}>
            <div className="space-y-1">
              <p className="font-heading text-[14px] font-semibold uppercase tracking-wide text-slate-100">{r.scenario}</p>
              <p className="font-body text-sm text-slate-100">{tendencyHeadline}</p>
            </div>
            {r.top_play ? <p className="font-body text-xs text-slate-300">Top call: {r.top_play.play_name} ({r.top_play.uses} of {r.total_plays})</p> : null}
            <p className="font-body text-xs text-slate-400">{insight}</p>
          </div>
        );
      })}
    </div>
  );
}
