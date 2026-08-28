/** XP / 2-point conversion result tags, scoring, and coach-facing labels. */

export type ConversionScenario = "XP" | "2 Point";

export type ConversionResultOption = {
  label: string;
  storedTag: string;
};

export const XP_RESULT_OPTIONS: ConversionResultOption[] = [
  { label: "XP Made", storedTag: "XP_MADE" },
  { label: "XP Missed", storedTag: "XP_MISSED" },
];

export const TWO_PT_RESULT_OPTIONS: ConversionResultOption[] = [
  { label: "2PT Made", storedTag: "TWO_PT_MADE" },
  { label: "2PT Missed", storedTag: "TWO_PT_MISSED" },
];

export function isConversionScenario(scenario: string | null | undefined): scenario is ConversionScenario {
  const s = (scenario ?? "").trim();
  return s === "XP" || s === "2 Point";
}

export function conversionResultOptionsForScenario(
  scenario: string | null | undefined,
): ConversionResultOption[] | null {
  const s = (scenario ?? "").trim();
  if (s === "XP") return XP_RESULT_OPTIONS;
  if (s === "2 Point") return TWO_PT_RESULT_OPTIONS;
  return null;
}

function normTag(tag: string): string {
  return tag.trim().toUpperCase().replace(/\s+/g, "_");
}

export function playScenario(play: {
  scenario?: string | null;
  situation_override?: string | null;
}): string {
  const override = (play.situation_override ?? "").trim();
  if (override) return override;
  return (play.scenario ?? "").trim();
}

export function isPostTdFollowUpScenario(scenario: string): boolean {
  return scenario === "XP" || scenario === "2 Point";
}

/** Coach-facing badge for a logged play row. */
export function playResultDisplayLabel(play: {
  result_tag: string;
  scenario?: string | null;
  situation_override?: string | null;
}): string {
  const scenario = playScenario(play);
  const tag = normTag(play.result_tag);

  if (scenario === "XP") {
    if (tag === "XP_MADE") return "Extra Point";
    if (tag === "XP_MISSED") return "XP Missed";
    return "Extra Point";
  }
  if (scenario === "2 Point") {
    if (tag === "TWO_PT_MADE") return "2-Point";
    if (tag === "TWO_PT_MISSED") return "2PT Missed";
    return "2-Point";
  }
  if (tag === "TOUCHDOWN") return "Touchdown";
  if (tag === "FIELD_GOAL") return "Field Goal";
  return tag.replace(/_/g, " ");
}

/** Points this snap adds to the running game score (offense perspective). */
export function offensiveScorePoints(args: {
  resultTag: string;
  scenario: string;
}): number {
  const tag = normTag(args.resultTag);
  const scenario = args.scenario.trim();

  if (scenario === "XP") {
    return tag === "XP_MADE" ? 1 : 0;
  }
  if (scenario === "2 Point") {
    return tag === "TWO_PT_MADE" ? 2 : 0;
  }
  if (tag === "TOUCHDOWN") return 6;
  if (tag === "FIELD_GOAL") return 3;
  return 0;
}
