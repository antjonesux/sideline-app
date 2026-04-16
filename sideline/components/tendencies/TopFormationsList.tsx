"use client";

import { RankedRow } from "@/components/tendencies/RankedRow";
import { WorkingListPagination, WORKING_LIST_PAGE_SIZE } from "@/components/tendencies/WorkingListPagination";
import { WorkingRankMetrics } from "@/components/tendencies/WorkingRankMetrics";

export type TopFormationRow = {
  formation: string;
  uses: number;
  avg_yards: number;
  touchdowns: number;
  first_downs: number;
  composite_score: number;
  success_rate: number;
  best_play: {
    play_name: string;
    uses: number;
    avg_yards: number;
    touchdowns: number;
    first_downs: number;
  } | null;
};

type Props = {
  rows: TopFormationRow[];
  totalCount: number;
  expanded: boolean;
  onToggleExpand: () => void;
  rankOffset?: number;
  page?: number;
  onPageChange?: (page: number) => void;
};

export function TopFormationsList({
  rows,
  totalCount,
  expanded,
  onToggleExpand,
  rankOffset = 0,
  page = 1,
  onPageChange,
}: Props) {
  const showPagination = expanded && totalCount > WORKING_LIST_PAGE_SIZE && onPageChange;

  return (
    <div className="app-card app-card-pad overflow-hidden">
      {rows.map((r, i) => (
        <RankedRow
          key={r.formation}
          rank={rankOffset + i + 1}
          title={<span className="font-body font-normal text-slate-200">{r.formation}</span>}
          metrics={
            <WorkingRankMetrics
              touchdowns={r.touchdowns}
              first_downs={r.first_downs}
              uses={r.uses}
              avg_yards={r.avg_yards}
            />
          }
          footer={
            r.best_play ? (
              <div className="space-y-1">
                <p className="font-body text-[11px] text-slate-500">Best play</p>
                <p className="font-mono text-[11px] font-medium uppercase leading-snug text-slate-300">{r.best_play.play_name}</p>
                <WorkingRankMetrics
                  touchdowns={r.best_play.touchdowns}
                  first_downs={r.best_play.first_downs}
                  uses={r.best_play.uses}
                  avg_yards={r.best_play.avg_yards}
                />
              </div>
            ) : null
          }
        />
      ))}
      {showPagination ? (
        <WorkingListPagination page={page} totalItems={totalCount} onPageChange={onPageChange} />
      ) : null}
      {!expanded && totalCount > 3 ? (
        <button
          type="button"
          className="font-body min-h-[44px] py-2 text-sm text-emerald-400/90 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          onClick={onToggleExpand}
        >
          Show all
        </button>
      ) : null}
      {expanded ? (
        <button
          type="button"
          className="font-body min-h-[44px] py-2 text-sm text-slate-400 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          onClick={onToggleExpand}
        >
          Show less
        </button>
      ) : null}
    </div>
  );
}
