import type { LoggedPlay } from "@/lib/types";
import { isCoachCallPlay } from "@/lib/filmPlayCounting";

export type GuidedPlayTypeBreakdown = { run: number; pass: number; rpo: number; other: number };

export type GuidedOnboardingInsightModel = {
  breakdown: GuidedPlayTypeBreakdown;
  tendencyParagraph: string;
  bestPlay: { formation: string; play_name: string; yards_gained: number } | null;
};

function tendencyFromLastFive(last5: LoggedPlay[]): string {
  let run = 0;
  let pass = 0;
  let rpo = 0;
  let other = 0;
  for (const p of last5) {
    const t = String(p.play_type ?? "").toUpperCase();
    if (t === "RUN") run += 1;
    else if (t === "PASS") pass += 1;
    else if (t === "RPO") rpo += 1;
    else other += 1;
  }

  const dominant =
    run >= pass && run >= rpo && run >= other
      ? "RUN"
      : pass >= run && pass >= rpo && pass >= other
        ? "PASS"
        : rpo >= run && rpo >= pass && rpo >= other
          ? "RPO"
          : "mixed";
  const predictable = last5.length >= 5 && (run === 5 || pass === 5 || rpo === 5);

  if (predictable) {
    return `All five calls typed as ${dominant === "mixed" ? "one family" : dominant}. That is easy to scout — break it up next series with a change-up call.`;
  }

  if (dominant === "PASS" && pass >= 3) {
    return `Heavy pass tilt (${pass} pass, ${run} run, ${rpo} RPO). Fine on long down — just know you are living in space throws when you need a clock kill.`;
  }
  if (dominant === "RUN" && run >= 3) {
    return `Run-forward start (${run} run, ${pass} pass, ${rpo} RPO). Use the pass tree when the box loads — tendencies will show where you went next.`;
  }
  return `Mix on the board: ${run} run, ${pass} pass, ${rpo} RPO${other ? `, ${other} other` : ""}. Keep logging so Film Room can surface what worked by situation.`;
}

/** Last five coach calls on the drive (non-punt), aligned with guided logger target. */
export function buildGuidedOnboardingInsight(plays: LoggedPlay[]): GuidedOnboardingInsightModel | null {
  const rows = plays.filter(isCoachCallPlay);
  const last5 = rows.slice(-5);
  if (last5.length < 5) return null;

  const breakdown: GuidedPlayTypeBreakdown = { run: 0, pass: 0, rpo: 0, other: 0 };
  for (const p of last5) {
    const t = String(p.play_type ?? "").toUpperCase();
    if (t === "RUN") breakdown.run += 1;
    else if (t === "PASS") breakdown.pass += 1;
    else if (t === "RPO") breakdown.rpo += 1;
    else breakdown.other += 1;
  }

  let best: LoggedPlay | null = null;
  for (const p of last5) {
    if (!best) {
      best = p;
      continue;
    }
    const y = p.yards_gained ?? 0;
    const by = best.yards_gained ?? 0;
    if (y > by) best = p;
  }

  const bestPlay = best
    ? {
        formation: String(best.formation ?? "").trim(),
        play_name: String(best.play_name ?? "").trim(),
        yards_gained: Number(best.yards_gained ?? 0),
      }
    : null;

  return {
    breakdown,
    tendencyParagraph: tendencyFromLastFive(last5),
    bestPlay,
  };
}
