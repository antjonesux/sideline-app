import type { PlaySheetPlay } from "@/lib/playSheetTypes";

/** Lightweight coaching/counter hints when swapping plays (no AI). */
export function suggestCoachingAndCounter(
  defensiveScheme: string,
  playName: string,
  playType: string | null | undefined,
): Pick<PlaySheetPlay, "coaching_note" | "counter_play" | "counter_formation"> {
  const pt = (playType ?? "Pass").toLowerCase();
  const defense = defensiveScheme || "this defense";

  let coaching_note = `${playName} — stress leverage vs ${defense}.`;
  if (pt.includes("rpo")) {
    coaching_note = `RPO conflict vs ${defense} — read the overhang; quick throw if he crashes.`;
  } else if (pt.includes("play action")) {
    coaching_note = `Play action vs ${defense} — sell run, attack the secondary on second reaction.`;
  } else if (pt.includes("run")) {
    coaching_note = `Run fit vs ${defense} — count hats and win at the point of attack.`;
  } else if (pt.includes("screen")) {
    coaching_note = `Screen vs ${defense} — let DL rush upfield, get blockers in space.`;
  }

  const counter_play =
    pt.includes("rpo") || pt.includes("run")
      ? "QUICK SLANTS"
      : pt.includes("screen")
        ? "VERTICALS"
        : "HB DRAW";

  return {
    coaching_note,
    counter_play,
    counter_formation: null,
  };
}
