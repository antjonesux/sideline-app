/**
 * Shared OCR needle normalization for defensive source recovery candidate discovery.
 */
import { normalizePlayName } from "../../../lib/utils";
import {
  formationOcrSupportsTarget,
  numericSuffixMatchesTarget,
} from "./defensive-formation-evidence";

export function normalizeOcrNeedle(text: string): string {
  return normalizePlayName(
    text
      .trim()
      .toUpperCase()
      .replace(/\s+/g, " ")
      .replace(/\bO\b/g, "0")
      .replace(/(\d)\s*O\b/g, "$10"),
  );
}

/** Narrow recovery needles — only applied during formation-aware disambiguation. */
export const RECOVERY_PLAY_NEEDLES: Record<string, string[]> = {
  "1 DOUBLE WR1": [
    "1 DOUBLE WR1",
    "1DOUBLE WRI",
    "1DOUBLE WRT",
    "1DOUSLE WRI",
    "1DOUSLE WET",
    "1DouBLE wrt",
  ],
  "OKIE ROLL 2": [
    "OKIE ROLL 2",
    "OKIE ROLL2",
    "OONIE ROLL2",
    "OONIE ROLL 2",
    "ONI ROW 2",
    "ONI ROW2",
  ],
  "OKIE ROLL 3": ["OKIE ROLL 3", "OKIE ROLL3", "OONIE ROLL3", "OONIE ROLL 3"],
  "TAMPA 2 DROP": ["TAMPA 2 DROP", "TAMPA2 DROP", "TAMPA 2 PROP"],
  "EDGE BLITZ 1": ["EDGE BLITZ 1", "EDGE BLITZ1", "EPCE BLITZ 1", "EPCE BLITZ1"],
  "BRACKET 9 SWITCH": ["BRACKET 9 SWITCH", "BRACKET SWITCH"],
  "WILL BLITZ 3": ["WILL BLITZ 3", "WITT BUTZ 3", "WILL BUTZ 3"],
  "LB BLITZ 3": ["LB BLITZ 3", "FIELP BLITZ3", "FIELD BLITZ 3"],
  "SS BLITZ 1": ["SS BLITZ 1", "S BLITZ 1"],
};

/**
 * Source-grounded play match — only when formation header evidence is already established.
 * Covers repeatable OCR digit/prefix loss verified against visible card headers.
 */
export function sourceGroundedPlayMatch(input: {
  formationOcrRaw: string;
  formationOcr: string;
  targetFormation: string;
  targetPlay: string;
  playOcr: string | null | undefined;
  allFormationNames: string[];
}): boolean {
  if (!input.playOcr?.trim()) return false;
  if (
    !formationOcrSupportsTarget({
      formationOcrRaw: input.formationOcrRaw,
      formationOcr: input.formationOcr,
      targetFormation: input.targetFormation,
      allFormationNames: input.allFormationNames,
    })
  ) {
    return false;
  }

  const norm = normalizeOcrNeedle(input.playOcr);

  if (input.targetFormation === "4-3 Over Walk" && input.targetPlay === "SS BLITZ 1") {
    return (
      norm === normalizeOcrNeedle("SS BLITZ 1") || norm === normalizeOcrNeedle("S BLITZ 1")
    );
  }

  if (input.targetPlay === "1 DOUBLE WR1") {
    if (/\bWR2\b/i.test(input.playOcr)) return false;
    if (input.targetFormation === "Nickel 2-4" || input.targetFormation === "4-2-5 Even") {
      return norm === normalizeOcrNeedle("DOUBLE WRT");
    }
  }

  if (input.targetFormation === "3-2-6 3-2" && input.targetPlay === "OKIE ROLL 3") {
    if (/\b2\b/.test(input.playOcr)) return false;
    return norm === normalizeOcrNeedle("ONIE ROLL") || norm === normalizeOcrNeedle("OKIE ROLL");
  }

  return false;
}

export function recoveryNeedleMatchesTarget(
  playOcr: string | null | undefined,
  targetPlay: string,
): boolean {
  if (!playOcr?.trim()) return false;
  const needles = RECOVERY_PLAY_NEEDLES[targetPlay];
  if (!needles) return false;
  if (targetPlay.includes("WR1") && /\bWR2\b/i.test(playOcr)) return false;
  if (targetPlay.includes("WR2") && /\bWR1\b|\bWRI\b|\bWRT\b/i.test(playOcr)) {
    return false;
  }
  const norm = normalizeOcrNeedle(playOcr);
  if (!norm) return false;
  const hits = needles.filter((needle) => normalizeOcrNeedle(needle) === norm);
  if (hits.length !== 1) return false;
  return numericSuffixMatchesTarget(playOcr, targetPlay);
}

export function recoveryNeedleOrSourceGroundedMatch(input: {
  formationOcrRaw: string;
  formationOcr: string;
  targetFormation: string;
  targetPlay: string;
  playOcr: string | null | undefined;
  allFormationNames: string[];
}): boolean {
  if (sourceGroundedPlayMatch(input)) return true;
  return recoveryNeedleMatchesTarget(input.playOcr, input.targetPlay);
}
