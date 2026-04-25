export function PlaybookCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4" aria-hidden>
      <div className="h-5 w-2/3 max-w-xs animate-pulse rounded bg-slate-700/90" />
      <div className="mt-1 h-4 w-40 animate-pulse rounded bg-slate-700/70" />
      <div className="mt-2 h-3.5 w-56 max-w-full animate-pulse rounded bg-slate-700/50" />
      <div className="mt-1 h-3 w-32 animate-pulse rounded bg-slate-700/40" />
    </div>
  );
}
