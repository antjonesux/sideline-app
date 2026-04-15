"use client";

import type { TopPlayRow } from "@/components/tendencies/TopPlaysList";
import { RankedRow } from "@/components/tendencies/RankedRow";

type Props = {
  rows: TopPlayRow[];
};

export function ReconsiderPlays({ rows }: Props) {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-xl border border-red-800/20 bg-red-900/10 px-3 py-3 sm:px-4">
      <p className="font-barlow mb-3 text-sm text-red-200/95">
        <span className="mr-1 text-amber-400">⚠</span> Plays below 35% success rate with 4+ uses:
      </p>
      <div>
        {rows.map((r, i) => (
          <RankedRow
            key={`${r.formation}-${r.play_name}`}
            rank={i + 1}
            title={
              <>
                <span className="font-barlow font-normal text-slate-200">{r.formation}</span>
                <span className="text-slate-600"> → </span>
                <span className="font-mono text-[12px] font-medium uppercase text-white">{r.play_name}</span>
              </>
            }
            successRate={r.success_rate}
            uses={r.uses}
            avgYards={r.avg_yards}
            variant="red"
          />
        ))}
      </div>
    </div>
  );
}
