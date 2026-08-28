"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { SCOUTING_REPORT_SCENARIOS } from "@/lib/constants";
import type { ScoutingReportRow } from "@/lib/tendenciesServer";
import { successRateTextClass } from "@/lib/successRateTextClass";
import { normalizePlayName } from "@/lib/utils";
import { useMemo } from "react";

function emptyScoutingRow(scenario: string): ScoutingReportRow {
  return {
    scenario,
    total_plays: 0,
    run_pct: 0,
    pass_pct: 0,
    success_pct: 0,
    avg_yards_per_play: 0,
    top_play: null,
    top_plays: [],
  };
}

type Props = {
  rows: ScoutingReportRow[];
};

export function ScoutingReport({ rows }: Props) {
  const orderedRows = useMemo(() => {
    if (rows.length === 0) return [];
    const byScenario = new Map(rows.map((r) => [r.scenario, r]));
    return SCOUTING_REPORT_SCENARIOS.map((scenario) => byScenario.get(scenario) ?? emptyScoutingRow(scenario));
  }, [rows]);

  if (orderedRows.length === 0) {
    return (
      <p className="font-sans text-sm text-slate-500">
        Need at least five calls in a situation before scouting notes show up.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {orderedRows.map((r) => {
        if (r.total_plays === 0) {
          return (
            <article
              key={r.scenario}
              className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900"
            >
              <header className="border-b border-slate-800/80 bg-slate-800/40 px-4 py-3">
                <h3 className="font-display text-base font-bold uppercase tracking-wide text-white">{r.scenario}</h3>
                <p className="mt-1 font-sans text-sm text-slate-500">No calls logged here yet.</p>
              </header>
            </article>
          );
        }
        const situationAvg = Math.round(r.success_pct);
        const situationAvgYpp = r.avg_yards_per_play;
        const passRounded = Math.round(r.pass_pct);
        const runRounded = Math.round(r.run_pct);
        const tendencySkewed = passRounded >= 80 || runRounded >= 80;
        const tendencyPct = r.pass_pct >= r.run_pct ? passRounded : runRounded;
        const tendencyLabel = r.pass_pct >= r.run_pct ? "pass" : "run";
        const tendencyClass = tendencySkewed ? "text-amber-400" : "text-slate-400";

        return (
          <article
            key={r.scenario}
            className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900"
          >
            <header className="border-b border-slate-800/80 bg-slate-800/40 px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-base font-bold uppercase tracking-wide text-white">{r.scenario}</h3>
                <span className="font-mono text-xs font-medium tabular-nums text-slate-400">
                  {r.total_plays} {r.total_plays === 1 ? "call" : "calls"}
                  <span className="text-slate-600"> · </span>
                  <span className={tendencyClass}>
                    {tendencyPct}% {tendencyLabel}
                  </span>
                </span>
              </div>
              <p className={`mt-2 font-mono text-sm font-semibold tabular-nums ${successRateTextClass(situationAvg)}`}>
                {situationAvg}% success
              </p>
            </header>

            <div className="px-4 py-4">
              <p className="mb-2 font-sans text-xs uppercase tracking-widest text-slate-500">Top Calls</p>
              <ul className="space-y-3">
                {r.top_plays.slice(0, 3).map((play, idx) => {
                  const yardsDelta = situationAvgYpp - play.avg_yards;
                  const underVsSituation = play.uses > 0 && yardsDelta > 0;
                  return (
                    <li
                      key={`${play.formation}-${play.play_name}-${idx}`}
                      className="rounded-lg border border-slate-800/90 bg-slate-800/50 px-3 py-3"
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-500">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <p className="font-mono text-sm font-medium uppercase leading-snug text-white">
                            {normalizePlayName(play.play_name)}
                          </p>
                          <p className="font-mono text-xs tabular-nums text-slate-400">
                            <span className={`font-semibold ${successRateTextClass(play.success_rate)}`}>
                              {play.success_rate}%
                            </span>
                            <span className="text-slate-500"> success</span>
                            <span className="text-slate-600"> · </span>
                            <span className="tabular-nums text-slate-400">
                              {play.uses} {play.uses === 1 ? "call" : "calls"}
                            </span>
                          </p>
                          {underVsSituation ? (
                            <p className="inline-flex items-center gap-1 font-sans text-xs text-amber-400">
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                <path d="M12 8v5m0 4h.01" />
                                <path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
                              </svg>
                              {yardsDelta.toFixed(1)} yds below your {r.scenario} avg
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </article>
        );
      })}
    </div>
  );
}
