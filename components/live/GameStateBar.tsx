"use client";

import type { GameState } from "@/lib/liveTypes";

interface Props {
  gameState: GameState;
  onPatch: (patch: Partial<GameState>) => void;
}

const ZONES: GameState["fieldZone"][] = ["BACKED_UP", "OWN_TERR", "MIDFIELD", "SCORING", "RED_ZONE", "GOAL_LINE"];
const SCORES: GameState["scoreContext"][] = ["TIED", "UP_1_6", "UP_7_PLUS", "DOWN_1_6", "DOWN_7_PLUS"];

export function GameStateBar({ gameState, onPatch }: Props) {
  return (
    <div className="sticky top-0 z-30 border-b border-slate-700 bg-slate-950/95 px-3 py-2 backdrop-blur">
      <div className="flex gap-2 overflow-x-auto">
        <select className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs" value={gameState.fieldZone} onChange={(e) => onPatch({ fieldZone: e.target.value as GameState["fieldZone"] })}>
          {ZONES.map((z) => <option key={z}>{z}</option>)}
        </select>
        <button className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs" onClick={() => onPatch({ down: ((gameState.down % 4) + 1) as 1 | 2 | 3 | 4 })}>
          {gameState.down}ST
        </button>
        <input className="w-16 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs" type="number" min={1} value={gameState.distance} onChange={(e) => onPatch({ distance: Number(e.target.value || 1) })} />
        <select className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs" value={gameState.scoreContext} onChange={(e) => onPatch({ scoreContext: e.target.value as GameState["scoreContext"] })}>
          {SCORES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs" onClick={() => onPatch({ quarter: gameState.quarter === "OT" ? 1 : ((gameState.quarter as number) + 1 > 4 ? "OT" : ((gameState.quarter as number) + 1) as 1 | 2 | 3 | 4) })}>
          {gameState.quarter}
        </button>
        <input className="w-20 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs" value={gameState.defensiveScheme} onChange={(e) => onPatch({ defensiveScheme: e.target.value })} />
      </div>
    </div>
  );
}
