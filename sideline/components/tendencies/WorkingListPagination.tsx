"use client";

export const WORKING_LIST_PAGE_SIZE = 20;

type Props = {
  page: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

export function WorkingListPagination({ page, totalItems, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(totalItems / WORKING_LIST_PAGE_SIZE));
  if (totalItems <= WORKING_LIST_PAGE_SIZE) return null;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex flex-col items-center py-3">
      <div className="flex w-full max-w-md items-center justify-center gap-4">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => canPrev && onPageChange(page - 1)}
          className="min-h-[44px] min-w-[44px] shrink-0 px-2 font-body text-sm text-slate-400 hover:text-slate-200 disabled:cursor-not-allowed disabled:text-slate-600 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        >
          ← Previous
        </button>
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-slate-500">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => canNext && onPageChange(page + 1)}
          className="min-h-[44px] min-w-[44px] shrink-0 px-2 font-body text-sm text-slate-400 hover:text-slate-200 disabled:cursor-not-allowed disabled:text-slate-600 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
