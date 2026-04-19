"use client";

import { TENDENCIES_SCENARIOS } from "@/lib/constants";
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
    return TENDENCIES_SCENARIOS.map((scenario) => byScenario.get(scenario) ?? emptyScoutingRow(scenario));
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
        const passRounded = Math.round(r.pass_pct);
        const runRounded = Math.round(r.run_pct);
        const tendencySkewed = passRounded >= 80 || runRounded >= 80;
        const tendencyLine =
          r.pass_pct >= r.run_pct ? `Tendency: ${passRounded}% pass` : `Tendency: ${runRounded}% run`;
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
                  const underVsSituation =
                    play.uses > 0 && situationAvg - Math.round(play.success_rate) >= 10;
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
                            <p className="font-sans text-xs text-amber-400">
                              ⚠️ Below your {r.scenario} avg
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="border-t border-slate-800/80 bg-slate-800/40 px-4 py-3">
              <p className={`font-sans text-sm ${tendencyClass}`}>{tendencyLine}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
