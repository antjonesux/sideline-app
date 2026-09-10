/**
 * Standard college football success (FO / SP+ 50/70/100) for a logged play.
 *
 * - Any down: TOUCHDOWN → success; TURNOVER / INTERCEPTION / FUMBLE → failure; SACK → failure
 * - FIRST_DOWN result → success (counts once even if yardage also meets the threshold)
 * - 1st: yards_gained >= floor(distance / 2)
 * - 2nd: yards_gained >= floor((distance * 7) / 10)
 * - 3rd & 4th: yards_gained >= distance
 * - Null/invalid down or distance: fallback to FIRST_DOWN or TOUCHDOWN only
 *
 * Examples: 2nd & 6 → need 4 yards; 1st & Goal from 5 → need 2 yards.
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
  if (tag === "SACK") return false;
  if (tag === "FIRST_DOWN") return true;

  const yards = p.yards_gained ?? 0;
  const downN = p.down == null ? NaN : Number(p.down);
  const distN = p.distance == null ? NaN : Number(p.distance);

  if (!Number.isFinite(downN) || !Number.isFinite(distN) || distN <= 0) {
    return false;
  }

  if (downN === 1) return yards >= Math.floor(distN / 2);
  if (downN === 2) return yards >= Math.floor((distN * 7) / 10);
  if (downN === 3 || downN === 4) return yards >= distN;
  return false;
}
