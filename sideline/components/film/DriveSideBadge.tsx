import { ResultBadge } from "@/components/import/ResultBadge";
import { driveSideBadgeLabel } from "@/lib/filmGameDetailHelpers";
import type { DriveSideOfBall } from "@/lib/types";

const sideToneClass: Record<DriveSideOfBall, string> = {
  defense: "border-sky-600/80 bg-sky-900/40 text-sky-200",
  offense: "border-slate-700 bg-slate-900 text-slate-400",
};

/** Subtle side-of-ball tag on film drive cards (OFF / DEF). */
export function DriveSideBadge({ side }: { side: DriveSideOfBall }) {
  const label = driveSideBadgeLabel(side);
  return (
    <span aria-label={side === "defense" ? "Defensive drive" : "Offensive drive"}>
      <ResultBadge label={label} className={sideToneClass[side]} />
    </span>
  );
}
