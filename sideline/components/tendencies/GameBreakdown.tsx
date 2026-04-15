"use client";

import { ResultBadge } from "@/components/import/ResultBadge";
import { GameFormationTable } from "@/components/tendencies/GameFormationTable";
import { GameStatsGrid } from "@/components/tendencies/GameStatsGrid";
import type { PlayTypeBucket } from "@/lib/tendenciesPlayType";
import type { GameSession } from "@/lib/types";
import type { DriveWithPlays } from "@/lib/tendenciesGameBreakdown";
import { useMemo, useState } from "react";

type Stats = {
  play_count: number;
  drive_count: number;
  total_yards: number;
  tds: number;
  turnovers: number;
  success_rate: number;
  avg_yards_per_play: number;
  run_pct: number;
  pass_pct: number;
  most_used_formation: string;
  best_play: { label: string; success_rate: number; uses: number } | null;
  worst_play: { label: string; success_rate: number; uses: number } | null;
};

type FormationAgg = {
  formation: string;
  plays: number;
  avg_yards: number;
  success_rate: number;
  play_rows: DriveWithPlays["plays"];
};

export type GameTendenciesPayload = {
  game: GameSession;
  drives: DriveWithPlays[];
  stats: Stats;
  formation_breakdown: FormationAgg[];
  play_type_buckets?: PlayTypeBucket[];
};

function getDriveResult(
  plays: DriveWithPlays["plays"] | undefined | null,
): "TOUCHDOWN" | "TURNOVER" | "PUNT" | "FIELD_GOAL" | "ACTIVE" | "NO_PLAYS" {
  if (!plays || plays.length === 0) return "NO_PLAYS";
  const lastPlay = plays[plays.length - 1];
  if (lastPlay.result_tag === "TOUCHDOWN") return "TOUCHDOWN";
  if (lastPlay.result_tag === "TURNOVER") return "TURNOVER";
  if (lastPlay.result_tag === "PUNT") return "PUNT";
  if (lastPlay.result_tag === "FIELD_GOAL") return "FIELD_GOAL";
  return "ACTIVE";
}

function driveLabel(outcome: ReturnType<typeof getDriveResult>, last: DriveWithPlays["plays"][0] | undefined) {
  if (outcome === "TOUCHDOWN") return "TD";
  if (outcome === "FIELD_GOAL") return "FG";
  if (outcome === "TURNOVER") return "TURNOVER";
  if (outcome === "PUNT") return "PUNT";
  if (outcome === "NO_PLAYS") return "NO PLAYS";
  const norm = (last?.result_tag ?? "").toUpperCase().replace(/\s+/g, "_");
  if (norm === "FIRST_DOWN") return "FIRST DOWN";
  return "ACTIVE";
}

type Props = {
  data: GameTendenciesPayload;
};

export function GameBreakdown({ data }: Props) {
  const { game, drives, stats, formation_breakdown } = data;
  const [expandedDriveIds, setExpandedDriveIds] = useState<string[]>([]);

  const title = useMemo(() => {
    const res = game.result === "W" ? "W" : game.result === "L" ? "L" : "—";
    const ms = game.my_score ?? "—";
    const os = game.opponent_score ?? "—";
    return { line: `vs ${game.opponent_team} — ${res} ${ms}–${os}` };
  }, [game]);

  function toggleDrive(id: string) {
    setExpandedDriveIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h2 className="font-heading text-2xl font-bold uppercase tracking-wide text-slate-100 sm:text-3xl">{title.line}</h2>
        <p className="font-mono text-[11px] text-slate-500">
          <span className="tabular-nums text-slate-400">{stats.play_count} plays</span>
          <span className="mx-1.5 text-slate-600">·</span>
          <span className="tabular-nums">{stats.drive_count} drives</span>
          <span className="mx-1.5 text-slate-600">·</span>
          <span className="tabular-nums">{stats.total_yards} total yards</span>
          <span className="mx-1.5 text-slate-600">·</span>
          <span className="tabular-nums">{stats.tds} TDs</span>
          <span className="mx-1.5 text-slate-600">·</span>
          <span className="tabular-nums">{stats.turnovers} turnovers</span>
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="app-section-title">Drive summary</h3>
        <div className="space-y-2">
          {drives.map((drive) => {
            const plays = drive.plays ?? [];
            const playCount = plays.length;
            const yardsGained = plays.reduce((s, p) => s + (p.yards_gained ?? 0), 0);
            const yardsLabel = yardsGained >= 0 ? `+${yardsGained}` : String(yardsGained);
            const outcome = getDriveResult(plays);
            const last = plays[plays.length - 1];
            const badge = driveLabel(outcome, last);
            const isExpanded = expandedDriveIds.includes(drive.id);
            const qLabel = drive.quarter != null && drive.quarter >= 5 ? "OT" : drive.quarter != null ? `Q${drive.quarter}` : "—";
            return (
              <div key={drive.id} className="app-card px-3 py-3 sm:px-4">
                <div className="flex items-center gap-2">
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => toggleDrive(drive.id)}>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-slate-500">{isExpanded ? "▼" : "▶"}</span>
                      <span className="font-heading text-[15px] font-bold uppercase tracking-[1.2px] text-amber-400">
                        Drive {drive.drive_number}
                      </span>
                      <span className="font-mono text-[10px] font-semibold uppercase text-slate-400">{badge}</span>
                      <span className="font-body text-[13px] text-slate-400">
                        <span className="whitespace-nowrap">{qLabel}</span>
                        <span className="mx-1.5 text-slate-500">·</span>
                        <span className="whitespace-nowrap">
                          {playCount} {playCount === 1 ? "play" : "plays"}
                        </span>
                        <span className="mx-1.5 text-slate-500">·</span>
                        <span className="whitespace-nowrap">{yardsLabel} yds</span>
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent text-slate-400 hover:bg-white/5"
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? "Collapse drive" : "Expand drive"}
                    onClick={() => toggleDrive(drive.id)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isExpanded ? "rotate-180" : ""}>
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                </div>
                {isExpanded ? (
                  <div className="mt-3 space-y-0 border-t border-white/[0.06] pt-2">
                    {plays.map((p) => {
                      const yds = p.yards_gained ?? 0;
                      const ydsClass = yds > 0 ? "text-[#10B981]" : yds < 0 ? "text-[#C0392B]" : "text-[#A0A3AD]";
                      const ydsText = yds > 0 ? `+${yds}` : String(yds);
                      return (
                        <div key={p.id} className="flex min-w-0 flex-wrap items-center gap-1 border-b border-white/[0.04] py-2 text-left last:border-0 sm:gap-1.5">
                          <span className="font-mono shrink-0 text-[12px] tabular-nums text-slate-400">
                            {p.down}-{p.distance}
                          </span>
                          <span className="text-[#A0A3AD]/35">→</span>
                          <span className="font-body min-w-0 max-w-[40%] truncate text-[13px] text-slate-100">{p.formation}</span>
                          <span className="text-[#A0A3AD]/35">→</span>
                          <span className="font-mono min-w-0 max-w-[40%] truncate text-[12px] font-medium uppercase text-white">{p.play_name}</span>
                          <span className="text-[#A0A3AD]/35">→</span>
                          <span className="shrink-0">
                            <ResultBadge label={p.result_tag} />
                          </span>
                          <span className="text-[#A0A3AD]/35">→</span>
                          <span className={`font-mono text-[13px] font-semibold tabular-nums ${ydsClass}`}>{ydsText}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="app-section-title">Game stats</h3>
        <GameStatsGrid stats={data.stats} />
      </section>

      <section className="space-y-3">
        <h3 className="app-section-title">Formations (this game)</h3>
        <GameFormationTable rows={formation_breakdown} />
      </section>
    </div>
  );
}
