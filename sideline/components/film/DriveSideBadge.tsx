import { cn } from "@/lib/utils";
import type { DriveSideOfBall } from "@/lib/types";
import { driveSideBadgeLabel } from "@/lib/filmGameDetailHelpers";

/** Subtle side-of-ball tag on film drive cards (OFF / DEF). */
export function DriveSideBadge({ side }: { side: DriveSideOfBall }) {
  const label = driveSideBadgeLabel(side);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase leading-none tracking-[0.2px]",
        side === "defense"
          ? "border-sky-800/70 bg-sky-950/50 text-sky-300/90"
          : "border-slate-700/80 bg-slate-900/60 text-slate-400",
      )}
      aria-label={side === "defense" ? "Defensive drive" : "Offensive drive"}
    >
      {label}
    </span>
  );
}
