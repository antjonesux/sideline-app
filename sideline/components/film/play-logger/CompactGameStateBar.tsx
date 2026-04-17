"use client";

import type { GameState } from "@/lib/gameStateEngine";
import { formatDownDistanceLabel } from "@/lib/formatDownDistance";
import { formatFieldPosition, fromAbsoluteYard } from "@/lib/fieldPosition";

type CompactGameStateBarProps = {
  gameState: GameState;
};

/** Read-only strip for the play logger: down & distance, field, drive # — no controls. */
export function CompactGameStateBar({ gameState }: CompactGameStateBarProps) {
  const { side, yard_line } = fromAbsoluteYard(gameState.absoluteYard);
  const isGoalToGo = side === "OPP" && yard_line >= 1 && yard_line <= 10;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-mono text-sm font-medium uppercase tracking-wide text-white dark:text-white">
          {formatDownDistanceLabel(gameState.down, gameState.distance, {
            isGoalToGo,
            yardLine: yard_line,
            isInches: gameState.isInches,
          })}
        </span>
        <span className="font-mono text-sm text-slate-500 dark:text-slate-500" aria-hidden>
          ·
        </span>
        <span className="font-mono text-sm font-normal text-slate-400 dark:text-slate-400">
          {formatFieldPosition(gameState.absoluteYard)}
        </span>
        <span className="font-mono text-sm text-slate-500 dark:text-slate-500" aria-hidden>
          ·
        </span>
        <span className="font-mono text-sm font-medium text-amber-400 dark:text-amber-400">Drive {gameState.driveNumber}</span>
      </div>
    </div>
  );
}
