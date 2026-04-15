"use client";

type Row = { scenario: string; run_pct: number; total_plays: number; warn: boolean };

type Props = {
  rows: Row[];
};

export function SituationTendencies({ rows }: Props) {
  if (rows.length === 0) {
    return <p className="font-body text-sm text-slate-500">No situation data yet.</p>;
  }
  return (
    <div className="app-card px-3 py-2">
      {rows.map((r) => {
        const runW = `${r.run_pct}%`;
        const passW = `${100 - r.run_pct}%`;
        return (
          <div key={r.scenario} className="flex items-center gap-3 border-b border-slate-800/80 py-2.5 last:border-0">
            <span className="font-body w-[120px] shrink-0 text-sm text-slate-200 sm:w-[140px]">{r.scenario}</span>
            <div className="h-[6px] min-w-0 flex-1 overflow-hidden rounded-full bg-slate-700">
              <div className="flex h-full w-full">
                <div className="h-full bg-emerald-500" style={{ width: runW }} title={`${r.run_pct}% run`} />
                <div className="h-full bg-blue-500" style={{ width: passW }} title={`${(100 - r.run_pct).toFixed(1)}% pass`} />
              </div>
            </div>
            <span className="font-mono w-16 shrink-0 text-right text-[11px] tabular-nums text-slate-400">{r.run_pct}% run</span>
            <span className="w-5 shrink-0 text-center text-amber-400" title={r.warn ? "Strong tendency" : undefined}>
              {r.warn ? "⚠" : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
