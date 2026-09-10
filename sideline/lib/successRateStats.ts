import { isStandardSuccessfulPlay, normalizeLoggedResultTag } from "@/lib/loggedPlaySuccess";
import { isSpecialTeamsFormationPlayRow } from "@/lib/playTypeResolution";
import type { PlayTypeBucket } from "@/lib/tendenciesPlayType";

/** Minimum eligible plays before showing a headline success rate (avoids tiny-sample %). */
export const SUCCESS_RATE_MIN_PLAYS = 5;

export type SuccessRateEligiblePlay = {
  play_name?: string | null;
  result_tag?: string | null;
  formation?: string | null;
  down?: number | null;
  distance?: number | null;
  yards_gained?: number | null;
};

export type SuccessRateResult = {
  rate: number | null;
  successes: number;
  total: number;
};

export type CoarsePlayType = "RUN" | "PASS" | "RPO";

export type CoarsePlayTypeSuccessRow = SuccessRateResult & {
  type: CoarsePlayType;
};

const CONVERSION_OR_KICK_TAGS = new Set([
  "FIELD_GOAL",
  "XP_MADE",
  "XP_MISSED",
  "TWO_PT_MADE",
  "TWO_PT_MISSED",
]);

function isPuntPlay(play: Pick<SuccessRateEligiblePlay, "play_name" | "result_tag">): boolean {
  const name = String(play.play_name ?? "").trim().toLowerCase();
  const tag = normalizeLoggedResultTag(play.result_tag);
  return name === "punt" || tag === "PUNT";
}

function isKneelOrSpikePlay(play: Pick<SuccessRateEligiblePlay, "play_name">): boolean {
  const name = String(play.play_name ?? "").trim().toLowerCase();
  if (!name) return false;
  return (
    name === "kneel" ||
    name === "kneel down" ||
    name === "kneel-down" ||
    name.includes("kneel") ||
    name === "spike" ||
    name === "qb spike" ||
    name.includes("spike")
  );
}

/**
 * Plays that count toward success rate only (does not change Calls / play_count).
 * Excludes punt, film special-teams rows, FG / XP / 2PT, kneels, and spikes.
 */
export function isSuccessRateEligiblePlay(play: SuccessRateEligiblePlay): boolean {
  if (isPuntPlay(play)) return false;
  if (isSpecialTeamsFormationPlayRow(String(play.formation ?? ""), String(play.play_name ?? ""))) return false;
  const tag = normalizeLoggedResultTag(play.result_tag);
  if (CONVERSION_OR_KICK_TAGS.has(tag)) return false;
  if (isKneelOrSpikePlay(play)) return false;
  return true;
}

function rateFromCounts(successes: number, total: number): number | null {
  if (total < SUCCESS_RATE_MIN_PLAYS) return null;
  return Math.round((successes * 1000) / total) / 10;
}

/** Headline success rate over eligible plays; `rate` is null when sample &lt; 5. */
export function computeSuccessRate(plays: SuccessRateEligiblePlay[]): SuccessRateResult {
  const eligible = plays.filter(isSuccessRateEligiblePlay);
  let successes = 0;
  for (const p of eligible) {
    if (isStandardSuccessfulPlay(p)) successes += 1;
  }
  const total = eligible.length;
  return {
    rate: rateFromCounts(successes, total),
    successes,
    total,
  };
}

function coarseTypeFromBucket(bucket: PlayTypeBucket): CoarsePlayType | null {
  if (bucket === "Run" || bucket === "Option") return "RUN";
  if (bucket === "Pass" || bucket === "Play Action" || bucket === "Screen") return "PASS";
  if (bucket === "RPO") return "RPO";
  return null;
}

const COARSE_ORDER: readonly CoarsePlayType[] = ["RUN", "PASS", "RPO"];

/**
 * Success by coarse RUN / PASS / RPO. Unmapped buckets (e.g. Other) stay in overall rate only.
 * Each row uses the same min-sample null rule as the headline rate.
 */
export function successRateByCoarsePlayType(
  plays: Array<SuccessRateEligiblePlay & { bucket: PlayTypeBucket }>,
): CoarsePlayTypeSuccessRow[] {
  const buckets: Record<CoarsePlayType, { successes: number; total: number }> = {
    RUN: { successes: 0, total: 0 },
    PASS: { successes: 0, total: 0 },
    RPO: { successes: 0, total: 0 },
  };

  for (const p of plays) {
    if (!isSuccessRateEligiblePlay(p)) continue;
    const coarse = coarseTypeFromBucket(p.bucket);
    if (!coarse) continue;
    buckets[coarse].total += 1;
    if (isStandardSuccessfulPlay(p)) buckets[coarse].successes += 1;
  }

  return COARSE_ORDER.map((type) => {
    const { successes, total } = buckets[type];
    return {
      type,
      successes,
      total,
      rate: rateFromCounts(successes, total),
    };
  });
}
