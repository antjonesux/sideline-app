"use client";

type Stats = {
  success_rate: number;
  avg_yards_per_play: number;
  run_pct: number;
  pass_pct: number;
  most_used_formation: string;
  best_play: { label: string; success_rate: number; uses: number } | null;
  worst_play: { label: string; success_rate: number; uses: number } | null;
};

type Props = {
  stats: Stats;
};

function Card({ label, value, dense, valueClass }: { label: string; value: string; dense?: boolean; valueClass?: string }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <p className="font-mono text-[10px] font-normal uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={
          valueClass ??
          (dense
            ? "mt-1 line-clamp-2 font-mono text-xs font-medium leading-snug text-slate-100"
            : "mt-1 font-mono text-xl font-semibold leading-[1.05] tabular-nums text-slate-100")
        }
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

export function GameStatsGrid({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card label="Success rate" value={`${stats.success_rate}%`} />
      <Card label="Avg yards / play" value={`${stats.avg_yards_per_play}`} />
      <Card label="Run / pass" value={`${stats.run_pct}% / ${stats.pass_pct}%`} />
      <Card
        label="Most used formation"
        value={stats.most_used_formation}
        valueClass="mt-1 font-body text-base font-medium leading-snug text-slate-100"
      />
      <Card label="Best play" value={stats.best_play ? `${stats.best_play.label}` : "—"} dense />
      <Card label="Worst play" value={stats.worst_play ? `${stats.worst_play.label}` : "—"} dense />
    </div>
  );
}
