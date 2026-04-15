"use client";

import { RankedRow } from "@/components/tendencies/RankedRow";

export type TopFormationRow = {
  formation: string;
  uses: number;
  avg_yards: number;
  success_rate: number;
  best_play: { play_name: string; success_rate: number; uses: number } | null;
};

type Props = {
  rows: TopFormationRow[];
};

export function TopFormationsList({ rows }: Props) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-1 sm:px-4">
      {rows.map((r, i) => (
        <RankedRow
          key={r.formation}
          rank={i + 1}
          title={<span className="font-barlow font-normal text-slate-200">{r.formation}</span>}
          successRate={r.success_rate}
          uses={r.uses}
          avgYards={r.avg_yards}
          footer={
            r.best_play ? (
              <p className="font-mono text-[11px] text-slate-500">
                Best play:{" "}
                <span className="font-medium uppercase text-slate-300">
                  {r.best_play.play_name} ({r.best_play.success_rate}%)
                </span>
              </p>
            ) : null
          }
        />
      ))}
    </div>
  );
}
