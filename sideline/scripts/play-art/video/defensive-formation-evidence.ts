/**
 * Narrow formation OCR evidence for defensive source recovery disambiguation.
 * Does not broaden global matching — constrains candidate selection only.
 */
import { matchKnownFormationConstrained } from "../formation-ocr";
import { normalizePlayName } from "../../../lib/utils";

/** Goal Line 6-2 header often OCRs as GOAL LINE 62 while matched to 5-3. */
const GOAL_LINE_62_HEADER = /GOAL\s*LINE\s*(?:6\s*[- ]?\s*2|62)\b/i;

/** Dime 3-2 compact header OCR. */
const DIME_32_HEADER = /\bDIME\s*3\s*[- ]?\s*2\b/i;

/** 3-2-6 3-2 often OCRs as 326 32. */
const FORMATION_326_32_HEADER = /\b3\s*[- ]?\s*2\s*[- ]?\s*6\s*3\s*[- ]?\s*2\b|\b326\s*32\b/i;

/** Dime 2-3 Odd compact header OCR. */
const DIME_23_ODD_HEADER = /\bDIME\s*2\s*[- ]?\s*3\s*ODD\b|\bDIME\s*23\s*ODD\b/i;

/** 4-2-5 Even compact header OCR (425 EVEN or full 4-2-5 EVEN). */
const FORMATION_425_EVEN_HEADER =
  /\b4\s*[- ]?\s*2\s*[- ]?\s*5\s*EVEN\b|\b425\s*EVEN\b/i;

/** Some 4-2-5 Even screens OCR as 425 OVER G in captured material. */
const FORMATION_425_OVER_G_HEADER = /\b425\s*OVER\s*G\b/i;

/** Nickel 2-4 base — excludes LOAD / MUG / DBL variant headers. */
const NICKEL_24_VARIANT_HEADER = /\bNICKEL\s*24\s*(?:LOAD|MUG|DBL)\b/i;
const NICKEL_24_BASE_HEADER =
  /\bNICKEL\s*24\b(?!\s*(?:LOAD|MUG|DBL))/i;
const NICKEL_2_4_FULL_HEADER = /\bNICKEL\s*2\s*[- ]?\s*4\b(?!\s*(?:LOAD|MUG|DBL))/i;

/** 4-3 Over base header — excludes WALK / WIDE / SOLID / UNDER variants. */
const FORMATION_43_OVER_HEADER = /\b43\s*OVER\b(?!\s*(?:WALK|WIDE|SOLID|UNDER))/i;

/** 4-3 Over Walk header OCR. */
const FORMATION_43_OVER_WALK_HEADER = /\b43\s*OVER\s*WALK\b/i;

/** Nickel Double Mug header OCR. */
const NICKEL_DOUBLE_MUG_HEADER = /\bNICKEL\s*(?:DOUBLE|DBL)\s*MUG\b/i;

export function extractFormationHeaderLines(formationOcrRaw: string): string[] {
  return formationOcrRaw
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function headerContainsExactPlay(
  formationOcrRaw: string,
  playNameOcr: string | null | undefined,
  targetPlay: string,
): boolean {
  const targetNorm = normalizePlayName(targetPlay);
  for (const candidate of [
    ...(playNameOcr ? [playNameOcr] : []),
    ...extractFormationHeaderLines(formationOcrRaw).slice(1),
  ]) {
    if (normalizePlayName(candidate) === targetNorm) return true;
  }
  return false;
}

/**
 * Returns true when OCR header text supports the target canonical formation.
 * Uses constrained catalog match — never cross-resolves to a different formation.
 */
export function formationOcrSupportsTarget(input: {
  formationOcrRaw: string;
  formationOcr: string;
  targetFormation: string;
  allFormationNames: string[];
}): boolean {
  const { targetFormation, allFormationNames } = input;

  if (targetFormation === "Goal Line 6-2" && GOAL_LINE_62_HEADER.test(input.formationOcrRaw)) {
    return true;
  }

  if (targetFormation === "Dime 3-2" && DIME_32_HEADER.test(input.formationOcrRaw)) {
    return true;
  }

  if (targetFormation === "3-2-6 3-2" && FORMATION_326_32_HEADER.test(input.formationOcrRaw)) {
    return true;
  }

  if (targetFormation === "Dime 2-3 Odd" && DIME_23_ODD_HEADER.test(input.formationOcrRaw)) {
    return true;
  }

  if (
    targetFormation === "4-2-5 Even" &&
    (FORMATION_425_EVEN_HEADER.test(input.formationOcrRaw) ||
      FORMATION_425_OVER_G_HEADER.test(input.formationOcrRaw))
  ) {
    return true;
  }

  if (targetFormation === "Nickel 2-4") {
    if (NICKEL_24_VARIANT_HEADER.test(input.formationOcrRaw)) {
      return false;
    }
    if (
      NICKEL_24_BASE_HEADER.test(input.formationOcrRaw) ||
      NICKEL_2_4_FULL_HEADER.test(input.formationOcrRaw)
    ) {
      return true;
    }
  }

  if (targetFormation === "4-3 Over" && FORMATION_43_OVER_HEADER.test(input.formationOcrRaw)) {
    return true;
  }

  if (
    targetFormation === "4-3 Over Walk" &&
    FORMATION_43_OVER_WALK_HEADER.test(input.formationOcrRaw)
  ) {
    return true;
  }

  if (
    targetFormation === "Nickel Double Mug" &&
    NICKEL_DOUBLE_MUG_HEADER.test(input.formationOcrRaw)
  ) {
    return true;
  }

  const headerLines = [
    input.formationOcr,
    ...extractFormationHeaderLines(input.formationOcrRaw),
  ];

  for (const line of headerLines) {
    const match = matchKnownFormationConstrained(line, allFormationNames, [
      targetFormation,
    ]);
    if (match.matchedFormation === targetFormation && match.matchConfidence !== "none") {
      return true;
    }
  }

  const rawMatch = matchKnownFormationConstrained(
    input.formationOcrRaw.replace(/\n/g, " "),
    allFormationNames,
    [targetFormation],
  );
  if (rawMatch.matchedFormation === targetFormation && rawMatch.matchConfidence !== "none") {
    return true;
  }

  return false;
}

/** Digit-bearing play tokens must preserve numeric suffix (2 vs 3 vs 1). */
export function numericSuffixMatchesTarget(playOcr: string, targetPlay: string): boolean {
  const targetDigits = targetPlay.match(/\d+/g) ?? [];
  if (targetDigits.length === 0) return true;
  const ocrUpper = playOcr.toUpperCase();
  return targetDigits.every((digit) => ocrUpper.includes(digit));
}

export type AmbiguityRootCause =
  | "FORMATION_OCR"
  | "PLAY_OCR"
  | "NUMERIC_TOKEN"
  | "MULTIPLE_CATALOG_CANDIDATES"
  | "WRONG_SOURCE_ASSOCIATION"
  | "OTHER";

export function inferAmbiguityRootCause(input: {
  targetFormation: string;
  targetPlay: string;
  winningCandidate: {
    formationOcrRaw: string;
    formationOcr: string;
    playNameOcr: string | null;
    formationEvidence: boolean;
    playMatchConfidence: "exact" | "fuzzy";
  } | null;
  competingCount: number;
}): AmbiguityRootCause {
  const w = input.winningCandidate;
  if (!w) return "OTHER";
  if (!w.formationEvidence) return "FORMATION_OCR";
  if (!numericSuffixMatchesTarget(w.playNameOcr ?? "", input.targetPlay)) {
    return "NUMERIC_TOKEN";
  }
  if (w.playMatchConfidence !== "exact" && input.competingCount > 1) {
    return "MULTIPLE_CATALOG_CANDIDATES";
  }
  if (w.playMatchConfidence !== "exact") return "PLAY_OCR";
  return "OTHER";
}
