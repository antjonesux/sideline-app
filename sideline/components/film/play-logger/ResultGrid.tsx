"use client";

import type { UiResultTag } from "@/lib/gameStateEngine";

const ROWS: [UiResultTag, string][] = [
  ["NO_GAIN", "No Gain"],
  ["GAIN", "Gain"],
  ["LOSS", "Loss"],
  ["TOUCHDOWN", "Touchdown"],
  ["INCOMPLETE", "Incomplete"],
  ["TURNOVER", "Turnover"],
  ["PUNT", "Punt"],
  ["FIELD_GOAL", "Field Goal"],
];

const activeClasses: Record<UiResultTag, string> = {
  NO_GAIN: "border-slate-500 bg-slate-600 text-slate-100",
  GAIN: "border-blue-700 bg-blue-900/50 text-blue-300",
  LOSS: "border-red-700 bg-red-900/50 text-red-300",
  TOUCHDOWN: "border-emerald-700 bg-emerald-900/50 text-emerald-300",
  INCOMPLETE: "border-slate-500 bg-slate-600 text-slate-100",
  TURNOVER: "border-red-700 bg-red-900/50 text-red-300",
  PUNT: "border-amber-700 bg-amber-900/50 text-amber-300",
  FIELD_GOAL: "border-emerald-700 bg-emerald-900/50 text-emerald-300",
};

type ResultGridProps = {
  value: UiResultTag | null;
  onChange: (tag: UiResultTag) => void;
};

export function ResultGrid({ value, onChange }: ResultGridProps) {
  return (
    <div>
      <p className="app-field-label text-slate-500">Result</p>
      <div className="mt-1.5 grid grid-cols-2 gap-2">
        {ROWS.map(([tag, label]) => {
          const active = value === tag;
          return (
            <button
              key={tag}
              type="button"
              className={`min-h-11 rounded-lg border px-2 py-2 font-display text-sm font-semibold uppercase tracking-wide transition-colors ${
                active ? activeClasses[tag] : "border-slate-700 bg-slate-800 text-slate-300"
              }`}
              onClick={() => onChange(tag)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
