/** Play list / table: `4-INCHES` vs `4-1` for snap display. */
export function formatPlaySnapDnDist(
  down: number | null | undefined,
  distance: number | null | undefined,
  isInches?: boolean | null,
): string {
  const dOk = down != null && Number.isFinite(down);
  const distOk = distance != null && Number.isFinite(distance);
  if (!dOk || !distOk) return `${dOk ? String(down) : "—"}-${distOk ? String(distance) : "—"}`;
  if (isInches) return `${down}-INCHES`;
  return `${down}-${distance}`;
}

/** Collapsed game-state line: `4TH & INCHES` when inches; otherwise `4TH & {distance}`. */
export function formatDownDistanceLabel(
  down: number,
  distance: number,
  opts: { isGoalToGo: boolean; yardLine: number; isInches?: boolean | null },
): string {
  const d = Math.min(4, Math.max(1, Math.round(down))) as 1 | 2 | 3 | 4;
  const downStr = d === 1 ? "1ST" : d === 2 ? "2ND" : d === 3 ? "3RD" : "4TH";
  if (opts.isInches) return `${downStr} & INCHES`;
  const dist = opts.isGoalToGo ? opts.yardLine : distance;
  return `${downStr} & ${dist}`;
}
