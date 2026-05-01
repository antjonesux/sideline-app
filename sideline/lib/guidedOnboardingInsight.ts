import type { LoggedPlay } from "@/lib/types";
import { isCoachCallPlay } from "@/lib/filmPlayCounting";
import {
  GUIDED_FIRST_DRIVE_HEADLINE_BALANCED,
  GUIDED_FIRST_DRIVE_HEADLINE_BEST,
  GUIDED_FIRST_DRIVE_HEADLINE_TENDENCY,
  GUIDED_FIRST_DRIVE_NUDGE_BALANCED,
  GUIDED_FIRST_DRIVE_NUDGE_BEST_PLAY,
  GUIDED_FIRST_DRIVE_NUDGE_PASS_TILT,
  GUIDED_FIRST_DRIVE_NUDGE_RPO_TILT,
  GUIDED_FIRST_DRIVE_NUDGE_RUN_TILT,
  GUIDED_FIRST_DRIVE_PRIMARY_BALANCED,
  guidedFirstDrivePrimaryBest,
  guidedFirstDrivePrimaryTendency,
} from "@/lib/guidedFirstDriveCopy";
import { normalizePlayName } from "@/lib/utils";

export type GuidedPlayTypeBreakdown = { run: number; pass: number; rpo: number; other: number };

export type GuidedOnboardingInsightModel = {
  breakdown: GuidedPlayTypeBreakdown;
  tendencyParagraph: string;
  bestPlay: { formation: string; play_name: string; yards_gained: number } | null;
};

/** Minimum coach calls on the active drive before the first-drive insight appears. */
export const GUIDED_ONBOARDING_MIN_COACH_CALLS = 5;

export type FirstDriveSupportingStat = {
  label: string;
  value: string;
  /** 0–1 for optional horizontal bar */
  barFraction?: number;
};

export type FirstDriveCoachingReadout = {
  headline: string;
  primaryInsight: string;
  supportingStats: FirstDriveSupportingStat[];
  coachingNudge: string;
  /** Run / Pass / RPO mix for `PlayTypeDistribution` (same shape as tendencies API rows). */
  playTypeDistribution: { name: string; pct: number; count: number }[];
};

type Canon = "RUN" | "PASS" | "RPO" | "OTHER";

function coachPlayDisplayName(rawName: string): string {
  const upper = normalizePlayName(rawName);
  return upper
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

function countBreakdown(rows: LoggedPlay[]): GuidedPlayTypeBreakdown {
  const breakdown: GuidedPlayTypeBreakdown = { run: 0, pass: 0, rpo: 0, other: 0 };
  for (const p of rows) {
    const t = String(p.play_type ?? "").toUpperCase();
    if (t === "RUN") breakdown.run += 1;
    else if (t === "PASS") breakdown.pass += 1;
    else if (t === "RPO") breakdown.rpo += 1;
    else breakdown.other += 1;
  }
  return breakdown;
}

function dominantCanonType(counts: GuidedPlayTypeBreakdown): { type: Canon; count: number } {
  const entries: [Canon, number][] = [
    ["RUN", counts.run],
    ["PASS", counts.pass],
    ["RPO", counts.rpo],
    ["OTHER", counts.other],
  ];
  let best: Canon = "RUN";
  let bestN = counts.run;
  for (const [k, v] of entries) {
    if (v > bestN) {
      best = k;
      bestN = v;
    }
  }
  return { type: best, count: bestN };
}

function playTypeDistributionFromBreakdown(
  counts: GuidedPlayTypeBreakdown,
  n: number,
): { name: string; pct: number; count: number }[] {
  const rows: { name: string; pct: number; count: number }[] = [
    { name: "Run", pct: pct(counts.run, n), count: counts.run },
    { name: "Pass", pct: pct(counts.pass, n), count: counts.pass },
  ];
  if (counts.rpo > 0) {
    rows.push({ name: "RPO", pct: pct(counts.rpo, n), count: counts.rpo });
  }
  return rows;
}

function supportingMixStats(counts: GuidedPlayTypeBreakdown, n: number): FirstDriveSupportingStat[] {
  const stats: FirstDriveSupportingStat[] = [
    { label: "Run", value: `${pct(counts.run, n)}%`, barFraction: counts.run / n },
    { label: "Pass", value: `${pct(counts.pass, n)}%`, barFraction: counts.pass / n },
  ];
  if (counts.rpo > 0) {
    stats.push({ label: "RPO", value: `${pct(counts.rpo, n)}%`, barFraction: counts.rpo / n });
  } else {
    stats.push({ label: "Total calls", value: String(n) });
  }
  return stats.slice(0, 3);
}

type PlayAgg = { sumYards: number; count: number; lastIndex: number; sampleName: string };

function aggregateByPlayName(coach: LoggedPlay[]): Map<string, PlayAgg> {
  const map = new Map<string, PlayAgg>();
  coach.forEach((p, index) => {
    const raw = String(p.play_name ?? "").trim();
    const key = normalizePlayName(raw);
    if (!key) return;
    const y = Number(p.yards_gained ?? 0);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { sumYards: y, count: 1, lastIndex: index, sampleName: raw });
    } else {
      prev.sumYards += y;
      prev.count += 1;
      prev.lastIndex = index;
    }
  });
  return map;
}

function pickBestPlayByAvgYards(coach: LoggedPlay[]): { key: string; avg: number; sampleName: string; lastIndex: number } | null {
  const map = aggregateByPlayName(coach);
  let best: { key: string; avg: number; sampleName: string; lastIndex: number } | null = null;
  for (const [key, agg] of map) {
    const avg = agg.sumYards / agg.count;
    if (!best) {
      best = { key, avg, sampleName: agg.sampleName, lastIndex: agg.lastIndex };
      continue;
    }
    if (avg > best.avg) {
      best = { key, avg, sampleName: agg.sampleName, lastIndex: agg.lastIndex };
    } else if (avg === best.avg && agg.lastIndex > best.lastIndex) {
      best = { key, avg, sampleName: agg.sampleName, lastIndex: agg.lastIndex };
    }
  }
  return best;
}

/** Coaching readout for the first-drive insight overlay (all coach calls on the drive). */
export function buildFirstDriveCoachingReadout(plays: LoggedPlay[]): FirstDriveCoachingReadout | null {
  const coach = plays.filter(isCoachCallPlay);
  if (coach.length < GUIDED_ONBOARDING_MIN_COACH_CALLS) return null;

  const n = coach.length;
  const breakdown = countBreakdown(coach);
  const { type: domType, count: domCount } = dominantCanonType(breakdown);

  if (domType !== "OTHER" && domCount / n >= 0.7) {
    const typeLabel = domType === "RUN" ? "RUN" : domType === "PASS" ? "PASS" : "RPO";
    const primaryInsight = guidedFirstDrivePrimaryTendency(typeLabel, pct(domCount, n));
    const nudge =
      domType === "PASS"
        ? GUIDED_FIRST_DRIVE_NUDGE_PASS_TILT
        : domType === "RUN"
          ? GUIDED_FIRST_DRIVE_NUDGE_RUN_TILT
          : GUIDED_FIRST_DRIVE_NUDGE_RPO_TILT;
    return {
      headline: GUIDED_FIRST_DRIVE_HEADLINE_TENDENCY,
      primaryInsight,
      supportingStats: supportingMixStats(breakdown, n),
      coachingNudge: nudge,
      playTypeDistribution: playTypeDistributionFromBreakdown(breakdown, n),
    };
  }

  const best = pickBestPlayByAvgYards(coach);
  if (best && best.avg > 0) {
    const display = coachPlayDisplayName(best.sampleName);
    const mix = supportingMixStats(breakdown, n);
    const supportingStats: FirstDriveSupportingStat[] = [
      ...mix.slice(0, 2),
      { label: "Best avg", value: `${display} · ${best.avg.toFixed(1)} yds` },
    ];
    return {
      headline: GUIDED_FIRST_DRIVE_HEADLINE_BEST,
      primaryInsight: guidedFirstDrivePrimaryBest(display),
      supportingStats,
      coachingNudge: GUIDED_FIRST_DRIVE_NUDGE_BEST_PLAY,
      playTypeDistribution: playTypeDistributionFromBreakdown(breakdown, n),
    };
  }

  return {
    headline: GUIDED_FIRST_DRIVE_HEADLINE_BALANCED,
    primaryInsight: GUIDED_FIRST_DRIVE_PRIMARY_BALANCED,
    supportingStats: supportingMixStats(breakdown, n),
    coachingNudge: GUIDED_FIRST_DRIVE_NUDGE_BALANCED,
    playTypeDistribution: playTypeDistributionFromBreakdown(breakdown, n),
  };
}

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

/** Coaching readout from the last five non-punt calls (uses server-resolved `play_type`). */
export function guidedInsightFromLoggedPlays(plays: LoggedPlay[]): string {
  return buildGuidedOnboardingInsight(plays)?.tendencyParagraph ?? "";
}
