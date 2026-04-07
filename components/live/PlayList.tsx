"use client";

import type { PlaySheetPlay } from "@/lib/liveTypes";

export function PlayList({
  plays,
  usedIds,
  onCall,
}: {
  plays: PlaySheetPlay[];
  usedIds: string[];
  onCall: (play: PlaySheetPlay) => void;
}) {
  return (
    <div className="px-3 py-3">
      {plays.map((p) => {
        const used = usedIds.includes(p.id);
        return (
          <div key={p.id} className={`mb-2 flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-3 ${used ? "opacity-40" : ""}`}>
            <div>
              <p className="text-xs text-slate-400">{p.formation}</p>
              <p className="text-base font-semibold text-white">{p.playName}</p>
            </div>
            <button className="rounded-md bg-emerald-700 px-3 py-1 text-sm hover:bg-emerald-600" onClick={() => onCall(p)}>
              Call
            </button>
          </div>
        );
      })}
    </div>
  );
}
