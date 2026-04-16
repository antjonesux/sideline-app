/**
 * Standard football analytics success for a logged play (matches down-aware CASE logic).
 *
 * - Any down: TOUCHDOWN → success; TURNOVER / INTERCEPTION / FUMBLE → failure
 * - FIRST_DOWN result → success
 * - 1st down: yards_gained >= 50% of distance
 * - 2nd down: yards_gained >= 70% of distance
 * - 3rd & 4th: only FIRST_DOWN / TOUCHDOWN (handled above); other tags → not success by yardage
 * - Null/invalid down or distance: fallback to FIRST_DOWN or TOUCHDOWN only
 */

export type StandardSuccessPlayInput = {
  result_tag?: string | null;
  down?: number | null;
  distance?: number | null;
  yards_gained?: number | null;
};

export function normalizeLoggedResultTag(result_tag: string | null | undefined): string {
  return (result_tag ?? "").toUpperCase().replace(/\s+/g, "_");
}

function isTurnoverTag(tag: string): boolean {
  return tag === "TURNOVER" || tag === "INTERCEPTION" || tag === "FUMBLE";
}

export function isStandardSuccessfulPlay(p: StandardSuccessPlayInput): boolean {
  const tag = normalizeLoggedResultTag(p.result_tag);
  if (tag === "TOUCHDOWN") return true;
  if (isTurnoverTag(tag)) return false;
  if (tag === "FIRST_DOWN") return true;

  const yards = p.yards_gained ?? 0;
  const downN = p.down == null ? NaN : Number(p.down);
  const distN = p.distance == null ? NaN : Number(p.distance);

  if (!Number.isFinite(downN) || !Number.isFinite(distN) || distN <= 0) {
    return false;
  }

  if (downN === 1) return yards >= distN * 0.5;
  if (downN === 2) return yards >= distN * 0.7;
  if (downN === 3 || downN === 4) return false;
  return false;
}
