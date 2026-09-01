import { readFileSync } from "node:fs";
import { normalizePlayName } from "../../../lib/utils";
import {
  matchKnownFormation,
  normalizeFormationOcrText,
  ocrPlayCardHeader,
  passesLengthAwareFuzzyThreshold,
} from "../formation-ocr";
import type { PlayArtReference } from "../types";
import type { CroppedScreenCards } from "./crop-cards";
import type {
  ExtractedVideoCard,
  ResolvedVideoSource,
  VideoCatalogCompare,
} from "./types";

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j];
  }
  return prev[b.length];
}

/** Common game-capture play-label OCR confusions (OBS/screenshot path only). */
function normalizePlayOcrText(raw: string): string {
  let t = raw.trim().toUpperCase();
  t = t.replace(/^UP\s+/, "HB ");
  t = t.replace(/^UE\s+/, "HB ");
  t = t.replace(/^WE\s+/, "HB ");
  t = t.replace(/^UWE\s+/, "HB ");
  t = t.replace(/^PO\s+(READ|PEEK)\b/, "RPO $1");
  t = t.replace(/^PPO\s+/, "RPO ");
  t = t.replace(/\bOUICK\b/g, "QUICK");
  t = t.replace(/\bJET\s+OB\b/g, "JET QB");
  t = t.replace(/\bOB\s+COUNTER\b/g, "QB COUNTER");
  t = t.replace(/\bPOWERO\b/g, "POWER O");
  t = t.replace(/\bPAYV?FLOOP\b/g, "PA Y FLOOD");
  t = t.replace(/\bPAY\s*FLOOD\b/g, "PA Y FLOOD");
  t = t.replace(/\bPA\s*Y\s*FLOOP\b/g, "PA Y FLOOD");
  t = t.replace(/\bRFIOOP\b/g, "FLOOD");
  t = t.replace(/\bRIOOP\b/g, "FLOOD");
  t = t.replace(/\bRTOOP\b/g, "FLOOD");
  t = t.replace(/\bVFLOOP\b/g, "FLOOD");
  t = t.replace(/\bVENRTICATS\b/g, "VERTICALS");
  t = t.replace(/\bOVICK\s+BASE\b/g, "45 QUICK BASE");
  if (!/\bBUNCH DIVIDE X-DRAG\b/.test(t)) {
    t = t.replace(/\bDIVIDE\s+X-?DRAG\b/g, "BUNCH DIVIDE X-DRAG");
  }
  t = t.replace(/\bXDRAG\b/g, "X-DRAG");
  return t;
}

/** Suffix is valid only when `needle` is a full spaced token at the end of `playNorm`. */
function playEndsWithToken(playNorm: string, needle: string): boolean {
  if (!needle || playNorm.length <= needle.length) return false;
  if (!playNorm.endsWith(needle)) return false;
  const boundaryIdx = playNorm.length - needle.length - 1;
  return boundaryIdx < 0 || playNorm[boundaryIdx] === " ";
}

function uniqueContainedPlayMatch(
  needle: string,
  formationPlays: string[],
): string | null {
  const n = normalizePlayName(needle);
  if (!n) return null;

  const suffixHits = formationPlays.filter((play) => {
    const p = normalizePlayName(play);
    if (p === n) return false;
    return playEndsWithToken(p, n);
  });
  if (suffixHits.length === 1) return suffixHits[0];

  const nCompact = n.replace(/\s+/g, "");
  const prefixHits = formationPlays.filter((play) => {
    const pCompact = normalizePlayName(play).replace(/\s+/g, "");
    return pCompact.startsWith(nCompact) && pCompact.length > nCompact.length;
  });
  if (prefixHits.length === 1) return prefixHits[0];

  return null;
}

/**
 * Match OCR play text against plays in one formation only (filename namespace).
 * Reuses length-aware fuzzy gates from formation OCR — no broader fuzzy.
 *
 * Also tries space-compact equality so OCR like "JETPAHB SWEEP" uniquely
 * resolves to "JET PA HB SWEEP" instead of tying with "JET HB SWEEP".
 *
 * Digit-0 substitution (OCR letter O → 0) runs only after natural OCR fails,
 * so catalog names ending in " O" (e.g. HB POWER O) are not rewritten to " 0".
 */
function matchPlayNeedle(
  needle: string,
  formationPlays: string[],
): {
  matchedPlay: string | null;
  matchConfidence: "exact" | "fuzzy" | "none";
} {
  const exact = formationPlays.find((p) => normalizePlayName(p) === needle);
  if (exact) return { matchedPlay: exact, matchConfidence: "exact" };

  const needleCompact = needle.replace(/\s+/g, "");
  const compactExact = formationPlays.find(
    (p) => normalizePlayName(p).replace(/\s+/g, "") === needleCompact,
  );
  if (compactExact) return { matchedPlay: compactExact, matchConfidence: "fuzzy" };

  type Cand = { play: string; distance: number; compactDistance: number };
  const cands: Cand[] = [];
  for (const play of formationPlays) {
    const seedNorm = normalizePlayName(play);
    const pCompact = seedNorm.replace(/\s+/g, "");
    if (
      pCompact.endsWith(needleCompact) &&
      pCompact.length > needleCompact.length &&
      !playEndsWithToken(seedNorm, needle)
    ) {
      continue;
    }
    const distance = levenshtein(needle, seedNorm);
    const gate = passesLengthAwareFuzzyThreshold(needle, seedNorm, distance);
    if (!gate.ok) continue;
    const compactDistance = levenshtein(
      needleCompact,
      seedNorm.replace(/\s+/g, ""),
    );
    cands.push({ play, distance, compactDistance });
  }
  cands.sort(
    (a, b) =>
      a.distance - b.distance ||
      a.compactDistance - b.compactDistance ||
      a.play.localeCompare(b.play),
  );
  if (cands.length === 0) {
    const contained = uniqueContainedPlayMatch(needle, formationPlays);
    if (contained) return { matchedPlay: contained, matchConfidence: "fuzzy" };
    return { matchedPlay: null, matchConfidence: "none" };
  }
  if (
    cands.length > 1 &&
    cands[0].distance === cands[1].distance &&
    cands[0].compactDistance === cands[1].compactDistance
  ) {
    return { matchedPlay: null, matchConfidence: "none" };
  }
  return { matchedPlay: cands[0].play, matchConfidence: "fuzzy" };
}

/**
 * Conservative OCR cleanups for play-name text before catalog match.
 * Only rewrites known systematic misreads; never invents play identity.
 * Safe for offense + defense (no offense play names use these tokens).
 */
function cleanupPlayOcrText(raw: string): string {
  let s = raw;

  // COVER: V often read as W
  s = s.replace(/\bCOWER\b/gi, "COVER");
  // CLOUD: D often read as P
  s = s.replace(/\bCLOUP\b/gi, "CLOUD");

  // Compact role+BLITZ forms FIRST: SAWSTITZ3 / SAWSUTZ2 → SAW BLITZ 3
  s = s.replace(
    /\b([A-Z]{2,8})S[A-Z]{0,2}T?ITZ([0-9O])\b/gi,
    (_m, role: string, dig: string) => {
      const d = /O/i.test(dig) ? "0" : dig;
      return `${role} BLITZ ${d}`;
    },
  );

  // Standalone BLITZ misreads: STITZO / STITZ3 / SITZ / SUITZ / SUTZ / STITZ
  s = s.replace(/\bS[A-Z]{0,3}T?ITZ[A-Z0-9]*\b/gi, (token) => {
    const upper = token.toUpperCase();
    const digitMatch = upper.match(/(\d)\s*$/);
    if (digitMatch) return `BLITZ ${digitMatch[1]}`;
    if (/O\s*$/i.test(upper)) return "BLITZ 0";
    return "BLITZ";
  });

  // SAW SIZ / SAM SIZ (BLITZ with missing BT)
  s = s.replace(/\b(SAW|SAM|MIKE|WILL|HOT|EDGE|NICKEL)\s+SIZ\b/gi, "$1 BLITZ");

  // Split glued letter+digit / digit+letter tokens: SHOW2 → SHOW 2, 7EDGE → 7 EDGE
  s = s.replace(/\b([A-Za-z]+?)(\d)\b/g, "$1 $2");
  s = s.replace(/\b(\d)([A-Za-z]+)\b/g, "$1 $2");

  return s;
}

export function matchPlayInFormation(
  ocrPlayText: string | null,
  formationPlays: string[],
): {
  matchedPlay: string | null;
  matchConfidence: "exact" | "fuzzy" | "none" | "skipped";
} {
  if (!ocrPlayText || !ocrPlayText.trim()) {
    return { matchedPlay: null, matchConfidence: "skipped" };
  }

  const cleaned = cleanupPlayOcrText(normalizePlayOcrText(ocrPlayText));

  const naturalNeedle = normalizePlayName(cleaned);
  if (!naturalNeedle) return { matchedPlay: null, matchConfidence: "none" };

  // OCR often drops formation prefix digits (619 SAIL → SAIL).
  if (naturalNeedle === "SAIL") {
    const sailPlays = formationPlays.filter((p) =>
      /\bSAIL\b/.test(normalizePlayName(p)),
    );
    const numbered = sailPlays.filter((p) =>
      /\d+\s+SAIL\b/.test(normalizePlayName(p)),
    );
    if (numbered.length === 1) {
      return { matchedPlay: numbered[0], matchConfidence: "fuzzy" };
    }
    if (sailPlays.length === 1) {
      return { matchedPlay: sailPlays[0], matchConfidence: "fuzzy" };
    }
  }

  const naturalHit = matchPlayNeedle(naturalNeedle, formationPlays);
  if (naturalHit.matchedPlay) {
    return naturalHit;
  }

  // OCR sometimes appends SPLIT to a base run name not present as its own catalog play.
  if (/\bSPLIT$/.test(naturalNeedle)) {
    const baseNeedle = naturalNeedle.replace(/\s+SPLIT$/, "");
    const hasSplitVariant = formationPlays.some(
      (p) => normalizePlayName(p) === naturalNeedle,
    );
    if (!hasSplitVariant && baseNeedle) {
      const baseHit = matchPlayNeedle(baseNeedle, formationPlays);
      if (baseHit.matchedPlay) return baseHit;
    }
  }

  // MTN STICK WHEEL OCR often omits the HILLTOPPERS token when it is unique in formation.
  if (naturalNeedle === "MTN STICK WHEEL") {
    const stickWheelHits = formationPlays.filter((p) =>
      playEndsWithToken(normalizePlayName(p), "STICK WHEEL"),
    );
    if (stickWheelHits.length === 1) {
      return { matchedPlay: stickWheelHits[0], matchConfidence: "fuzzy" };
    }
  }

  const contained = uniqueContainedPlayMatch(naturalNeedle, formationPlays);
  if (contained) {
    return { matchedPlay: contained, matchConfidence: "fuzzy" };
  }

  // Unique suffix / containment: OCR "EDGE PINCH" or "CROSS SHOW 2" uniquely
  // identifies one catalog play when only one formation play ends with / contains it.
  if (naturalNeedle.length >= 8) {
    const suffixHits = formationPlays.filter((p) => {
      const seed = normalizePlayName(p);
      return seed === naturalNeedle || playEndsWithToken(seed, naturalNeedle);
    });
    if (suffixHits.length === 1) {
      return { matchedPlay: suffixHits[0], matchConfidence: "fuzzy" };
    }
  }

  // OCR often reads digit 0 as letter O in play names (e.g. HB SPLIT 0).
  const zeroFixedNeedle = normalizePlayName(
    cleaned
      .replace(/\bO\b/g, "0")
      .replace(/(\d)\s*O\b/g, "$10")
      .replace(/\bO\s*(\d)/g, "0$1"),
  );
  if (zeroFixedNeedle && zeroFixedNeedle !== naturalNeedle) {
    const zeroHit = matchPlayNeedle(zeroFixedNeedle, formationPlays);
    if (zeroHit.matchedPlay) return zeroHit;
  }

  // Also try original text if cleanup changed anything (avoid over-normalize misses).
  if (cleaned !== ocrPlayText) {
    const rawNeedle = normalizePlayName(ocrPlayText);
    if (rawNeedle && rawNeedle !== naturalNeedle) {
      const rawHit = matchPlayNeedle(rawNeedle, formationPlays);
      if (rawHit.matchedPlay) return rawHit;
    }
  }

  return { matchedPlay: null, matchConfidence: "none" };
}

function isChromeNoise(raw: string, formationText: string): boolean {
  return (
    /\bKEY\s+PLAYERS\b/i.test(raw) ||
    /\b\d+\s*PLAYS\b/i.test(formationText) ||
    /\bAVGYDS\b/i.test(formationText)
  );
}

/**
 * OCR + catalog validation for Stage-B-accepted screens only.
 * Screen-level formation disagreement should already be rejected upstream.
 */
export async function ocrAndValidateCards(input: {
  resolved: ResolvedVideoSource;
  reference: PlayArtReference;
  screens: CroppedScreenCards[];
}): Promise<ExtractedVideoCard[]> {
  const knownFormations = input.reference.formations.map((f) => f.name);
  const playsByFormation = new Map(
    input.reference.formations.map((f) => [f.name, f.plays] as const),
  );
  const out: ExtractedVideoCard[] = [];

  for (const screen of input.screens) {
    const screenFormationMatches: Array<string | null> = [];

    for (const card of screen.cards) {
      if (card.emptySlot) {
        out.push({
          gameVersion: input.resolved.gameVersion,
          side: input.resolved.side,
          playbookSlug: input.resolved.playbookSlug,
          videoFile: input.resolved.basename,
          timestamp: screen.timestampLabel,
          timestampSec: screen.timestampSec,
          screenIndex: screen.screenIndex,
          cardPosition: card.position,
          sourceCardPath: card.sourceCardPath,
          artCropPath: card.artCropPath,
          emptySlot: true,
          formationOcrRaw: "",
          formationOcr: "",
          playNameOcrRaw: null,
          playNameOcr: null,
          matchedFormation: null,
          formationMatchConfidence: "none",
          matchedPlay: null,
          playMatchConfidence: "skipped",
          catalogValid: false,
          screenRejected: false,
          rejectReason: null,
        });
        screenFormationMatches.push(null);
        continue;
      }

      const buf = readFileSync(card.sourceCardPath);
      let ocr: { rawText: string; formationText: string; playNameText: string | null };
      try {
        ocr = await ocrPlayCardHeader(buf);
      } catch (err) {
        ocr = { rawText: "", formationText: "", playNameText: null };
        console.warn(
          `  OCR failed screen ${screen.screenIndex} ${card.position}: ` +
            `${err instanceof Error ? err.message : String(err)}`,
        );
      }

      const formationMatch = matchKnownFormation(ocr.formationText, knownFormations);
      let formationName = formationMatch.matchedFormation;
      let formationMatchConfidence = formationMatch.matchConfidence;

      let matchedPlay: string | null = null;
      let playMatchConfidence: ExtractedVideoCard["playMatchConfidence"] = "skipped";
      if (formationName) {
        const plays = playsByFormation.get(formationName) ?? [];
        const playMatch = matchPlayInFormation(ocr.playNameText, plays);
        matchedPlay = playMatch.matchedPlay;
        playMatchConfidence = playMatch.matchConfidence;
      } else if (ocr.playNameText) {
        playMatchConfidence = "none";
      }

      if (isChromeNoise(ocr.rawText, ocr.formationText)) {
        formationName = null;
        formationMatchConfidence = "none";
        matchedPlay = null;
        playMatchConfidence = "none";
      }

      const catalogValid =
        formationMatchConfidence !== "none" &&
        matchedPlay != null &&
        (playMatchConfidence === "exact" || playMatchConfidence === "fuzzy");

      screenFormationMatches.push(formationName);

      out.push({
        gameVersion: input.resolved.gameVersion,
        side: input.resolved.side,
        playbookSlug: input.resolved.playbookSlug,
        videoFile: input.resolved.basename,
        timestamp: screen.timestampLabel,
        timestampSec: screen.timestampSec,
        screenIndex: screen.screenIndex,
        cardPosition: card.position,
        sourceCardPath: card.sourceCardPath,
        artCropPath: card.artCropPath,
        emptySlot: false,
        formationOcrRaw: ocr.rawText,
        formationOcr: ocr.formationText || normalizeFormationOcrText(ocr.rawText),
        playNameOcrRaw: ocr.playNameText,
        playNameOcr: ocr.playNameText,
        matchedFormation: formationName,
        formationMatchConfidence,
        matchedPlay,
        playMatchConfidence,
        catalogValid,
        screenRejected: false,
        rejectReason: null,
      });
    }

    const nonNull = screenFormationMatches.filter((f): f is string => f != null);
    const unique = new Set(nonNull);
    if (nonNull.length >= 2 && unique.size > 1) {
      // Should be rare after Stage B; mark structural.
      for (const card of out.filter((c) => c.screenIndex === screen.screenIndex)) {
        card.catalogValid = false;
        card.matchedFormation = null;
        card.matchedPlay = null;
        card.formationMatchConfidence = "none";
        card.playMatchConfidence = "none";
        card.screenRejected = true;
        card.rejectReason = "FORMATION_DISAGREEMENT";
      }
    }
  }

  return out;
}

export function compareToCatalog(
  reference: PlayArtReference,
  cards: ExtractedVideoCard[],
): VideoCatalogCompare {
  const expectedFormations = reference.formations.map((f) => f.name);
  const detectedFormationSet = new Set<string>();
  const detectedPlayKeys = new Set<string>();
  const unexpectedDetectedPlays: VideoCatalogCompare["unexpectedDetectedPlays"] = [];

  for (const card of cards) {
    if (card.emptySlot || card.screenRejected) continue;
    if (card.matchedFormation) detectedFormationSet.add(card.matchedFormation);
    if (card.catalogValid && card.matchedFormation && card.matchedPlay) {
      detectedPlayKeys.add(
        `${card.matchedFormation}\0${normalizePlayName(card.matchedPlay)}`,
      );
    } else if (card.playNameOcr && card.formationOcr && !card.matchedPlay) {
      unexpectedDetectedPlays.push({
        formationOcr: card.formationOcr,
        playOcr: card.playNameOcr,
      });
    }
  }

  const detectedFormations = [...detectedFormationSet].sort();
  const missingFormations = expectedFormations.filter((f) => !detectedFormationSet.has(f));
  const unexpectedFormations = detectedFormations.filter(
    (f) => !expectedFormations.includes(f),
  );

  const missingCatalogPlays: VideoCatalogCompare["missingCatalogPlays"] = [];
  for (const f of reference.formations) {
    for (const play of f.plays) {
      const key = `${f.name}\0${normalizePlayName(play)}`;
      if (!detectedPlayKeys.has(key)) {
        missingCatalogPlays.push({ formation: f.name, play });
      }
    }
  }

  return {
    expectedFormations,
    detectedFormations,
    missingFormations,
    unexpectedFormations,
    expectedPlayCount: reference.formations.reduce((n, f) => n + f.plays.length, 0),
    detectedUniquePlays: detectedPlayKeys.size,
    missingCatalogPlays,
    unexpectedDetectedPlays,
  };
}
