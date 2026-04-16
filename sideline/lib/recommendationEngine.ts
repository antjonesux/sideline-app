/**
 * Scheme-agnostic scoring helpers for play recommendations.
 * When scheme weights or combo stats produce a base score, apply these adjustments last
 * so motion calls are prioritized across all playbooks (not tied to Power Spread or any single scheme).
 */

/** Score delta for plays whose names start with the motion prefix (CFB26 convention). */
export const MOTION_PREFIX_BOOST = 0.1;

export function playNameHasMotionPrefix(playName: string): boolean {
  return playName.trim().toUpperCase().startsWith("MTN");
}

/** Returns baseScore + {@link MOTION_PREFIX_BOOST} when the play name starts with `MTN`. */
export function applyMotionPrefixBoost(baseScore: number, playName: string): number {
  if (!playNameHasMotionPrefix(playName)) return baseScore;
  return baseScore + MOTION_PREFIX_BOOST;
}
