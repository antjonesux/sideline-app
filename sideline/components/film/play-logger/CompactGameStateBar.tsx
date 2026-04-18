"use client";

import { useId, useState, type ReactNode } from "react";
import type { GameState } from "@/lib/gameStateEngine";
import { formatDownDistanceLabel } from "@/lib/formatDownDistance";
import { formatFieldPosition, fromAbsoluteYard } from "@/lib/fieldPosition";

type CompactGameStateBarProps = {
  gameState: GameState;
  /** Extra snap / field controls rendered below the summary inside the same card (hidden until the header is toggled). */
  children?: ReactNode;
};

function SummaryLine({ gameState }: { gameState: GameState }) {
  const { side, yard_line } = fromAbsoluteYard(gameState.absoluteYard);
  const isGoalToGo = side === "OPP" && yard_line >= 1 && yard_line <= 10;

  return (
    <>
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
    </>
  );
}

/** Play logger header card: down & distance, field, drive #, optional snap editors behind the header tap. */
export function CompactGameStateBar({ gameState, children }: CompactGameStateBarProps) {
  const panelId = useId();
  const [editorsOpen, setEditorsOpen] = useState(false);
  const hasEditors = Boolean(children);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
      {hasEditors ? (
        <button
          type="button"
          className="flex min-h-11 w-full flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-lg text-left text-current transition-colors hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 motion-reduce:transition-none"
          onClick={() => setEditorsOpen((o) => !o)}
          aria-expanded={editorsOpen}
          aria-controls={panelId}
          aria-label={editorsOpen ? "Hide down, distance, and field editors" : "Edit down, distance, and field position"}
        >
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
            <SummaryLine gameState={gameState} />
          </span>
          <span className="inline-flex size-11 shrink-0 items-center justify-center text-slate-400 dark:text-slate-400" aria-hidden>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`accordion-chevron text-current motion-reduce:transition-none ${editorsOpen ? "open" : ""}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <SummaryLine gameState={gameState} />
        </div>
      )}
      {hasEditors && editorsOpen ? (
        <div
          id={panelId}
          className="fade-in mt-3 space-y-3 border-t border-slate-800/80 pt-3 dark:border-slate-800/80"
          role="region"
          aria-label="Snap and field position"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
