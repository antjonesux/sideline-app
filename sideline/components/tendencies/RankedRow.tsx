"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

type Props = {
  rank: number;
  title: React.ReactNode;
  /** When set, success bar is hidden and this block is shown instead (e.g. What's Working metrics). */
  metrics?: React.ReactNode;
  successRate?: number;
  uses?: number;
  avgYards?: number;
  variant?: "emerald" | "red";
  footer?: React.ReactNode;
};

export function RankedRow({
  rank,
  title,
  metrics,
  successRate = 0,
  uses = 0,
  avgYards = 0,
  variant = "emerald",
  footer,
}: Props) {
  if (metrics) {
    return (
      <div className="border-b border-slate-800/90 py-3 last:border-0">
        <div className="flex gap-3">
          <span className="font-mono w-6 shrink-0 pt-0.5 text-[13px] tabular-nums text-slate-500">{rank}.</span>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="font-body text-[15px] leading-snug text-slate-100">{title}</div>
            {metrics}
            {footer ? <div className="pt-0.5">{footer}</div> : null}
          </div>
        </div>
      </div>
    );
  }

  const fill = variant === "emerald" ? "text-emerald-500" : "text-red-600";
  const pct = Math.max(0, Math.min(100, successRate));
  return (
    <div className="border-b border-slate-800/90 py-3 last:border-0">
      <div className="flex gap-3">
        <span className="font-mono w-6 shrink-0 pt-0.5 text-[13px] tabular-nums text-slate-500">{rank}.</span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="font-body text-[15px] leading-snug text-slate-100">{title}</div>
          <div className="h-[6px] w-full overflow-hidden rounded-full bg-slate-700">
            <svg className={`h-full w-full ${fill}`} viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden>
              <rect x="0" y="0" width={pct} height="6" rx="3" fill="currentColor" />
            </svg>
          </div>
          <p className="font-body text-[11px] text-slate-500">
            <span className="font-mono tabular-nums text-slate-300">{successRate}%</span>
            <span className="mx-1.5 text-slate-600">·</span>
            <span className="font-mono tabular-nums">{uses}</span>
            <span className="ml-1">calls</span>
            <span className="mx-1.5 text-slate-600">·</span>
            <span className="font-mono tabular-nums">{avgYards}</span>
            <span className="ml-1">avg yds</span>
          </p>
          {footer ? <div className="pt-0.5">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
