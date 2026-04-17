"use client";

import { useEffect, useId, useState } from "react";
import type { GameState } from "@/lib/gameStateEngine";
import { formatFieldPosition, fromAbsoluteYard, parseFieldPosition } from "@/lib/fieldPosition";
import type { Side } from "@/lib/derivePlayContext";

type CompactGameStateBarProps = {
  gameState: GameState;
  onChange: (next: GameState) => void;
  onStartNewDrive: () => void;
  onEditToggle: () => void;
};

const motionPanel =
  "motion-safe:transition-[max-height,opacity] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none";

export function CompactGameStateBar({ gameState, onChange, onStartNewDrive, onEditToggle }: CompactGameStateBarProps) {
  const [expanded, setExpanded] = useState(false);
  const distId = useId();
  const yardNumId = useId();

  const { side, yard_line } = fromAbsoluteYard(gameState.absoluteYard);

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

  function patch(partial: Partial<GameState>) {
    onChange({ ...gameState, ...partial });
  }

  function setFieldSide(nextSide: Side) {
    const y = yard_line;
    const abs = parseFieldPosition(nextSide, y);
    const pos = fromAbsoluteYard(abs);
    const goal = pos.side === "OPP" && pos.yard_line <= 10 && pos.yard_line >= 1;
    patch({
      absoluteYard: abs,
      distance: goal ? pos.yard_line : gameState.distance,
    });
  }

  function setYardNumber(n: number) {
    if (Number.isNaN(n) || n < 1 || n > 50) return;
    const abs = parseFieldPosition(side, n);
    const pos = fromAbsoluteYard(abs);
    const goal = pos.side === "OPP" && pos.yard_line <= 10 && pos.yard_line >= 1;
    patch({
      absoluteYard: abs,
      distance: goal ? pos.yard_line : gameState.distance,
    });
  }

  function applyManualNewDrive() {
    onStartNewDrive();
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900">
      <div className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 border-b border-slate-700/80 px-3 py-2">
        <span className="font-mono text-xs font-medium uppercase tracking-wide text-white">
          {gameState.down === 1 ? "1ST" : gameState.down === 2 ? "2ND" : gameState.down === 3 ? "3RD" : "4TH"} & {displayDistance}
        </span>
        <span className="font-mono text-xs text-slate-500" aria-hidden>
          ·
        </span>
        <span className="font-mono text-xs font-normal text-slate-400">{formatFieldPosition(gameState.absoluteYard)}</span>
        <span className="font-mono text-xs text-slate-500" aria-hidden>
          ·
        </span>
        <span className="font-mono text-xs font-medium text-amber-400">Drive {gameState.driveNumber}</span>
        <div className="ml-auto relative">
          <button
            type="button"
            className="app-no-press-scale inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
            aria-expanded={expanded}
            aria-haspopup="menu"
            onClick={() => setExpanded((s) => !s)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="12" cy="5" r="1.75" />
              <circle cx="12" cy="12" r="1.75" />
              <circle cx="12" cy="19" r="1.75" />
            </svg>
          </button>
        </div>
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
                  className="mt-1.5 flex min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-center font-mono text-lg text-white"
                  value={String(gameState.distance)}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    if (v === "") return;
                    const n = parseInt(v, 10);
                    if (!Number.isNaN(n) && n >= 1) patch({ distance: Math.min(99, n) });
                  }}
                />
              </label>
            )}

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
                    className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-2 text-center font-mono text-lg text-white"
                    value={String(yard_line)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      if (raw === "") return;
                      const n = parseInt(raw, 10);
                      setYardNumber(n);
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
              <span className="font-sans text-xs text-slate-500">Drive</span>
              <span className="font-mono text-sm text-amber-400">{gameState.driveNumber}</span>
              <button type="button" className="app-no-press-scale min-h-11 px-2 font-sans text-sm font-medium text-amber-400" onClick={applyManualNewDrive}>
                + Drive
              </button>
              <button type="button" className="app-no-press-scale min-h-11 px-2 font-sans text-sm text-slate-400 hover:text-slate-200" onClick={onEditToggle}>
                Edit Play
              </button>
            </div>

            <button
              type="button"
              className="btn-secondary min-h-11 w-full"
              onClick={() => setExpanded(false)}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
