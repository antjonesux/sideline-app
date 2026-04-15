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

function Card({ label, value, dense }: { label: string; value: string; dense?: boolean }) {
  return (
    <div className="app-card p-3">
      <p className="app-field-label">{label}</p>
      <p
        className={`font-mono mt-1 font-bold text-slate-100 ${dense ? "line-clamp-3 text-sm leading-snug sm:text-base" : "text-2xl tabular-nums sm:text-3xl"}`}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

export function GameStatsGrid({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <Card label="Success rate" value={`${stats.success_rate}%`} />
      <Card label="Avg yards / play" value={`${stats.avg_yards_per_play}`} />
      <Card label="Run / pass" value={`${stats.run_pct}% / ${stats.pass_pct}%`} />
      <Card label="Most used formation" value={stats.most_used_formation} />
      <Card label="Best play" value={stats.best_play ? `${stats.best_play.label}` : "—"} dense />
      <Card label="Worst play" value={stats.worst_play ? `${stats.worst_play.label}` : "—"} dense />
    </div>
  );
}
