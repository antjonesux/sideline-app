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

type ResultGridProps = {
  value: UiResultTag | null;
  onChange: (tag: UiResultTag) => void;
};

export function ResultGrid({ value, onChange }: ResultGridProps) {
  return (
    <div>
      <p className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">Result</p>
      <div className="grid grid-cols-2 gap-2">
        {ROWS.map(([tag, label]) => {
          const active = value === tag;
          return (
            <button
              key={tag}
              type="button"
              className={`rounded-lg border px-3 py-2 font-mono text-xs font-medium uppercase tracking-wide transition-colors ${
                active ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-700 bg-transparent text-slate-300"
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
