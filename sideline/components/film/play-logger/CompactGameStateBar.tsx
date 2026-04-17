"use client";

import { DropdownMenu, type DropdownMenuItem } from "@/components/shared/DropdownMenu";
import { useEffect, useId, useState } from "react";
import type { GameState } from "@/lib/gameStateEngine";
import { formatDownDistanceLabel } from "@/lib/formatDownDistance";
import { formatFieldPosition, fromAbsoluteYard, parseFieldPosition } from "@/lib/fieldPosition";
import type { Side } from "@/lib/derivePlayContext";

type CompactGameStateBarProps = {
  gameState: GameState;
  onChange: (next: GameState) => void;
  onStartNewDrive: () => void;
  onEditToggle: () => void;
  /** When set, shown on the summary row (play logger). Field editor opens from the summary tap. */
  driveMenuItems?: DropdownMenuItem[];
};

const motionPanel =
  "motion-safe:transition-[max-height,opacity] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none";

export function CompactGameStateBar({
  gameState,
  onChange,
  onStartNewDrive,
  onEditToggle,
  driveMenuItems,
}: CompactGameStateBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [distanceInput, setDistanceInput] = useState(String(gameState.distance));
  const [yardInput, setYardInput] = useState("");
  const distId = useId();
  const yardNumId = useId();

  const { side, yard_line } = fromAbsoluteYard(gameState.absoluteYard);
  useEffect(() => {
    setDistanceInput(String(gameState.distance));
    setYardInput(String(yard_line));
  }, [gameState.distance, yard_line]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const isGoalToGo = side === "OPP" && yard_line >= 1 && yard_line <= 10;
  const displayDistance = isGoalToGo ? yard_line : gameState.distance;
  const showInchesToggle = displayDistance === 1;

  function patch(partial: Partial<GameState>) {
    onChange({ ...gameState, ...partial });
  }

  function setFieldSide(nextSide: Side) {
    const y = yard_line;
    const abs = parseFieldPosition(nextSide, y);
    const pos = fromAbsoluteYard(abs);
    const goal = pos.side === "OPP" && pos.yard_line <= 10 && pos.yard_line >= 1;
    const nextDist = goal ? pos.yard_line : gameState.distance;
    patch({
      absoluteYard: abs,
      distance: nextDist,
      isInches: nextDist === 1 ? gameState.isInches : false,
    });
  }

  function setYardNumber(n: number) {
    if (Number.isNaN(n) || n < 1 || n > 50) return;
    const abs = parseFieldPosition(side, n);
    const pos = fromAbsoluteYard(abs);
    const goal = pos.side === "OPP" && pos.yard_line <= 10 && pos.yard_line >= 1;
    const nextDist = goal ? pos.yard_line : gameState.distance;
    patch({
      absoluteYard: abs,
      distance: nextDist,
      isInches: nextDist === 1 ? gameState.isInches : false,
    });
  }

  function applyManualNewDrive() {
    onStartNewDrive();
  }

  const hasDriveMenu = Boolean(driveMenuItems && driveMenuItems.length > 0);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2 p-3 sm:items-center">
        <button
          type="button"
          className="app-no-press-scale min-h-11 min-w-0 flex-1 rounded-lg text-left transition-colors hover:bg-slate-800/40 dark:hover:bg-slate-800/40"
          aria-expanded={expanded}
          aria-label="Adjust down, distance, and field position"
          onClick={() => setExpanded((s) => !s)}
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-sm font-medium uppercase tracking-wide text-white">
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
            <span className="font-mono text-sm font-medium text-amber-400">Drive {gameState.driveNumber}</span>
          </div>
        </button>
        {hasDriveMenu ? (
          <DropdownMenu aria-label="Drive actions" items={driveMenuItems!} />
        ) : (
          <button
            type="button"
            className="app-no-press-scale inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
            aria-expanded={expanded}
            aria-haspopup="menu"
            aria-label="Open field position editor"
            onClick={() => setExpanded((s) => !s)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="12" cy="5" r="1.75" />
              <circle cx="12" cy="12" r="1.75" />
              <circle cx="12" cy="19" r="1.75" />
            </svg>
          </button>
        )}
      </div>

      <div
        className={`grid overflow-hidden ${motionPanel} ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
        aria-hidden={!expanded}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-3 p-4">
            <div>
              <p className="font-sans text-xs font-semibold uppercase tracking-wide text-slate-500">Down</p>
              <div className="mt-1.5 grid grid-cols-4 gap-2">
                {([1, 2, 3, 4] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`min-h-11 rounded-lg border px-2 font-display text-sm font-semibold uppercase tracking-wide transition-colors ${
                      gameState.down === d
                        ? "border-transparent bg-emerald-600 text-white"
                        : "border-slate-600 bg-transparent text-slate-300 hover:border-slate-500"
                    }`}
                    onClick={() => patch({ down: d })}
                  >
                    {d === 1 ? "1ST" : d === 2 ? "2ND" : d === 3 ? "3RD" : "4TH"}
                  </button>
                ))}
              </div>
            </div>

            {isGoalToGo ? (
              <div className="rounded-lg border border-amber-700/50 bg-amber-900/20 px-3 py-2 font-sans text-xs font-medium uppercase tracking-wide text-amber-300">
                Goal to go — distance matches yard line
              </div>
            ) : (
              <label htmlFor={distId} className="block">
                <span className="font-sans text-xs font-semibold uppercase tracking-wide text-slate-500">Yards to go</span>
                <input
                  id={distId}
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  className="mt-1.5 flex min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-center font-mono text-lg text-white dark:border-slate-700 dark:bg-slate-800"
                  value={distanceInput}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    setDistanceInput(v);
                  }}
                  onBlur={() => {
                    if (distanceInput === "") return;
                    const n = parseInt(distanceInput, 10);
                    if (!Number.isNaN(n) && n >= 1) {
                      const next = Math.min(99, n);
                      patch({ distance: next, isInches: next === 1 ? gameState.isInches : false });
                    }
                  }}
                />
              </label>
            )}

            {showInchesToggle ? (
              <div>
                <span className="font-sans text-xs font-semibold uppercase tracking-wide text-slate-500">Short yardage</span>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`min-h-11 rounded-lg border px-3 font-mono text-xs uppercase ${
                      !(gameState.isInches ?? false) ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-600 text-slate-300"
                    }`}
                    onClick={() => patch({ isInches: false })}
                  >
                    1 yd
                  </button>
                  <button
                    type="button"
                    className={`min-h-11 rounded-lg border px-3 font-mono text-xs uppercase ${
                      gameState.isInches ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-600 text-slate-300"
                    }`}
                    onClick={() => patch({ isInches: true })}
                  >
                    {"\u0026 inches"}
                  </button>
                </div>
              </div>
            ) : null}

            <div>
              <p className="font-sans text-xs font-semibold uppercase tracking-wide text-slate-500">Field position</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {(["OWN", "OPP"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`min-h-11 min-w-[4.5rem] flex-1 rounded-lg border px-3 font-display text-sm font-semibold uppercase tracking-wide sm:flex-none ${
                      side === s ? "border-transparent bg-emerald-600 text-white" : "border-slate-600 bg-transparent text-slate-300"
                    }`}
                    onClick={() => setFieldSide(s)}
                  >
                    {s}
                  </button>
                ))}
                <label htmlFor={yardNumId} className="flex min-w-[6rem] flex-1 flex-col sm:max-w-[8rem]">
                  <span className="sr-only">Yard number</span>
                  <input
                    id={yardNumId}
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    aria-label="Yard line 1 to 50"
                    className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-2 text-center font-mono text-lg text-white dark:border-slate-700 dark:bg-slate-800"
                    value={yardInput}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setYardInput(raw);
                    }}
                    onBlur={() => {
                      if (yardInput === "") return;
                      const n = parseInt(yardInput, 10);
                      setYardNumber(n);
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-3">
              <span className="font-sans text-xs text-slate-500">Drive</span>
              <span className="font-mono text-sm text-amber-400">{gameState.driveNumber}</span>
              <button type="button" className="app-no-press-scale min-h-11 px-2 font-sans text-sm font-medium text-amber-400" onClick={applyManualNewDrive}>
                + Drive
              </button>
              <button type="button" className="app-no-press-scale min-h-11 px-2 font-sans text-sm text-slate-400 hover:text-slate-200" onClick={onEditToggle}>
                Edit Play
              </button>
            </div>

            <button type="button" className="btn-secondary min-h-11 w-full" onClick={() => setExpanded(false)}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
