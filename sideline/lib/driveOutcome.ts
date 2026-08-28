/** Drive ended / still active from the last logged play (offense perspective). */

import { isPostTdFollowUpScenario, playScenario } from "@/lib/filmConversionResults";

export type DrivePossessionOutcome =
  | "TOUCHDOWN"
  | "TURNOVER"
  | "PUNT"
  | "FIELD_GOAL"
  | "TURNOVER_ON_DOWNS"
  | "ACTIVE"
  | "NO_PLAYS";

function normTag(tag: string): string {
  return tag.trim().toUpperCase().replace(/\s+/g, "_");
}

function isTurnoverTag(tag: string): boolean {
  const t = normTag(tag);
  return t === "TURNOVER" || t === "INTERCEPTION" || t === "FUMBLE";
}

/** True when this play ended the offensive possession by failing to convert on 4th down. */
export function isTurnoverOnDownsPlay(p: { down: number | null | undefined; result_tag: string }): boolean {
  if ((p.down ?? 0) !== 4) return false;
  const t = normTag(p.result_tag);
  if (t === "FIRST_DOWN" || t === "TOUCHDOWN") return false;
  if (t === "PUNT" || t === "FIELD_GOAL" || isTurnoverTag(t)) return false;
  return true;
}

export function getDrivePossessionOutcome(
  plays: Array<{ down: number | null | undefined; result_tag: string; scenario?: string | null; situation_override?: string | null }> | undefined | null,
): DrivePossessionOutcome {
  if (!plays || plays.length === 0) return "NO_PLAYS";

  for (let i = plays.length - 1; i >= 0; i--) {
    const play = plays[i];
    const scenario = playScenario(play);
    if (isPostTdFollowUpScenario(scenario)) continue;

    const t = normTag(play.result_tag);
    if (t === "TOUCHDOWN") return "TOUCHDOWN";
    if (isTurnoverTag(t)) return "TURNOVER";
    if (t === "PUNT") return "PUNT";
    if (t === "FIELD_GOAL") return "FIELD_GOAL";
    if (isTurnoverOnDownsPlay(play)) return "TURNOVER_ON_DOWNS";
    return "ACTIVE";
  }

  return "NO_PLAYS";
}

/** Whether the offense should start a new drive (possession ended on this play). */
export function possessionEndedFromSnapAndTag(snapDown: number, storedTag: string): boolean {
  const t = normTag(storedTag);
  if (t === "TOUCHDOWN" || t === "FIELD_GOAL" || t === "PUNT" || isTurnoverTag(t)) return true;
  if (snapDown === 4 && t !== "FIRST_DOWN") return true;
  return false;
}
