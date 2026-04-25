"use client";

import { RankedRow } from "@/components/tendencies/RankedRow";
import { normalizePlayName } from "@/lib/utils";
import { WorkingListPagination, WORKING_LIST_PAGE_SIZE } from "@/components/tendencies/WorkingListPagination";
import { WorkingRankMetrics } from "@/components/tendencies/WorkingRankMetrics";

export type TopPlayRow = {
  formation: string;
  play_name: string;
  uses: number;
  avg_yards: number;
  touchdowns: number;
  first_downs: number;
  composite_score: number;
  success_rate: number;
  common_scenario?: string;
};

type Props = {
  rows: TopPlayRow[];
  totalMatching: number;
  expanded: boolean;
  onToggleExpand: () => void;
  rankOffset?: number;
  page?: number;
  onPageChange?: (page: number) => void;
};

export function TopPlaysList({
  rows,
  totalMatching,
  expanded,
  onToggleExpand,
  rankOffset = 0,
  page = 1,
  onPageChange,
}: Props) {
  const showPagination = expanded && totalMatching > WORKING_LIST_PAGE_SIZE && onPageChange;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1 sm:px-4">
      {rows.map((r, i) => (
        <RankedRow
          key={`${r.formation}-${r.play_name}`}
          rank={rankOffset + i + 1}
          title={
            <>
              <span className="font-body font-normal text-slate-200">{r.formation}</span>
              <span className="text-slate-600"> → </span>
              <span className="font-mono text-[12px] font-medium uppercase text-white">{normalizePlayName(r.play_name)}</span>
            </>
          }
          metrics={
            <WorkingRankMetrics
              touchdowns={r.touchdowns}
              first_downs={r.first_downs}
              uses={r.uses}
              avg_yards={r.avg_yards}
            />
          }
        />
      ))}
      {showPagination ? (
        <WorkingListPagination page={page} totalItems={totalMatching} onPageChange={onPageChange} />
      ) : null}
      {!expanded && totalMatching > 5 ? (
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
