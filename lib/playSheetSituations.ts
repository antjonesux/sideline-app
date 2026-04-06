/** Canonical order for play sheet UI (matches quick-nav situation strings). */
export const PLAY_SHEET_SITUATIONS = [
  "1st & 10",
  "2nd & Medium",
  "2nd & Long",
  "3rd & Short",
  "3rd & Medium",
  "3rd & Long",
  "Red Zone",
  "Goal Line",
  "2-Minute Drill",
  "Backed Up",
] as const;

export type PlaySheetSituation = (typeof PLAY_SHEET_SITUATIONS)[number];

export function situationOrderIndex(situation: string): number {
  const i = PLAY_SHEET_SITUATIONS.indexOf(situation as PlaySheetSituation);
  return i === -1 ? 99 : i;
}
