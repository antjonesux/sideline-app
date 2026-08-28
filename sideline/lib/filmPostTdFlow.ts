/** Post-touchdown XP / 2-point attempt flow helpers for Film Room. */

import { driveSideOfBall } from "@/lib/filmGameDetailHelpers";
import {
  isPostTdFollowUpScenario,
  offensiveScorePoints,
  playScenario,
} from "@/lib/filmConversionResults";
import type { Drive } from "@/lib/types";

export { offensiveScorePoints, playScenario } from "@/lib/filmConversionResults";

function normTag(tag: string): string {
  return tag.trim().toUpperCase().replace(/\s+/g, "_");
}

/**
 * True when the drive's last scoring snap was a TD and the coach still owes an XP or 2PT attempt.
 * Ignores defensive drives at the call site — only offensive TDs trigger this flow.
 */
export function driveNeedsPostTdAttempt(
  plays: Array<{ result_tag: string; scenario?: string | null; situation_override?: string | null }> | undefined | null,
): boolean {
  if (!plays?.length) return false;

  let tdIndex = -1;
  for (let i = plays.length - 1; i >= 0; i--) {
    const sc = playScenario(plays[i]);
    if (isPostTdFollowUpScenario(sc)) return false;
    if (normTag(plays[i].result_tag) === "TOUCHDOWN") {
      tdIndex = i;
      break;
    }
  }
  if (tdIndex < 0) return false;

  for (let j = tdIndex + 1; j < plays.length; j++) {
    const sc = playScenario(plays[j]);
    if (isPostTdFollowUpScenario(sc)) return false;
  }
  return true;
}

/** Cumulative running game score after each drive (computed from logged plays). */
export function computeCumulativeDriveScores(
  drives: Drive[],
): Map<string, { scoreMine: number; scoreOpponent: number }> {
  const chronological = [...drives].sort((a, b) => a.drive_number - b.drive_number);
  let runningMine = 0;
  let runningOpp = 0;
  const result = new Map<string, { scoreMine: number; scoreOpponent: number }>();

  for (const drive of chronological) {
    for (const play of drive.plays ?? []) {
      const scenario = playScenario(play);
      const pts = offensiveScorePoints({ resultTag: play.result_tag, scenario });
      if (pts <= 0) continue;
      if (driveSideOfBall(drive) === "offense") {
        runningMine += pts;
      } else {
        runningOpp += pts;
      }
    }
    result.set(drive.id, { scoreMine: runningMine, scoreOpponent: runningOpp });
  }

  return result;
}
