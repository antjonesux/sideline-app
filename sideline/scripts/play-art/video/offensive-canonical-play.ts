/**
 * CFB27 offensive canonical play normalization.
 *
 * Explicit controlled aliases only — never suffix/substring fuzzy matching.
 */
import { normalizePlayName } from "../../../lib/utils";
import { matchPlayInFormation } from "./ocr-and-catalog";
import type { ExtractedVideoCard } from "./types";

/** Project-specific offensive aliases: catalog label → canonical identity. */
const OFFENSIVE_CANONICAL_PLAY_ALIASES: Readonly<Record<string, string>> = {
  BDUO: "DUO",
};

export function normalizeCanonicalOffensivePlayName(play: string): string {
  const normalized = normalizePlayName(play);
  return OFFENSIVE_CANONICAL_PLAY_ALIASES[normalized] ?? normalized;
}

export function offensivePlayNamesEquivalent(a: string, b: string): boolean {
  return (
    normalizeCanonicalOffensivePlayName(a) === normalizeCanonicalOffensivePlayName(b)
  );
}

/**
 * Offensive play match with explicit canonical aliases (e.g. BDUO ≡ DUO).
 * Falls back to standard formation-scoped matching first.
 */
export function matchOffensivePlayInFormation(
  ocrPlayText: string | null,
  formationPlays: string[],
): ReturnType<typeof matchPlayInFormation> {
  const base = matchPlayInFormation(ocrPlayText, formationPlays);
  if (base.matchedPlay && base.matchConfidence !== "none") {
    return base;
  }

  if (!ocrPlayText?.trim()) {
    return base;
  }

  const ocrCanonical = normalizeCanonicalOffensivePlayName(ocrPlayText);
  if (!ocrCanonical) {
    return base;
  }

  const hits = formationPlays.filter(
    (play) => normalizeCanonicalOffensivePlayName(play) === ocrCanonical,
  );
  if (hits.length === 1) {
    return { matchedPlay: hits[0]!, matchConfidence: "exact" };
  }

  return base;
}

export function offensivePlayIdentityKey(formation: string, play: string): string {
  return `${formation}\0${normalizeCanonicalOffensivePlayName(play)}`;
}

export function offensiveCardIdentityKey(card: ExtractedVideoCard): string | null {
  if (!card.catalogValid || !card.matchedFormation || !card.matchedPlay) return null;
  return offensivePlayIdentityKey(card.matchedFormation, card.matchedPlay);
}
