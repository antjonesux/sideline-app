"use client";

import type { GameMode } from "@/store/gameStore";

export function GamePlanModeToggle({
  mode,
  onChange,
}: {
  mode: GameMode;
  onChange: (m: GameMode) => void;
}) {
  return (
    <div
      className="inline-flex rounded border border-white/15 bg-black/40 p-0.5 font-mono text-xs"
      role="group"
      aria-label="Game plan mode"
    >
      <button
        type="button"
        onClick={() => onChange("pregame")}
        className={`rounded px-3 py-2 uppercase tracking-wider transition ${
          mode === "pregame"
            ? "bg-[var(--accent)] text-[var(--chalk)]"
            : "text-[var(--chalk-muted)] hover:text-[var(--chalk-soft)]"
        }`}
      >
        Pre-Game
      </button>
      <button
        type="button"
        onClick={() => onChange("ingame")}
        className={`rounded px-3 py-2 uppercase tracking-wider transition ${
          mode === "ingame"
            ? "bg-[var(--amber)] text-black"
            : "text-[var(--chalk-muted)] hover:text-[var(--chalk-soft)]"
        }`}
      >
        In-Game
      </button>
    </div>
  );
}
