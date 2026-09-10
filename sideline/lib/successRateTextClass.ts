export type SuccessRateSide = "offense" | "defense";

/**
 * Success rate color calibrated to ~40% college average.
 * Offense: higher is better. Defense (opponent success allowed): lower is better.
 */
export function successRateTextClass(rate: number, side: SuccessRateSide = "offense"): string {
  if (!Number.isFinite(rate)) return "text-slate-500";

  if (side === "defense") {
    if (rate <= 35) return "text-emerald-400";
    if (rate <= 44) return "text-amber-400";
    return "text-red-400";
  }

  if (rate >= 45) return "text-emerald-400";
  if (rate >= 35) return "text-amber-400";
  return "text-red-400";
}
