"use client";

import { useState } from "react";

type DriveSetupValues = {
  quarter: number;
  score_mine: number;
  score_opponent: number;
  starting_side: "OWN" | "OPP";
  starting_yard_line: number;
  starting_down: 1 | 2 | 3 | 4;
  starting_distance: number;
};

export function DriveSetupForm({
  defaultValues,
  onCancel,
  onSubmit,
}: {
  defaultValues: DriveSetupValues;
  onCancel: () => void;
  onSubmit: (values: DriveSetupValues) => Promise<void>;
}) {
  const [values, setValues] = useState<DriveSetupValues>(defaultValues);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await onSubmit(values);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 p-3">
      <p className="font-sans text-sm text-slate-300">Set the drive start situation.</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-slate-400">
          Quarter
          <input type="number" min={1} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-white" value={values.quarter} onChange={(e) => setValues((v) => ({ ...v, quarter: Math.max(1, Number(e.target.value) || 1) }))} />
        </label>
        <label className="text-xs text-slate-400">
          Own score
          <input type="number" min={0} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-white" value={values.score_mine} onChange={(e) => setValues((v) => ({ ...v, score_mine: Math.max(0, Number(e.target.value) || 0) }))} />
        </label>
        <label className="text-xs text-slate-400">
          Opp score
          <input type="number" min={0} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-white" value={values.score_opponent} onChange={(e) => setValues((v) => ({ ...v, score_opponent: Math.max(0, Number(e.target.value) || 0) }))} />
        </label>
        <label className="text-xs text-slate-400">
          Yard line
          <input type="number" min={1} max={50} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-white" value={values.starting_yard_line} onChange={(e) => setValues((v) => ({ ...v, starting_yard_line: Math.max(1, Math.min(50, Number(e.target.value) || 25)) }))} />
        </label>
      </div>
      <div className="flex gap-2">
        <button type="button" className={`min-h-11 flex-1 rounded-lg border ${values.starting_side === "OWN" ? "border-transparent bg-emerald-600 text-white" : "border-slate-700 text-slate-300"}`} onClick={() => setValues((v) => ({ ...v, starting_side: "OWN" }))}>OWN</button>
        <button type="button" className={`min-h-11 flex-1 rounded-lg border ${values.starting_side === "OPP" ? "border-transparent bg-emerald-600 text-white" : "border-slate-700 text-slate-300"}`} onClick={() => setValues((v) => ({ ...v, starting_side: "OPP" }))}>OPP</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-slate-400">
          Down
          <input type="number" min={1} max={4} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-white" value={values.starting_down} onChange={(e) => setValues((v) => ({ ...v, starting_down: Math.max(1, Math.min(4, Number(e.target.value) || 1)) as 1 | 2 | 3 | 4 }))} />
        </label>
        <label className="text-xs text-slate-400">
          Distance
          <input type="number" min={1} max={99} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-white" value={values.starting_distance} onChange={(e) => setValues((v) => ({ ...v, starting_distance: Math.max(1, Math.min(99, Number(e.target.value) || 10)) }))} />
        </label>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="button" className="min-h-11 flex-1 rounded-lg border border-slate-700 text-slate-300" onClick={onCancel}>Cancel</button>
        <button type="button" disabled={busy} className="min-h-11 flex-1 rounded-lg bg-emerald-600 text-white" onClick={() => void submit()}>Start Drive</button>
      </div>
    </div>
  );
}
