"use client";

type Props = {
  playCount: number;
  driveCount: number;
  totalYards: number;
  tds: number;
  turnovers: number;
  className?: string;
};

export function GameStatsInline({ playCount, driveCount, totalYards, tds, turnovers, className }: Props) {
  return (
    <p className={className ?? "font-body text-[11px] uppercase tracking-wide text-slate-500"}>
      <span className="font-mono tabular-nums text-slate-300">{playCount}</span>
      <span className="ml-1">{playCount === 1 ? "play" : "plays"}</span>
      <span className="mx-1.5 text-slate-600">·</span>
      <span className="font-mono tabular-nums">{driveCount}</span>
      <span className="ml-1">{driveCount === 1 ? "drive" : "drives"}</span>
      <span className="mx-1.5 text-slate-600">·</span>
      <span className="font-mono tabular-nums">{totalYards}</span>
      <span className="ml-1">yds</span>
      <span className="mx-1.5 text-slate-600">·</span>
      <span className="font-mono tabular-nums">{tds}</span>
      <span className="ml-1">TD</span>
      <span className="mx-1.5 text-slate-600">·</span>
      <span className="font-mono tabular-nums">{turnovers}</span>
      <span className="ml-1">TO</span>
    </p>
  );
}
