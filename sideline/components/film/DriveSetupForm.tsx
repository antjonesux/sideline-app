"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { useState } from "react";

export type Quarter = "1" | "2" | "3" | "4" | "OT";

export type DriveSetupValues = {
  quarter: Quarter;
  score_mine: number;
  score_opponent: number;
  starting_side: "OWN" | "OPP";
  starting_yard_line: number;
  starting_down: 1 | 2 | 3 | 4;
  starting_distance: number;
};

const QUARTER_PRESETS = ["1", "2", "3", "4", "OT"] as const satisfies readonly Quarter[];

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

      <div>
        <label className="mb-2 block font-mono text-xs font-semibold uppercase tracking-widest text-slate-500">
          Quarter
        </label>
        <div className="flex gap-2">
          {QUARTER_PRESETS.map((q) => {
            const selected = values.quarter === q;
            return (
              <button
                key={q}
                type="button"
                onClick={() => setValues((v) => ({ ...v, quarter: q }))}
              className={`min-h-[44px] flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
                  selected
                    ? "border-transparent bg-emerald-500 text-black"
                    : "border-slate-700 bg-transparent text-slate-300 hover:border-slate-500"
                }`}
              >
                {q}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-2 block font-mono text-xs font-semibold uppercase tracking-widest text-slate-500">Score</label>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <input
              type="number"
              min={0}
              value={values.score_mine}
              onChange={(e) => setValues((v) => ({ ...v, score_mine: Math.max(0, Number(e.target.value) || 0) }))}
              placeholder="0"
              className="min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-center font-mono text-lg font-bold text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
            <span className="mt-1 block text-center font-mono text-xs text-slate-500">MY SCORE</span>
          </div>
          <span className="shrink-0 text-lg font-bold text-slate-500">–</span>
          <div className="flex-1">
            <input
              type="number"
              min={0}
              value={values.score_opponent}
              onChange={(e) => setValues((v) => ({ ...v, score_opponent: Math.max(0, Number(e.target.value) || 0) }))}
              placeholder="0"
              className="min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-center font-mono text-lg font-bold text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
            <span className="mt-1 block text-center font-mono text-xs text-slate-500">OPP SCORE</span>
          </div>
        </div>
      </div>

      <div>
        <label className="mb-2 block font-mono text-xs font-semibold uppercase tracking-widest text-slate-500">
          Starting field
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            className={`min-h-11 flex-1 rounded-lg border px-4 py-2.5 ${values.starting_side === "OWN" ? "border-transparent bg-emerald-600 text-slate-100" : "border-slate-700 text-slate-300"}`}
            onClick={() => setValues((v) => ({ ...v, starting_side: "OWN" }))}
          >
            OWN
          </button>
          <button
            type="button"
            className={`min-h-11 flex-1 rounded-lg border px-4 py-2.5 ${values.starting_side === "OPP" ? "border-transparent bg-emerald-600 text-slate-100" : "border-slate-700 text-slate-300"}`}
            onClick={() => setValues((v) => ({ ...v, starting_side: "OPP" }))}
          >
            OPP
          </button>
          <input
            type="number"
            min={1}
            max={50}
            aria-label="Yard line (1–50)"
            className="min-h-11 min-w-[4.5rem] flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 text-center font-mono tabular-nums text-slate-100 focus:border-emerald-500 focus:outline-none"
            value={values.starting_yard_line}
            onChange={(e) => setValues((v) => ({ ...v, starting_yard_line: Math.max(1, Math.min(50, Number(e.target.value) || 25)) }))}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-slate-400">
          Down
          <input
            type="number"
            min={1}
            max={4}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-slate-100"
            value={values.starting_down}
            onChange={(e) =>
              setValues((v) => ({ ...v, starting_down: Math.max(1, Math.min(4, Number(e.target.value) || 1)) as 1 | 2 | 3 | 4 }))
            }
          />
        </label>
        <label className="text-xs text-slate-400">
          Distance
          <input
            type="number"
            min={1}
            max={99}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-slate-100"
            value={values.starting_distance}
            onChange={(e) => setValues((v) => ({ ...v, starting_distance: Math.max(1, Math.min(99, Number(e.target.value) || 10)) }))}
          />
        </label>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" disabled={busy} className="btn-primary flex-1" onClick={() => void submit()}>
          Start Drive
        </button>
      </div>
    </div>
  );
}
