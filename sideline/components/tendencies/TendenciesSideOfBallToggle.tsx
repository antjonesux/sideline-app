"use client";

import { CATALOG_SIDE_OF_BALL_LABELS, type CatalogSideOfBall } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Props = {
  value: CatalogSideOfBall;
  onChange: (next: CatalogSideOfBall) => void;
  className?: string;
};

export function TendenciesSideOfBallToggle({ value, onChange, className }: Props) {
  return (
    <div
      className={cn(
        "flex w-full rounded-full border border-slate-700 bg-slate-900 p-1 md:inline-flex md:w-auto",
        className,
      )}
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
            className={`min-h-9 flex-1 rounded-full px-4 text-sm font-body font-medium transition-colors md:flex-none ${
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
