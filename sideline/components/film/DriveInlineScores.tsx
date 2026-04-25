"use client";

import { useEffect, useRef, useState } from "react";

type DriveInlineScoresProps = {
  driveId: string;
  scoreMine: number | null;
  scoreOpponent: number | null;
  /** Debounced save of both scores together (parent handles API + errors). */
  onSaveBoth: (mine: number, theirs: number) => void;
  debounceMs?: number;
};

export function DriveInlineScores({
  driveId,
  scoreMine,
  scoreOpponent,
  onSaveBoth,
  debounceMs = 500,
}: DriveInlineScoresProps) {
  const [mineStr, setMineStr] = useState(String(scoreMine ?? 0));
  const [theirsStr, setTheirsStr] = useState(String(scoreOpponent ?? 0));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mineStrRef = useRef(mineStr);
  const theirsStrRef = useRef(theirsStr);
  const onSaveBothRef = useRef(onSaveBoth);
  const userEditedRef = useRef(false);
  mineStrRef.current = mineStr;
  theirsStrRef.current = theirsStr;
  onSaveBothRef.current = onSaveBoth;

  useEffect(() => {
    userEditedRef.current = false;
    setMineStr(String(scoreMine ?? 0));
    setTheirsStr(String(scoreOpponent ?? 0));
  }, [driveId, scoreMine, scoreOpponent]);

  useEffect(() => {
    if (!userEditedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const my = Math.max(0, Math.min(999, parseInt(mineStr.replace(/\D/g, ""), 10) || 0));
      const their = Math.max(0, Math.min(999, parseInt(theirsStr.replace(/\D/g, ""), 10) || 0));
      onSaveBothRef.current(my, their);
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [mineStr, theirsStr, debounceMs]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (!userEditedRef.current) return;
      const my = Math.max(0, Math.min(999, parseInt(mineStrRef.current.replace(/\D/g, ""), 10) || 0));
      const their = Math.max(0, Math.min(999, parseInt(theirsStrRef.current.replace(/\D/g, ""), 10) || 0));
      onSaveBothRef.current(my, their);
    };
  }, [driveId]);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="min-w-0 flex-1">
        <span className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500 dark:text-slate-500">My score</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-center font-mono text-sm text-slate-100 focus:border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          value={mineStr}
          onChange={(e) => {
            userEditedRef.current = true;
            setMineStr(e.target.value.replace(/\D/g, ""));
          }}
        />
      </label>
      <span className="pb-2 font-mono text-slate-500 dark:text-slate-500" aria-hidden>
        -
      </span>
      <label className="min-w-0 flex-1">
        <span className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500 dark:text-slate-500">Their score</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-center font-mono text-sm text-slate-100 focus:border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          value={theirsStr}
          onChange={(e) => {
            userEditedRef.current = true;
            setTheirsStr(e.target.value.replace(/\D/g, ""));
          }}
        />
      </label>
    </div>
  );
}
