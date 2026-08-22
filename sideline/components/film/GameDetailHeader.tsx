"use client";

import { GameStatsInline } from "@/components/film/GameStatsInline";
import { BackNavLink } from "@/components/shared/BackNavLink";
import { FILM_RESUME_GAME_CTA } from "@/lib/coachCopy";
import { filmGameSecondaryActionClass, formatGameDetailDate } from "@/lib/filmGameDetailHelpers";
import type { GameSession } from "@/lib/types";

type GameDetailStats = {
  playCount: number;
  driveCount: number;
  totalYards: number;
  tds: number;
  turnovers: number;
};

type GameDetailHeaderProps = {
  game: GameSession | null;
  stats: GameDetailStats;
  isGameEnded: boolean;
  endingGame: boolean;
  onAddDrive: () => void;
  onEndGame: () => void;
  onResumeGame: () => void;
};

export function GameDetailHeader({
  game,
  stats,
  isGameEnded,
  endingGame,
  onAddDrive,
  onEndGame,
  onResumeGame,
}: GameDetailHeaderProps) {
  const resultLabel = game?.result === "W" ? "W" : game?.result === "L" ? "L" : "—";
  const scoreMine = game?.my_score ?? "—";
  const scoreOpp = game?.opponent_score ?? "—";

  return (
    <div className="space-y-3 pb-4">
      <BackNavLink />
      <h1 className="font-heading text-lg font-bold uppercase tracking-[0.1em] text-slate-100 w-full min-w-0 text-lg leading-snug sm:text-xl">
        {game ? (
          <>
            {game.my_playbook}
            <span className="mx-2 font-body font-normal text-slate-500">vs</span>
            {game.opponent_team}
          </>
        ) : (
          "…"
        )}
      </h1>

      <p className="font-body text-sm text-slate-400">
        <span className="font-mono font-semibold text-slate-200">{resultLabel}</span>
        <span className="mx-2 font-mono tabular-nums text-slate-200">
          {scoreMine} – {scoreOpp}
        </span>
        {game?.game_date ? (
          <>
            <span className="mx-2 text-slate-600">·</span>
            <span>{formatGameDetailDate(game.game_date)}</span>
          </>
        ) : null}
      </p>
      <div className="overflow-x-auto touch-pan-x overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none]">
        <GameStatsInline
          playCount={stats.playCount}
          driveCount={stats.driveCount}
          totalYards={stats.totalYards}
          tds={stats.tds}
          turnovers={stats.turnovers}
        />
      </div>
      <div className="flex min-h-11 flex-wrap gap-2">
        {!isGameEnded ? (
          <button type="button" onClick={onAddDrive} className={filmGameSecondaryActionClass}>
            <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-emerald-400 motion-safe:animate-pulse" aria-hidden />
            Add Drive
          </button>
        ) : null}
        {isGameEnded ? (
          <button
            type="button"
            disabled={endingGame}
            onClick={onResumeGame}
            className={`${filmGameSecondaryActionClass} border-emerald-700/80 text-emerald-200 hover:border-emerald-500 hover:text-emerald-50`}
          >
            <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-emerald-400 motion-safe:animate-pulse" aria-hidden />
            {FILM_RESUME_GAME_CTA}
          </button>
        ) : (
          <button type="button" onClick={onEndGame} className={filmGameSecondaryActionClass}>
            End Game
          </button>
        )}
      </div>
    </div>
  );
}
