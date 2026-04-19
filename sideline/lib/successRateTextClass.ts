/** Success rate color: 60%+ emerald, 40–59% amber, below 40% red; invalid/missing reads as muted. */
export function successRateTextClass(rate: number): string {
  if (!Number.isFinite(rate)) return "text-slate-500";
  if (rate >= 60) return "text-emerald-400";
  if (rate >= 40) return "text-amber-400";
  return "text-red-400";
}
