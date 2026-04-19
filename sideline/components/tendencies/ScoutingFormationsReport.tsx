"use client";

import type { ScoutingFormationReportRow } from "@/lib/tendenciesServer";
import { successRateTextClass } from "@/lib/successRateTextClass";
import { normalizePlayName } from "@/lib/utils";
import { useMemo, useState } from "react";

type Props = {
  rows: ScoutingFormationReportRow[];
};

export function ScoutingFormationsReport({ rows }: Props) {
  const [showAll, setShowAll] = useState(false);

  if (rows.length === 0) {
    return (
      <p className="font-sans text-sm text-slate-400">Log more film to see formation cut-ups here.</p>
    );
  }

  const sortedRows = useMemo(() => [...rows].sort((a, b) => b.uses - a.uses), [rows]);
  const visibleRows = showAll ? sortedRows : sortedRows.slice(0, 5);

  return (
    <div className="space-y-4">
      {visibleRows.map((r) => {
        if (r.uses === 0) {
          return (
            <article
              key={r.formation}
              className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900"
            >
              <header className="border-b border-slate-800/80 bg-slate-800/40 px-4 py-3">
                <h3 className="font-display text-base font-bold uppercase tracking-wide text-white">{r.formation}</h3>
                <p className="mt-1 font-sans text-sm text-slate-500">No calls logged here yet.</p>
              </header>
            </article>
          );
        }
        const formationSuccess = Math.round(r.success_pct);
        const snapRounded = Math.round(r.snap_pct);
        const highUsage = snapRounded > 25;

        return (
          <article
            key={r.formation}
            className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900"
          >
            <header className="border-b border-slate-800/80 bg-slate-800/40 px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="min-w-0 flex-1 font-display text-base font-bold uppercase tracking-wide text-white">
                  {r.formation}
                </h3>
                <span className="font-mono text-xs font-medium tabular-nums text-slate-400">
                  {r.uses} {r.uses === 1 ? "call" : "calls"}
                </span>
              </div>
              <p className={`mt-2 font-mono text-sm font-semibold tabular-nums ${successRateTextClass(formationSuccess)}`}>
                {formationSuccess}% success
              </p>
            </header>

            <div className="px-4 py-4">
              <p className="mb-2 font-sans text-xs uppercase tracking-widest text-slate-500">Top Calls</p>
              <ul className="space-y-3">
                {r.top_plays.slice(0, 3).map((play, idx) => (
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
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-slate-800/80 bg-slate-800/40 px-4 py-3">
              <p className="font-sans text-sm text-slate-400">{snapRounded}% of your total plays</p>
              {highUsage ? (
                <p className="mt-1.5 font-sans text-xs text-amber-400">⚠️ Opponents may key on this formation</p>
              ) : null}
            </div>
          </article>
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
