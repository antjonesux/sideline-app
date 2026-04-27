import type { PlaybookEntry } from "@/lib/playbook";
import type { Drive } from "@/lib/types";

/** Aligns with Film game header stats / partial-film warning (excludes ST-only punt / FG rows). */
export function isCoachCallPlay(play: { play_name?: string | null; result_tag?: string | null }): boolean {
  const playName = String(play.play_name ?? "").trim().toLowerCase();
  const resultTag = String(play.result_tag ?? "").trim().toLowerCase();
  if (playName === "punt" || resultTag === "punt") return false;
  if (playName === "field goal" && resultTag === "field_goal") return false;
  return true;
}

/** Game Plan play sheets must not include Film-only special teams picks (by catalog name). */
export function isExcludedFromPlaySheetPlay(play: Pick<PlaybookEntry, "play_name">): boolean {
  const n = String(play.play_name ?? "").trim().toLowerCase();
  return n === "punt" || n === "field goal";
}

export function countPlaysInGame(drives: Drive[]): number {
  return drives.reduce((sum, d) => sum + (d.plays?.length ?? 0), 0);
}

export function countCoachCallsInGame(drives: Drive[]): number {
  return drives.reduce((sum, d) => sum + (d.plays ?? []).filter((p) => isCoachCallPlay(p)).length, 0);
}
