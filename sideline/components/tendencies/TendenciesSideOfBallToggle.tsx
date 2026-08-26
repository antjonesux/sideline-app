"use client";

import { CATALOG_SIDE_OF_BALL_LABELS, type CatalogSideOfBall } from "@/lib/constants";

type Props = {
  value: CatalogSideOfBall;
  onChange: (next: CatalogSideOfBall) => void;
};

export function TendenciesSideOfBallToggle({ value, onChange }: Props) {
  return (
    <div
      className="inline-flex rounded-full border border-slate-700 bg-slate-900 p-1"
      role="radiogroup"
      aria-label="Side of ball"
    >
      {(["offense", "defense"] as const).map((side) => {
        const active = value === side;
        return (
          <button
            key={side}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(side)}
            className={`min-h-9 rounded-full px-4 text-sm font-body font-medium transition-colors ${
              active ? "bg-emerald-500 text-white" : "bg-slate-900 text-slate-400"
            }`}
          >
            {CATALOG_SIDE_OF_BALL_LABELS[side]}
          </button>
        );
      })}
    </div>
  );
}
