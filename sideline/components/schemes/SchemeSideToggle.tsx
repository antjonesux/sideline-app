"use client";

import {
  CATALOG_SIDES_OF_BALL,
  CATALOG_SIDE_OF_BALL_LABELS,
  type CatalogSideOfBall,
} from "@/lib/constants";
import { SCHEME_DETAIL_SIDE_TOGGLE_LABEL } from "@/lib/coachCopy";
import { cn } from "@/lib/utils";

const toggleOn = "border-emerald-500 bg-emerald-500/15 text-emerald-300";
const toggleOff = "border-slate-700 bg-slate-900 text-slate-400";

type Props = {
  value: CatalogSideOfBall;
  onChange: (side: CatalogSideOfBall) => void;
  availableSides: CatalogSideOfBall[];
};

/** Offense/defense toggle for Scheme Detail — only rendered when both sides are attached. */
export function SchemeSideToggle({ value, onChange, availableSides }: Props) {
  if (availableSides.length < 2) return null;

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">
        {SCHEME_DETAIL_SIDE_TOGGLE_LABEL}
      </legend>
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={SCHEME_DETAIL_SIDE_TOGGLE_LABEL}>
        {CATALOG_SIDES_OF_BALL.map((side) => {
          const available = availableSides.includes(side);
          return (
            <button
              key={side}
              type="button"
              role="radio"
              aria-checked={value === side}
              disabled={!available}
              onClick={() => onChange(side)}
              className={cn(
                "min-h-11 rounded-lg border px-4 py-3 font-body text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                value === side ? toggleOn : toggleOff,
              )}
            >
              {CATALOG_SIDE_OF_BALL_LABELS[side]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
