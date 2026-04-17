"use client";

import type { TopPlayRow } from "@/components/tendencies/TopPlaysList";
import { RankedRow } from "@/components/tendencies/RankedRow";
import { normalizePlayName } from "@/lib/utils";
import { ReconsiderRankMetrics } from "@/components/tendencies/ReconsiderRankMetrics";
import { WorkingListPagination, WORKING_LIST_PAGE_SIZE } from "@/components/tendencies/WorkingListPagination";

type Props = {
  rows: TopPlayRow[];
  totalCount: number;
  expanded: boolean;
  onToggleExpand: () => void;
  rankOffset?: number;
  page?: number;
  onPageChange?: (page: number) => void;
};

export function ReconsiderPlays({
  rows,
  totalCount,
  expanded,
  onToggleExpand,
  rankOffset = 0,
  page = 1,
  onPageChange,
}: Props) {
  if (rows.length === 0 && !expanded) return null;
  const showPagination = expanded && totalCount > WORKING_LIST_PAGE_SIZE && onPageChange;

  return (
    <div className="rounded-xl border border-red-800/20 bg-red-900/10 px-3 py-3 sm:px-4">
      <p className="mb-3 font-body text-[13px] font-normal text-slate-500">Plays you keep calling that aren&apos;t producing results.</p>
      <div>
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
              <ReconsiderRankMetrics
                touchdowns={r.touchdowns}
                first_downs={r.first_downs}
                uses={r.uses}
                avg_yards={r.avg_yards}
              />
            }
            footer={
              <p className="font-body text-[11px] text-red-200/85">
                Mostly called on: {r.common_scenario ?? "Unknown"}
              </p>
            }
          />
        ))}
        {showPagination ? (
          <WorkingListPagination page={page} totalItems={totalCount} onPageChange={onPageChange} />
        ) : null}
        {!expanded && totalCount > 3 ? (
          <button
            type="button"
            className="font-body mt-2 min-h-[44px] text-sm text-red-200/90 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            onClick={onToggleExpand}
          >
            Show all
          </button>
        ) : null}
        {expanded ? (
          <button
            type="button"
            className="font-body mt-2 min-h-[44px] text-sm text-slate-400 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            onClick={onToggleExpand}
          >
            Show less
          </button>
        ) : null}
      </div>
    </div>
  );
}
