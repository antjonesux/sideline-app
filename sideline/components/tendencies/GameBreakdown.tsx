"use client";

import { ResultBadge } from "@/components/import/ResultBadge";
import { GameStatsInline } from "@/components/film/GameStatsInline";
import { GameFormationTable } from "@/components/tendencies/GameFormationTable";
import { GameStatsGrid } from "@/components/tendencies/GameStatsGrid";
import { DrivePlayTable, DRIVE_PLAY_TABLE_ROW } from "@/components/shared/DrivePlayTable";
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
  const playbookUsed = (game.offensive_playbook ?? "").trim() || (game.my_playbook ?? "").trim() || "—";

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
        <p className="font-body text-[11px] uppercase tracking-wide text-slate-500">
          Offense Used:
          <span className="ml-1 font-mono text-slate-300">{playbookUsed}</span>
        </p>
        <div className="app-horizontal-scroll-strip">
          <GameStatsInline playCount={stats.play_count} driveCount={stats.drive_count} totalYards={stats.total_yards} tds={stats.tds} turnovers={stats.turnovers} />
        </div>
      </header>

      <section className="space-y-3">
        <h3 className="app-section-title">Game stats</h3>
        <GameStatsGrid stats={data.stats} />
      </section>

      <section className="space-y-3">
        <h3 className="app-section-title">Drive summary</h3>
        <div className="flex flex-col gap-3">
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
              <div key={drive.id} className="app-card overflow-hidden">
                <button
                  type="button"
                  className="app-no-press-scale app-accordion-header-row flex w-full min-w-0 items-center gap-3 py-3 pl-4 pr-3 text-left transition-colors hover:bg-slate-800/40"
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? "Collapse drive plays" : "Expand drive plays"}
                  onClick={() => toggleDrive(drive.id)}
                >
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-0 gap-y-1 text-[13px] text-slate-400">
                    <span className="font-heading shrink-0 text-[15px] font-bold uppercase tracking-[1.2px] text-amber-400">
                      Drive {drive.drive_number}
                    </span>
                    <span className="mx-1.5 shrink-0 text-slate-500">·</span>
                    <span className="shrink-0">
                      {badge === "ACTIVE" || badge === "NO PLAYS" ? (
                        <span className="font-mono rounded-full border border-[#2A2E3A] bg-[#1C1F28] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#A0A3AD]">
                          {badge}
                        </span>
                      ) : (
                        <ResultBadge label={badge === "TD" ? "TOUCHDOWN" : badge === "FG" ? "FIELD_GOAL" : badge} />
                      )}
                    </span>
                    <span className="mx-1.5 shrink-0 text-slate-500">·</span>
                    <span className="font-body whitespace-nowrap">{qLabel}</span>
                    <span className="mx-1.5 shrink-0 text-slate-500">·</span>
                    <span className="whitespace-nowrap">
                      <span className="font-mono tabular-nums text-slate-300">{playCount}</span>
                      <span className="font-body ml-1">{playCount === 1 ? "play" : "plays"}</span>
                    </span>
                    <span className="mx-1.5 shrink-0 text-slate-500">·</span>
                    <span className="whitespace-nowrap">
                      <span className="font-mono tabular-nums text-slate-300">{yardsLabel}</span>
                      <span className="font-body ml-1">yds</span>
                    </span>
                  </div>
                  <span className="inline-flex size-11 shrink-0 items-center justify-center text-slate-400" aria-hidden>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`accordion-chevron text-current ${isExpanded ? "open" : ""}`}
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </button>
                {isExpanded ? (
                  <div className="border-t border-slate-800/80 bg-slate-950/40">
                    <DrivePlayTable>
                      {plays.map((p) => {
                        const yds = p.yards_gained ?? 0;
                        const ydsClass = yds > 0 ? "text-[#10B981]" : yds < 0 ? "text-[#C0392B]" : "text-[#A0A3AD]";
                        const ydsText = yds > 0 ? `+${yds}` : String(yds);
                        return (
                          <div key={p.id} className={DRIVE_PLAY_TABLE_ROW}>
                            <span className="whitespace-nowrap font-mono text-[12px] font-normal tabular-nums text-[#A0A3AD]">
                              {p.down ?? "—"}-{p.distance ?? "—"}
                            </span>
                            <span className="min-w-0 truncate font-mono text-[12px] font-medium uppercase text-white">
                              {p.play_name}
                              <span className="mt-0.5 block truncate font-body text-[11px] normal-case text-slate-400 sm:hidden">
                                {p.formation}
                              </span>
                            </span>
                            <span className="hidden min-w-0 truncate font-body text-[13px] font-normal text-[#F5F5F0] sm:block">{p.formation}</span>
                            <span className="min-w-0 justify-self-end overflow-hidden">
                              <ResultBadge label={p.result_tag} />
                            </span>
                            <span className={`min-w-0 whitespace-nowrap text-right justify-self-end font-mono text-[13px] font-semibold tabular-nums ${ydsClass}`}>
                              {ydsText}
                            </span>
                          </div>
                        );
                      })}
                    </DrivePlayTable>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="app-section-title">Formations (this game)</h3>
        <GameFormationTable rows={formation_breakdown} />
      </section>
    </div>
  );
}
