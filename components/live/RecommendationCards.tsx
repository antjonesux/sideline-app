"use client";

import type { PlaySheetPlay } from "@/lib/liveTypes";

export function RecommendationCards({
  plays,
  onSelect,
}: {
  plays: PlaySheetPlay[];
  onSelect: (play: PlaySheetPlay) => void;
}) {
  return (
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 py-3">
      {plays.map((p, i) => (
        <div key={p.id} className={`min-w-[260px] snap-start rounded-xl border border-slate-700 bg-slate-800 p-4 ${i === 0 ? "ring-1 ring-emerald-600" : ""}`}>
          <span className={`inline-flex rounded-full px-2 py-1 text-xs ${i === 0 ? "bg-amber-500/20 text-amber-300" : "bg-slate-700 text-slate-300"}`}>#{i + 1} RECOMMENDED</span>
          <p className="mt-3 text-xs text-slate-400">{p.formation}</p>
          <p className="font-display text-2xl text-white">{p.playName}</p>
          <button className="mt-4 w-full rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold hover:bg-emerald-600" onClick={() => onSelect(p)}>
            SELECT THIS PLAY
          </button>
        </div>
      ))}
    </div>
  );
}
