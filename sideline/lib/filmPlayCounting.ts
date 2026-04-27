import type { Drive } from "@/lib/types";

/** Aligns with Film game header stats / partial-film warning (excludes punt rows). */
export function isCoachCallPlay(play: { play_name?: string | null; result_tag?: string | null }): boolean {
  const playName = String(play.play_name ?? "").trim().toLowerCase();
  const resultTag = String(play.result_tag ?? "").trim().toLowerCase();
  return playName !== "punt" && resultTag !== "punt";
}

export function countPlaysInGame(drives: Drive[]): number {
  return drives.reduce((sum, d) => sum + (d.plays?.length ?? 0), 0);
}

export function countCoachCallsInGame(drives: Drive[]): number {
  return drives.reduce((sum, d) => sum + (d.plays ?? []).filter((p) => isCoachCallPlay(p)).length, 0);
}
