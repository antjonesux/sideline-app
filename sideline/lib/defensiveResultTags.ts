import { deriveStoredResultTag } from "@/lib/gameStateEngine";

/** Canonical defensive result tags stored in `logged_plays.result_tags`. */
export const DEFENSIVE_RESULT_TAGS = [
  "INCOMPLETE",
  "SACK",
  "INTERCEPTION",
  "FUMBLE",
  "PENALTY",
  "PUNT",
  "TOUCHDOWN",
  "TFL",
] as const;

export type DefensiveResultTag = (typeof DEFENSIVE_RESULT_TAGS)[number];

/** Coach-selectable tags in the defensive result picker (TFL is derived from yards, not selected). */
export const SELECTABLE_DEFENSIVE_RESULT_TAGS = DEFENSIVE_RESULT_TAGS.filter(
  (tag) => tag !== "TFL",
) as Exclude<DefensiveResultTag, "TFL">[];

/**
 * Blunt standalones: selecting one clears all other tags.
 * INTERCEPTION is handled specially so it can coexist with TOUCHDOWN (pick-six).
 */
export const DEFENSIVE_STANDALONE_RESULT_TAGS = [
  "INCOMPLETE",
  "PENALTY",
  "PUNT",
] as const satisfies readonly DefensiveResultTag[];

/** Tags that may share a snap with TOUCHDOWN (pick-six / scoop-and-score). */
export const DEFENSIVE_TD_PARTNER_TAGS = [
  "INTERCEPTION",
  "FUMBLE",
] as const satisfies readonly DefensiveResultTag[];

export const DEFENSIVE_RESULT_TAG_LABELS: Record<DefensiveResultTag, string> = {
  INCOMPLETE: "Incomplete",
  SACK: "Sack",
  INTERCEPTION: "Interception",
  FUMBLE: "Fumble",
  PENALTY: "Penalty",
  PUNT: "Punt",
  TOUCHDOWN: "Touchdown",
  TFL: "TFL",
};

const TAG_SET = new Set<string>(DEFENSIVE_RESULT_TAGS);
const STANDALONE_SET = new Set<string>(DEFENSIVE_STANDALONE_RESULT_TAGS);
const TD_PARTNER_SET = new Set<string>(DEFENSIVE_TD_PARTNER_TAGS);

export function isDefensiveResultTag(value: string): value is DefensiveResultTag {
  return TAG_SET.has(value);
}

/** Normalize client/API payload to stored tag strings; drops unknown values. */
export function normalizeDefensiveResultTags(raw: unknown): DefensiveResultTag[] {
  if (!Array.isArray(raw)) return [];
  const out: DefensiveResultTag[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const upper = item.trim().toUpperCase();
    if (isDefensiveResultTag(upper) && !out.includes(upper)) {
      out.push(upper);
    }
  }
  return out;
}

/** Defensive plays use `result_tags` (including `[]`); offensive plays leave it null. */
export function isDefensiveLoggedPlay(play: { result_tags?: string[] | null }): boolean {
  return play.result_tags != null;
}

/**
 * Apply mutual exclusivity rules when toggling defensive result tags.
 *
 * - Incomplete / Penalty / Punt: blunt standalone
 * - Touchdown: keeps only Interception and/or Fumble partners (pick-six / scoop-and-score)
 * - Interception: standalone unless Touchdown already selected
 * - Sack + Fumble can coexist; Sack clears Touchdown (incompatible)
 */
export function toggleDefensiveResultTag(
  selected: readonly DefensiveResultTag[],
  tag: DefensiveResultTag,
): DefensiveResultTag[] {
  if (selected.includes(tag)) {
    return selected.filter((t) => t !== tag);
  }

  if (STANDALONE_SET.has(tag)) {
    return [tag];
  }

  if (tag === "TOUCHDOWN") {
    const partners = selected.filter((t) => TD_PARTNER_SET.has(t));
    return [...partners, "TOUCHDOWN"];
  }

  if (tag === "INTERCEPTION") {
    return selected.includes("TOUCHDOWN") ? ["INTERCEPTION", "TOUCHDOWN"] : ["INTERCEPTION"];
  }

  // SACK or FUMBLE
  let next = selected.filter((t) => !STANDALONE_SET.has(t) && t !== "INTERCEPTION");
  if (tag === "SACK") {
    next = next.filter((t) => t !== "TOUCHDOWN");
  }
  return [...next, tag];
}

/** Map defensive multi-tags + yards to the stored `result_tag` used by drive-outcome logic. */
export function deriveDefensiveStoredResultTag(
  tags: readonly DefensiveResultTag[],
  yards: number,
  distance = 10,
): string {
  const set = new Set(tags);
  // TD wins over TURNOVER so pick-six / scoop-and-score trigger post-TD scoring.
  if (set.has("TOUCHDOWN")) return "TOUCHDOWN";
  if (set.has("PUNT")) return "PUNT";
  if (set.has("INTERCEPTION") || set.has("FUMBLE")) return "TURNOVER";
  if (set.has("INCOMPLETE")) return "INCOMPLETE";
  if (set.has("PENALTY")) return "PENALTY";
  if (set.has("SACK")) return "LOSS";
  if (yards < 0) return "LOSS";
  if (yards === 0) return "NO_GAIN";
  return deriveStoredResultTag("GAIN", Math.max(0, yards), distance);
}
