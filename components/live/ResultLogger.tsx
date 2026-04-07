"use client";

import type { PlaySheetPlay, ResultTag } from "@/lib/liveTypes";
import { useState } from "react";

const TAGS: ResultTag[] = ["FIRST_DOWN", "NO_GAIN", "TOUCHDOWN", "SACK", "INCOMPLETE", "TURNOVER", "GAIN"];

export function ResultLogger({
  play,
  onClose,
  onLog,
}: {
  play: PlaySheetPlay | null;
  onClose: () => void;
  onLog: (resultTag: ResultTag, yards: number, note?: string) => void;
}) {
  const [tag, setTag] = useState<ResultTag | null>(null);
  const [yards, setYards] = useState(0);
  const [note, setNote] = useState("");

  if (!play) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 p-2">
      <div className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4">
        <p className="text-xs text-slate-400">{play.formation}</p>
        <p className="text-lg text-white">{play.playName}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {TAGS.map((t) => (
            <button key={t} className={`rounded-lg border px-2 py-3 text-xs ${tag === t ? "border-amber-400 text-amber-300" : "border-slate-600 text-slate-300"}`} onClick={() => setTag(t)}>
              {t}
            </button>
          ))}
        </div>
        <input className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" type="number" value={yards} onChange={(e) => setYards(Number(e.target.value || 0))} />
        <input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" value={note} placeholder="Note (optional)" onChange={(e) => setNote(e.target.value.slice(0, 60))} />
        <div className="mt-3 flex gap-2">
          <button className="w-full rounded-lg border border-slate-600 py-2" onClick={onClose}>Cancel</button>
          <button className="w-full rounded-lg bg-emerald-700 py-2 disabled:opacity-40" disabled={!tag} onClick={() => tag && onLog(tag, yards, note)}>
            Log Play
          </button>
        </div>
      </div>
    </div>
  );
}
