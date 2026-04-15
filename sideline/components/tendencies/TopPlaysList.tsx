"use client";

import { RankedRow } from "@/components/tendencies/RankedRow";

export type TopPlayRow = {
  formation: string;
  play_name: string;
  uses: number;
  avg_yards: number;
  success_rate: number;
};

type Props = {
  rows: TopPlayRow[];
  totalMatching: number;
  expanded: boolean;
  onToggleExpand: () => void;
};

export function TopPlaysList({ rows, totalMatching, expanded, onToggleExpand }: Props) {
  return (
    <div className="app-card px-3 py-1 sm:px-4">
      {rows.map((r, i) => (
        <RankedRow
          key={`${r.formation}-${r.play_name}`}
          rank={i + 1}
          title={
            <>
              <span className="font-body font-normal text-slate-200">{r.formation}</span>
              <span className="text-slate-600"> → </span>
              <span className="font-mono text-[12px] font-medium uppercase text-white">{r.play_name}</span>
            </>
          }
          successRate={r.success_rate}
          uses={r.uses}
          avgYards={r.avg_yards}
        />
      ))}
      {!expanded && totalMatching > 10 ? (
        <button type="button" className="font-body py-2 text-sm text-emerald-400/90 hover:underline" onClick={onToggleExpand}>
          Show all ({totalMatching})
        </button>
      ) : null}
      {expanded && totalMatching > 10 ? (
        <button type="button" className="font-body py-2 text-sm text-slate-400 hover:underline" onClick={onToggleExpand}>
          Show top 10
        </button>
      ) : null}
    </div>
  );
}
