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

/**
 * Match OCR play text against plays in one formation only (filename namespace).
 * Reuses length-aware fuzzy gates from formation OCR — no broader fuzzy.
 *
 * Also tries space-compact equality so OCR like "JETPAHB SWEEP" uniquely
 * resolves to "JET PA HB SWEEP" instead of tying with "JET HB SWEEP".
 */
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
  // OCR often reads digit 0 as letter O in play names (e.g. HB SPLIT 0).
  const needle = normalizePlayName(
    ocrPlayText.replace(/\bO\b/g, "0").replace(/(\d)\s*O\b/g, "$10").replace(/\bO\s*(\d)/g, "0$1"),
  );
  if (!needle) return { matchedPlay: null, matchConfidence: "none" };

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
  if (cands.length === 0) return { matchedPlay: null, matchConfidence: "none" };
  if (
    cands.length > 1 &&
    cands[0].distance === cands[1].distance &&
    cands[0].compactDistance === cands[1].compactDistance
  ) {
    return { matchedPlay: null, matchConfidence: "none" };
  }
  return { matchedPlay: cands[0].play, matchConfidence: "fuzzy" };
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
