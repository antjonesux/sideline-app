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
  const [startingYardStr, setStartingYardStr] = useState(() => String(defaultValues.starting_yard_line));
  const [scoreMineStr, setScoreMineStr] = useState(() => String(defaultValues.score_mine));
  const [scoreOppStr, setScoreOppStr] = useState(() => String(defaultValues.score_opponent));
  const [downStr, setDownStr] = useState(() => String(defaultValues.starting_down));
  const [distanceStr, setDistanceStr] = useState(() => String(defaultValues.starting_distance));
  const [busy, setBusy] = useState(false);

  const parsedStartingYard = Number.parseInt(startingYardStr.trim(), 10);
  const startingYardValid =
    !Number.isNaN(parsedStartingYard) && parsedStartingYard >= 1 && parsedStartingYard <= 50;

  async function submit() {
    if (!startingYardValid) return;
    setBusy(true);
    try {
      const scoreMine = Math.max(0, Number.parseInt(scoreMineStr.replace(/\D/g, ""), 10) || 0);
      const scoreOpp = Math.max(0, Number.parseInt(scoreOppStr.replace(/\D/g, ""), 10) || 0);
      const down = Math.max(1, Math.min(4, Number.parseInt(downStr.replace(/\D/g, ""), 10) || 1)) as 1 | 2 | 3 | 4;
      const distance = Math.max(1, Math.min(99, Number.parseInt(distanceStr.replace(/\D/g, ""), 10) || 10));
      await onSubmit({
        ...values,
        starting_yard_line: parsedStartingYard,
        score_mine: scoreMine,
        score_opponent: scoreOpp,
        starting_down: down,
        starting_distance: distance,
      });
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
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={scoreMineStr}
              onChange={(e) => setScoreMineStr(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
              className="min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-center font-mono text-lg font-bold text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
            <span className="mt-1 block text-center font-mono text-xs text-slate-500">MY SCORE</span>
          </div>
          <span className="shrink-0 text-lg font-bold text-slate-500">–</span>
          <div className="flex-1">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={scoreOppStr}
              onChange={(e) => setScoreOppStr(e.target.value.replace(/\D/g, ""))}
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
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label="Yard line (1–50)"
            placeholder="1–50"
            className={`min-h-11 min-w-[4.5rem] flex-1 rounded-lg border bg-slate-800 px-3 text-center font-mono tabular-nums text-slate-100 focus:outline-none ${
              startingYardStr.trim() !== "" && !startingYardValid
                ? "border-amber-600/80 focus:border-amber-500"
                : "border-slate-700 focus:border-emerald-500"
            }`}
            value={startingYardStr}
            onChange={(e) => setStartingYardStr(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-slate-400">
          Down
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-slate-100"
            value={downStr}
            onChange={(e) => setDownStr(e.target.value.replace(/\D/g, ""))}
          />
        </label>
        <label className="text-xs text-slate-400">
          Distance
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-slate-100"
            value={distanceStr}
            onChange={(e) => setDistanceStr(e.target.value.replace(/\D/g, ""))}
          />
        </label>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" disabled={!startingYardValid || busy} className="btn-primary flex-1" onClick={() => void submit()}>
          Start Drive
        </button>
      </div>
    </div>
  );
}
