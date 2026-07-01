"use client";

import {
  CATALOG_SIDES_OF_BALL,
  CATALOG_SIDE_OF_BALL_LABELS,
  type CatalogSideOfBall,
} from "@/lib/constants";

const toggleOn = "border-emerald-500 bg-emerald-500/15 text-emerald-300";
const toggleOff = "border-slate-700 bg-slate-900 text-slate-400";

type Props = {
  value: CatalogSideOfBall | null;
  onChange: (side: CatalogSideOfBall) => void;
  disabled?: boolean;
};

export function CatalogSideOfBallField({ value, onChange, disabled = false }: Props) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">
        Side of Ball
      </legend>
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Side of Ball">
        {CATALOG_SIDES_OF_BALL.map((side) => (
          <button
            key={side}
            type="button"
            role="radio"
            aria-checked={value === side}
            disabled={disabled}
            onClick={() => onChange(side)}
            className={`min-h-11 rounded-lg border px-4 py-3 font-body text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              value === side ? toggleOn : toggleOff
            }`}
          >
            {CATALOG_SIDE_OF_BALL_LABELS[side]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
