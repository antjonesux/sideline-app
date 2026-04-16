"use client";

import type { GameSession } from "@/lib/types";

type Props = {
  games: GameSession[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function GameSelector({ games, selectedId, onSelect }: Props) {
  if (games.length === 0) return null;
  return (
    <div className="app-horizontal-scroll-strip -mx-1 flex gap-2 pb-1">
      {games.map((g) => {
        const active = g.id === selectedId;
        const w = g.result === "W";
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => onSelect(g.id)}
            className={`shrink-0 rounded-lg border px-3 py-2 text-left transition-colors ${
              active ? "border-emerald-500/70 bg-emerald-500/10" : "border-slate-700 bg-slate-900 hover:border-slate-600"
            }`}
          >
            <p className="font-body max-w-[200px] truncate text-sm font-medium text-slate-100">vs {g.opponent_team}</p>
            <p className="font-body mt-0.5 text-[10px] uppercase tracking-wide text-slate-500">{g.game_date}</p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`font-mono rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                  w ? "bg-emerald-900/50 text-emerald-200" : g.result === "L" ? "bg-red-900/40 text-red-200" : "bg-slate-800 text-slate-400"
                }`}
              >
                {g.result ?? "—"}
              </span>
              <span className="font-mono text-[11px] tabular-nums text-slate-400">
                {g.my_score ?? "—"}–{g.opponent_score ?? "—"}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
