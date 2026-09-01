/**
 * Global offensive source recovery — discover existing pixels before capture.
 *
 * Separates source discovery from canonical validation.
 * Formation-aware play resolution against target catalog identity (not OCR formation).
 */
import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { normalizePlayName } from "../../../lib/utils";
import { ocrPlayCardHeader, matchKnownFormation } from "../formation-ocr";
import {
  compareValidatedArtEntries,
  offensiveReusableArtKey,
  isValidatedReusableArtCard,
  type OffensiveArtCorpus,
  type ValidatedArtEntry,
} from "./offensive-art-reuse";
import {
  filterSourceCandidates,
  extractPlayOcrCandidates,
  type IndexedSourceCard,
  type UnprocessedSourceScreenshot,
} from "./offensive-global-source-index";
import {
  matchOffensivePlayInFormation,
  normalizeCanonicalOffensivePlayName,
} from "./offensive-canonical-play";
import type {
  CardSourceType,
  ExtractedVideoCard,
  RecoveredExistingSourceProvenance,
} from "./types";

export type RecoveryClassification =
  | "EXACT_VALIDATED_REUSE"
  | "SOURCE_FOUND_RESOLUTION_REQUIRED"
  | "RECOVERED_EXISTING_SOURCE"
  | "GENUINELY_NOT_CAPTURED"
  | "INVALID_EXISTING_CAPTURE"
  | "AMBIGUOUS_SOURCE"
  | "SOURCE_DISCOVERY_DEFECT"
  | "CATALOG_DATA_ERROR";

export type MissingIdentityTarget = {
  formation: string;
  play: string;
  artKey: string;
};

export type RecoveryCandidate = {
  indexed: IndexedSourceCard;
  formationOcrRaw: string;
  formationOcr: string;
  playNameOcrRaw: string | null;
  playNameOcr: string | null;
  matchedPlay: string;
  playMatchConfidence: "exact" | "fuzzy";
  recoveryMethod: RecoveredExistingSourceProvenance["recoveryMethod"];
  reOcrApplied: boolean;
};

export type IdentityRecoveryResult = {
  target: MissingIdentityTarget;
  classification: RecoveryClassification;
  recoveredCard: ExtractedVideoCard | null;
  sourceCandidates: number;
  winningCandidate: RecoveryCandidate | null;
  ambiguousCandidates: RecoveryCandidate[];
  notes: string[];
};

export type GlobalRecoveryPassResult = {
  recoveredCards: ExtractedVideoCard[];
  recoveredByArtKey: Map<string, ExtractedVideoCard>;
  identityResults: IdentityRecoveryResult[];
  summary: {
    exactValidatedReuse: number;
    sourceFoundResolutionRequired: number;
    recoveredExistingSource: number;
    genuinelyNotCaptured: number;
    invalidExistingSource: number;
    ambiguousSource: number;
  };
};

function hasExactVisiblePlayLabel(input: {
  candidates: IndexedSourceCard[];
  targetFormation: string;
  targetPlay: string;
  knownFormations: string[];
  sourceIndex: IndexedSourceCard[];
}): boolean {
  const playNorm = normalizeCanonicalOffensivePlayName(input.targetPlay);
  return input.candidates.some((entry) => {
    if (
      !sourceFormationMatchesTarget({
        indexed: entry,
        targetFormation: input.targetFormation,
        knownFormations: input.knownFormations,
        sourceIndex: input.sourceIndex,
      })
    ) {
      return false;
    }
    return extractPlayOcrCandidates(entry).some(
      (candidate) => normalizeCanonicalOffensivePlayName(candidate) === playNorm,
    );
  });
}

function sourceFormationMatchesTarget(input: {
  indexed: IndexedSourceCard;
  targetFormation: string;
  knownFormations: string[];
  sourceIndex: IndexedSourceCard[];
}): boolean {
  if (input.indexed.matchedFormation === input.targetFormation) return true;

  const ocrCandidates = [
    input.indexed.formationOcr,
    ...(input.indexed.formationOcrRaw ?? "")
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  ].filter(Boolean) as string[];

  for (const candidate of ocrCandidates) {
    const match = matchKnownFormation(candidate, input.knownFormations);
    if (
      match.matchedFormation === input.targetFormation &&
      match.matchConfidence !== "none"
    ) {
      return true;
    }
  }

  const siblings = input.sourceIndex.filter(
    (entry) =>
      entry.sourcePlaybookSlug === input.indexed.sourcePlaybookSlug &&
      entry.sourceFile === input.indexed.sourceFile &&
      entry.card.screenIndex === input.indexed.card.screenIndex &&
      entry.artCropPath !== input.indexed.artCropPath,
  );
  return siblings.some(
    (sibling) =>
      sibling.matchedFormation === input.targetFormation &&
      sibling.validationStatus === "validated",
  );
}

function resolvePlayForTargetFormation(input: {
  playOcr: string | null;
  targetFormation: string;
  targetPlay: string;
  formationPlays: string[];
}): {
  matchedPlay: string | null;
  playMatchConfidence: "exact" | "fuzzy" | "none";
  recoveryMethod: RecoveredExistingSourceProvenance["recoveryMethod"];
} {
  const targetNorm = normalizeCanonicalOffensivePlayName(input.targetPlay);
  const base = matchOffensivePlayInFormation(input.playOcr, input.formationPlays);
  if (
    base.matchedPlay &&
    base.matchConfidence !== "none" &&
    base.matchConfidence !== "skipped" &&
    normalizeCanonicalOffensivePlayName(base.matchedPlay) === targetNorm
  ) {
    return {
      matchedPlay: input.targetPlay,
      playMatchConfidence: base.matchConfidence === "exact" ? "exact" : "fuzzy",
      recoveryMethod: "FORMATION_AWARE_REOCR",
    };
  }

  return { matchedPlay: null, playMatchConfidence: "none", recoveryMethod: "FORMATION_AWARE_REOCR" };
}

type OcrHeader = Awaited<ReturnType<typeof ocrPlayCardHeader>>;

const reOcrCache = new Map<string, OcrHeader>();

async function getCardHeaderOcr(sourceCardPath: string): Promise<OcrHeader | null> {
  const cached = reOcrCache.get(sourceCardPath);
  if (cached) return cached;
  try {
    const buffer = readFileSync(sourceCardPath);
    const header = await ocrPlayCardHeader(buffer);
    reOcrCache.set(sourceCardPath, header);
    return header;
  } catch {
    return null;
  }
}

function compareRecoveryCandidates(a: RecoveryCandidate, b: RecoveryCandidate): number {
  const confRank = (c: "exact" | "fuzzy") => (c === "exact" ? 0 : 1);
  const confCmp = confRank(a.playMatchConfidence) - confRank(b.playMatchConfidence);
  if (confCmp !== 0) return confCmp;
  const reOcrCmp = Number(b.reOcrApplied) - Number(a.reOcrApplied);
  if (reOcrCmp !== 0) return reOcrCmp;
  const entryA: ValidatedArtEntry = {
    playbookSlug: a.indexed.sourcePlaybookSlug,
    playbookDisplayName: a.indexed.sourcePlaybookDisplayName,
    card: a.indexed.card,
    reusableArtKey: "",
  };
  const entryB: ValidatedArtEntry = {
    playbookSlug: b.indexed.sourcePlaybookSlug,
    playbookDisplayName: b.indexed.sourcePlaybookDisplayName,
    card: b.indexed.card,
    reusableArtKey: "",
  };
  return compareValidatedArtEntries(entryA, entryB);
}

async function evaluateIndexedCard(input: {
  indexed: IndexedSourceCard;
  targetFormation: string;
  targetPlay: string;
  formationPlays: string[];
  knownFormations: string[];
  sourceIndex: IndexedSourceCard[];
  forceReOcr: boolean;
}): Promise<RecoveryCandidate | null> {
  const { indexed } = input;
  if (!existsSync(indexed.sourceCardPath) || !existsSync(indexed.artCropPath)) return null;

  let formationOcrRaw = indexed.formationOcrRaw;
  let formationOcr = indexed.formationOcr;
  let playNameOcrRaw = indexed.playNameOcrRaw;
  let playNameOcr = indexed.playNameOcr;
  let reOcrApplied = false;

  const tryResolve = (playOcr: string | null) =>
    resolvePlayForTargetFormation({
      playOcr,
      targetFormation: input.targetFormation,
      targetPlay: input.targetPlay,
      formationPlays: input.formationPlays,
    });

  const tryCandidates = (candidates: string[]) => {
    for (const candidate of candidates) {
      const resolved = tryResolve(candidate);
      if (resolved.matchedPlay && resolved.playMatchConfidence !== "none") {
        return resolved;
      }
    }
    return { matchedPlay: null, playMatchConfidence: "none" as const, recoveryMethod: "FORMATION_AWARE_REOCR" as const };
  };

  let resolved = tryCandidates(
    extractPlayOcrCandidates({
      playNameOcr,
      playNameOcrRaw,
      formationOcrRaw,
    }),
  );

  if (!resolved.matchedPlay && input.forceReOcr) {
    const header = await getCardHeaderOcr(indexed.sourceCardPath);
    if (header) {
      formationOcrRaw = header.rawText ?? formationOcrRaw;
      formationOcr = header.formationText ?? formationOcr;
      playNameOcrRaw = header.playNameText ?? playNameOcrRaw;
      playNameOcr = header.playNameText ?? playNameOcr;
      reOcrApplied = true;
      resolved = tryCandidates(
        extractPlayOcrCandidates({
          playNameOcr,
          playNameOcrRaw,
          formationOcrRaw,
        }),
      );
    }
  }

  if (!resolved.matchedPlay || resolved.playMatchConfidence === "none") return null;

  if (
    !sourceFormationMatchesTarget({
      indexed,
      targetFormation: input.targetFormation,
      knownFormations: input.knownFormations,
      sourceIndex: input.sourceIndex,
    })
  ) {
    return null;
  }

  return {
    indexed,
    formationOcrRaw,
    formationOcr,
    playNameOcrRaw,
    playNameOcr,
    matchedPlay: resolved.matchedPlay,
    playMatchConfidence: resolved.playMatchConfidence,
    recoveryMethod: resolved.recoveryMethod,
    reOcrApplied,
  };
}

export function buildRecoveredVideoCard(input: {
  targetFormation: string;
  targetPlay: string;
  candidate: RecoveryCandidate;
}): ExtractedVideoCard {
  const candidate = input.candidate;
  const indexed = candidate.indexed;
  const reusableArtKey = offensiveReusableArtKey(input.targetFormation, input.targetPlay);
  const sourceType = (
    indexed.sourceType === "cross-playbook-reuse" ||
    indexed.sourceType === "recovered-existing-source"
      ? "screenshot"
      : indexed.sourceType
  ) as Exclude<CardSourceType, "cross-playbook-reuse" | "recovered-existing-source">;

  const provenance: RecoveredExistingSourceProvenance = {
    reusableArtKey,
    targetFormation: input.targetFormation,
    targetPlay: input.targetPlay,
    sourcePlaybookSlug: indexed.sourcePlaybookSlug,
    sourcePlaybookDisplayName: indexed.sourcePlaybookDisplayName,
    sourceType,
    sourceFile: indexed.sourceFile,
    sourceArtCropPath: indexed.artCropPath,
    sourceCardPath: indexed.sourceCardPath,
    formationOcrRaw: candidate.formationOcrRaw,
    formationOcr: candidate.formationOcr,
    playNameOcrRaw: candidate.playNameOcrRaw,
    playNameOcr: candidate.playNameOcr,
    recoveryMethod: candidate.recoveryMethod,
  };

  const sourceBasename = basename(provenance.sourceFile || provenance.sourceCardPath);
  const syntheticId = `recovered:${indexed.sourcePlaybookSlug}:${sourceBasename}:${normalizePlayName(input.targetPlay)}`;

  return {
    gameVersion: indexed.gameVersion,
    side: indexed.side,
    playbookSlug: indexed.sourcePlaybookSlug,
    videoFile: syntheticId,
    timestamp: syntheticId,
    timestampSec: 0,
    screenIndex: indexed.card.screenIndex,
    cardPosition: indexed.cardPosition,
    sourceCardPath: indexed.sourceCardPath,
    artCropPath: indexed.artCropPath,
    emptySlot: false,
    formationOcrRaw: candidate.formationOcrRaw,
    formationOcr: candidate.formationOcr,
    playNameOcrRaw: candidate.playNameOcrRaw,
    playNameOcr: candidate.playNameOcr,
    matchedFormation: input.targetFormation,
    formationMatchConfidence: "exact",
    matchedPlay: input.targetPlay,
    playMatchConfidence: candidate.playMatchConfidence,
    catalogValid: true,
    screenRejected: false,
    rejectReason: null,
    sourceType: "recovered-existing-source",
    sourceFile: syntheticId,
    supplementClass: "RECOVERED_EXISTING_SOURCE",
    recoveryProvenance: provenance,
  };
}

export async function recoverMissingIdentity(input: {
  target: MissingIdentityTarget;
  targetPlaybookSlug: string;
  formationPlays: string[];
  knownFormations: string[];
  sourceIndex: IndexedSourceCard[];
  corpus: OffensiveArtCorpus;
  unprocessedSourceScreenshots?: UnprocessedSourceScreenshot[];
}): Promise<IdentityRecoveryResult> {
  const { target } = input;

  const corpusEntries = input.corpus.get(target.artKey) ?? [];
  const externalValidated = corpusEntries.filter(
    (e) => isValidatedReusableArtCard(e.card) && e.playbookSlug !== input.targetPlaybookSlug,
  );
  if (externalValidated.length > 0) {
    return {
      target,
      classification: "EXACT_VALIDATED_REUSE",
      recoveredCard: null,
      sourceCandidates: 0,
      winningCandidate: null,
      ambiguousCandidates: [],
      notes: [
        `Validated art exists in ${externalValidated.map((e) => e.playbookSlug).join(", ")}.`,
      ],
    };
  }

  const candidates = filterSourceCandidates(
    input.sourceIndex,
    target.formation,
    target.play,
  );

  const matches: RecoveryCandidate[] = [];
  for (const indexed of candidates) {
    if (indexed.validationStatus === "invalid") continue;
    const match = await evaluateIndexedCard({
      indexed,
      targetFormation: target.formation,
      targetPlay: target.play,
      formationPlays: input.formationPlays,
      knownFormations: input.knownFormations,
      sourceIndex: input.sourceIndex,
      forceReOcr: false,
    });
    if (match) matches.push(match);
  }

  if (matches.length === 0) {
    for (const indexed of candidates) {
      if (indexed.validationStatus === "invalid") continue;
      const match = await evaluateIndexedCard({
        indexed,
        targetFormation: target.formation,
        targetPlay: target.play,
        formationPlays: input.formationPlays,
        knownFormations: input.knownFormations,
        sourceIndex: input.sourceIndex,
        forceReOcr: true,
      });
      if (match) matches.push(match);
    }
  }

  if (matches.length === 0) {
    if (
      hasExactVisiblePlayLabel({
        candidates,
        targetFormation: target.formation,
        targetPlay: target.play,
        knownFormations: input.knownFormations,
        sourceIndex: input.sourceIndex,
      })
    ) {
      return {
        target,
        classification: "SOURCE_FOUND_RESOLUTION_REQUIRED",
        recoveredCard: null,
        sourceCandidates: candidates.length,
        winningCandidate: null,
        ambiguousCandidates: [],
        notes: ["Expected play label visible in source but canonical resolution failed."],
      };
    }

    const invalidOnly =
      candidates.length > 0 && candidates.every((c) => c.validationStatus === "invalid");
    const unprocessedForBook = (input.unprocessedSourceScreenshots ?? []).filter(
      (s) => s.playbookSlug === input.targetPlaybookSlug,
    );
    if (unprocessedForBook.length > 0) {
      return {
        target,
        classification: "SOURCE_DISCOVERY_DEFECT",
        recoveredCard: null,
        sourceCandidates: candidates.length,
        winningCandidate: null,
        ambiguousCandidates: [],
        notes: [
          `${unprocessedForBook.length} source-screenshot(s) exist but are not indexed: ${unprocessedForBook.map((s) => s.fileName).join(", ")}.`,
        ],
      };
    }
    return {
      target,
      classification: invalidOnly ? "INVALID_EXISTING_CAPTURE" : "GENUINELY_NOT_CAPTURED",
      recoveredCard: null,
      sourceCandidates: candidates.length,
      winningCandidate: null,
      ambiguousCandidates: [],
      notes: invalidOnly
        ? ["Candidate pixels exist but art crops are unusable."]
        : ["No source card resolves to this formation/play identity."],
    };
  }

  matches.sort(compareRecoveryCandidates);
  const top = matches[0]!;
  const ambiguous = matches.filter(
    (m) =>
      m.indexed.artCropPath !== top.indexed.artCropPath &&
      m.playMatchConfidence === top.playMatchConfidence,
  );

  if (ambiguous.length > 0 && top.playMatchConfidence !== "exact") {
    return {
      target,
      classification: "AMBIGUOUS_SOURCE",
      recoveredCard: null,
      sourceCandidates: candidates.length,
      winningCandidate: top,
      ambiguousCandidates: ambiguous,
      notes: [`${matches.length} source cards match with non-exact confidence.`],
    };
  }

  const recoveredCard = buildRecoveredVideoCard({
    targetFormation: target.formation,
    targetPlay: target.play,
    candidate: top,
  });

  if (!isValidatedReusableArtCard(recoveredCard)) {
    return {
      target,
      classification: "INVALID_EXISTING_CAPTURE",
      recoveredCard: null,
      sourceCandidates: candidates.length,
      winningCandidate: top,
      ambiguousCandidates: [],
      notes: ["Resolved source failed validated-art checks."],
    };
  }

  return {
    target,
    classification: "RECOVERED_EXISTING_SOURCE",
    recoveredCard,
    sourceCandidates: candidates.length,
    winningCandidate: top,
    ambiguousCandidates: [],
    notes: ["Recovered from existing source pixels via formation-aware resolution."],
  };
}

export async function runGlobalOffensiveRecovery(input: {
  queueItems: Array<{
    playbookSlug: string;
    formation: string;
    play: string;
  }>;
  formationCatalog: Map<string, string[]>;
  sourceIndex: IndexedSourceCard[];
  corpus: OffensiveArtCorpus;
  unprocessedSourceScreenshots?: UnprocessedSourceScreenshot[];
}): Promise<GlobalRecoveryPassResult> {
  const recoveredByArtKey = new Map<string, ExtractedVideoCard>();
  const identityResults: IdentityRecoveryResult[] = [];

  for (const item of input.queueItems) {
    const target: MissingIdentityTarget = {
      formation: item.formation,
      play: item.play,
      artKey: offensiveReusableArtKey(item.formation, item.play),
    };
    const formationPlays = input.formationCatalog.get(target.formation);
    if (!formationPlays?.length) {
      identityResults.push({
        target,
        classification: "GENUINELY_NOT_CAPTURED",
        recoveredCard: null,
        sourceCandidates: 0,
        winningCandidate: null,
        ambiguousCandidates: [],
        notes: ["Formation not found in global offensive catalog."],
      });
      continue;
    }

    const result = await recoverMissingIdentity({
      target,
      targetPlaybookSlug: item.playbookSlug,
      formationPlays,
      knownFormations: [...input.formationCatalog.keys()],
      sourceIndex: input.sourceIndex,
      corpus: input.corpus,
      unprocessedSourceScreenshots: input.unprocessedSourceScreenshots,
    });
    identityResults.push(result);

    if (result.recoveredCard && !recoveredByArtKey.has(target.artKey)) {
      recoveredByArtKey.set(target.artKey, result.recoveredCard);
    }
  }

  const summary = {
    exactValidatedReuse: identityResults.filter(
      (r) => r.classification === "EXACT_VALIDATED_REUSE",
    ).length,
    sourceFoundResolutionRequired: identityResults.filter(
      (r) => r.classification === "SOURCE_FOUND_RESOLUTION_REQUIRED",
    ).length,
    recoveredExistingSource: identityResults.filter(
      (r) => r.classification === "RECOVERED_EXISTING_SOURCE",
    ).length,
    genuinelyNotCaptured: identityResults.filter(
      (r) => r.classification === "GENUINELY_NOT_CAPTURED",
    ).length,
    invalidExistingSource: identityResults.filter(
      (r) => r.classification === "INVALID_EXISTING_CAPTURE",
    ).length,
    ambiguousSource: identityResults.filter(
      (r) => r.classification === "AMBIGUOUS_SOURCE",
    ).length,
  };

  return {
    recoveredCards: [...recoveredByArtKey.values()],
    recoveredByArtKey,
    identityResults,
    summary,
  };
}
