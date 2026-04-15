"use client";

import type { TopPlayRow } from "@/components/tendencies/TopPlaysList";
import { RankedRow } from "@/components/tendencies/RankedRow";

type Props = {
  rows: TopPlayRow[];
  totalCount: number;
  expanded: boolean;
  onToggleExpand: () => void;
};

export function ReconsiderPlays({ rows, totalCount, expanded, onToggleExpand }: Props) {
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
            footer={<p className="font-barlow text-[11px] text-red-200/80">Mostly called on {r.common_scenario ?? "Unknown"}</p>}
            successRate={r.success_rate}
            uses={r.uses}
            avgYards={r.avg_yards}
            variant="red"
          />
        ))}
        {totalCount > 3 ? (
          <button type="button" className="font-body mt-2 text-sm text-red-200/90 hover:underline" onClick={onToggleExpand}>
            {expanded ? "Show less" : "Show all"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
