/**
 * Exact cross-playbook defensive art reuse (CFB27 defense only).
 *
 * Reusable identity: gameVersion + side + exact canonical formation + normalizePlayName(play).
 * Fail-closed — no fuzzy matching. Does not publish.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { normalizePlayName } from "../../../lib/utils";
import type { PlayArtReference } from "../types";
import {
  buildFormationCoverage,
  buildRecaptureQueue,
} from "./formation-coverage";
import { compareToCatalog } from "./ocr-and-catalog";
import {
  cardIdentityKey,
  playIdentityKey,
} from "./process-screenshot-screens";
import type {
  CrossPlaybookReuseProvenance,
  ExtractedVideoCard,
  VideoPrepareReport,
  VideoSideOfBall,
} from "./types";
import type { ManualSupplementReport } from "./process-supplements";

export const DEFENSIVE_REUSE_GAME_VERSION = "cfb27";
export const DEFENSIVE_REUSE_SIDE: VideoSideOfBall = "defense";

export type ValidatedArtEntry = {
  playbookSlug: string;
  playbookDisplayName: string;
  card: ExtractedVideoCard;
  reusableArtKey: string;
};

export type DefensiveArtCorpus = Map<string, ValidatedArtEntry[]>;

export type DefensiveReuseApplyResult = {
  reuseCards: ExtractedVideoCard[];
  combinedCards: ExtractedVideoCard[];
  directCards: ExtractedVideoCard[];
  mappingsSatisfied: number;
  identitiesReused: number;
  rejected: Array<{
    formation: string;
    play: string;
    reason: string;
  }>;
};

export type DefensiveReuseCoverage = {
  expected: number;
  directCaptured: number;
  recoveredExistingSource: number;
  exactReused: number;
  totalCoverage: number;
  missing: number;
  coveragePct: number;
};

/** Cross-playbook reusable art identity (playbook slug excluded). */
export function defensiveReusableArtKey(
  formation: string,
  play: string,
  gameVersion = DEFENSIVE_REUSE_GAME_VERSION,
  side: VideoSideOfBall = DEFENSIVE_REUSE_SIDE,
): string {
  return `${gameVersion}\0${side}\0${formation}\0${normalizePlayName(play)}`;
}

export function isDefensiveReuseEligible(
  gameVersion: string,
  side: VideoSideOfBall,
): boolean {
  return gameVersion === DEFENSIVE_REUSE_GAME_VERSION && side === DEFENSIVE_REUSE_SIDE;
}

/** Direct capture only — never index reuse or recovered proxy cards as corpus sources. */
export function isDirectValidatedArtCard(card: ExtractedVideoCard): boolean {
  if (card.sourceType === "cross-playbook-reuse") return false;
  if (card.sourceType === "recovered-existing-source") return false;
  if (card.supplementClass === "CROSS_PLAYBOOK_REUSE") return false;
  if (card.supplementClass === "RECOVERED_EXISTING_SOURCE") return false;
  return isValidatedReusableArtCard(card);
}

export function isRecoveredExistingSourceCard(card: ExtractedVideoCard): boolean {
  return (
    card.sourceType === "recovered-existing-source" ||
    card.supplementClass === "RECOVERED_EXISTING_SOURCE"
  );
}

export function isValidatedReusableArtCard(card: ExtractedVideoCard): boolean {
  if (card.gameVersion !== DEFENSIVE_REUSE_GAME_VERSION) return false;
  if (card.side !== DEFENSIVE_REUSE_SIDE) return false;
  if (!card.catalogValid || card.emptySlot || card.screenRejected) return false;
  if (!card.matchedFormation?.trim() || !card.matchedPlay?.trim()) return false;
  if (card.formationMatchConfidence === "none") return false;
  if (card.playMatchConfidence === "none" || card.playMatchConfidence === "skipped") {
    return false;
  }
  if (!card.artCropPath || !existsSync(card.artCropPath)) return false;
  if (!card.sourceCardPath || !existsSync(card.sourceCardPath)) return false;
  return true;
}

const SOURCE_TYPE_RANK: Record<string, number> = {
  video: 0,
  "manual-supplement": 1,
  screenshot: 2,
  "recovered-existing-source": 3,
};

function sourceTypeRank(card: ExtractedVideoCard): number {
  const t = card.sourceType ?? "video";
  if (t === "cross-playbook-reuse") return 99;
  return SOURCE_TYPE_RANK[t] ?? 50;
}

/** Deterministic — never depends on filesystem traversal order. */
export function compareValidatedArtEntries(
  a: ValidatedArtEntry,
  b: ValidatedArtEntry,
): number {
  const slugCmp = a.playbookSlug.localeCompare(b.playbookSlug);
  if (slugCmp !== 0) return slugCmp;
  const typeCmp = sourceTypeRank(a.card) - sourceTypeRank(b.card);
  if (typeCmp !== 0) return typeCmp;
  const fileA = a.card.sourceFile ?? a.card.videoFile ?? "";
  const fileB = b.card.sourceFile ?? b.card.videoFile ?? "";
  const fileCmp = fileA.localeCompare(fileB);
  if (fileCmp !== 0) return fileCmp;
  return a.card.artCropPath.localeCompare(b.card.artCropPath);
}

export function selectDeterministicReuseSource(
  candidates: ValidatedArtEntry[],
  targetPlaybookSlug: string,
): ValidatedArtEntry | null {
  const eligible = candidates
    .filter(
      (entry) =>
        entry.playbookSlug !== targetPlaybookSlug &&
        isValidatedReusableArtCard(entry.card) &&
        entry.card.matchedFormation &&
        entry.card.matchedPlay,
    )
    .sort(compareValidatedArtEntries);
  return eligible[0] ?? null;
}

export function globalRecoveredRegistryPath(playArtRoot: string): string {
  return join(
    playArtRoot,
    "video-staging",
    DEFENSIVE_REUSE_GAME_VERSION,
    DEFENSIVE_REUSE_SIDE,
    "DEFENSIVE_GLOBAL_RECOVERY.json",
  );
}

export function loadGlobalRecoveredCards(playArtRoot: string): ExtractedVideoCard[] {
  const path = globalRecoveredRegistryPath(playArtRoot);
  if (!existsSync(path)) return [];
  const raw = JSON.parse(readFileSync(path, "utf8")) as {
    recovered?: ExtractedVideoCard[];
  };
  return (raw.recovered ?? []).filter((c) => isValidatedReusableArtCard(c));
}

function loadVideoReport(stagingRoot: string): VideoPrepareReport | null {
  const path = join(stagingRoot, "report.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as VideoPrepareReport;
}

function loadSupplementReport(stagingRoot: string): ManualSupplementReport | null {
  const path = join(stagingRoot, "supplement-report.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as ManualSupplementReport;
}

function loadPlaybookDisplayName(stagingRoot: string, slug: string): string {
  const supplement = loadSupplementReport(stagingRoot);
  if (supplement?.namespace.playbookDisplayName) {
    return supplement.namespace.playbookDisplayName;
  }
  const report = loadVideoReport(stagingRoot);
  if (report?.playbook) return report.playbook;
  return slug;
}

export function loadDirectValidatedCards(stagingRoot: string): ExtractedVideoCard[] {
  const cards: ExtractedVideoCard[] = [];
  const supplement = loadSupplementReport(stagingRoot);
  if (supplement) {
    cards.push(
      ...supplement.videoOnlyCards.filter((c) => isDirectValidatedArtCard(c)),
    );
    cards.push(
      ...supplement.cards.filter(
        (c) =>
          c.supplementClass === "NEW_MISSING_PLAY" && isDirectValidatedArtCard(c),
      ),
    );
    return cards;
  }
  const report = loadVideoReport(stagingRoot);
  if (report?.cards) {
    cards.push(...report.cards.filter((c) => isDirectValidatedArtCard(c)));
  }
  return cards;
}

export function listDefensivePlaybookSlugs(playArtRoot: string): string[] {
  const root = join(
    playArtRoot,
    "video-staging",
    DEFENSIVE_REUSE_GAME_VERSION,
    DEFENSIVE_REUSE_SIDE,
  );
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((name) => !name.startsWith(".") && !name.endsWith(".md"))
    .filter((name) => statSync(join(root, name)).isDirectory())
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Build corpus from direct validated captures across all defensive playbooks.
 * Sorted deterministically per reusable-art key.
 */
export function buildDefensiveValidatedArtCorpus(
  playArtRoot: string,
): DefensiveArtCorpus {
  const corpus: DefensiveArtCorpus = new Map();
  const stagingParent = join(
    playArtRoot,
    "video-staging",
    DEFENSIVE_REUSE_GAME_VERSION,
    DEFENSIVE_REUSE_SIDE,
  );

  for (const slug of listDefensivePlaybookSlugs(playArtRoot)) {
    const stagingRoot = join(stagingParent, slug);
    const displayName = loadPlaybookDisplayName(stagingRoot, slug);
    for (const card of loadDirectValidatedCards(stagingRoot)) {
      if (!isDirectValidatedArtCard(card)) continue;
      const formation = card.matchedFormation!;
      const play = card.matchedPlay!;
      const key = defensiveReusableArtKey(formation, play);
      const entry: ValidatedArtEntry = {
        playbookSlug: slug,
        playbookDisplayName: displayName,
        card,
        reusableArtKey: key,
      };
      const list = corpus.get(key) ?? [];
      if (!list.some((e) => e.playbookSlug === slug)) {
        list.push(entry);
        corpus.set(key, list);
      }
    }
  }

  for (const card of loadGlobalRecoveredCards(playArtRoot)) {
    if (!isValidatedReusableArtCard(card)) continue;
    const formation = card.matchedFormation!;
    const play = card.matchedPlay!;
    const key = defensiveReusableArtKey(formation, play);
    const sourceSlug =
      card.recoveryProvenance?.sourcePlaybookSlug ?? card.playbookSlug ?? "recovered";
    const sourceName =
      card.recoveryProvenance?.sourcePlaybookDisplayName ?? sourceSlug;
    const entry: ValidatedArtEntry = {
      playbookSlug: sourceSlug,
      playbookDisplayName: sourceName,
      card,
      reusableArtKey: key,
    };
    const list = corpus.get(key) ?? [];
    if (!list.some((e) => e.card.artCropPath === card.artCropPath)) {
      list.push(entry);
      corpus.set(key, list);
    }
  }

  for (const [key, list] of corpus) {
    corpus.set(key, [...list].sort(compareValidatedArtEntries));
  }
  return corpus;
}

export function buildRecoveredArtForBook(input: {
  targetPlaybookSlug: string;
  formation: string;
  play: string;
  source: ExtractedVideoCard;
}): ExtractedVideoCard {
  const provenance = input.source.recoveryProvenance;
  const reusableArtKey = defensiveReusableArtKey(input.formation, input.play);
  const syntheticId = `recovered-target:${input.targetPlaybookSlug}:${normalizePlayName(input.play)}`;

  return {
    ...input.source,
    playbookSlug: input.targetPlaybookSlug,
    videoFile: syntheticId,
    timestamp: syntheticId,
    matchedFormation: input.formation,
    matchedPlay: input.play,
    formationMatchConfidence: "exact",
    playMatchConfidence: input.source.playMatchConfidence ?? "exact",
    sourceType: "recovered-existing-source",
    sourceFile: syntheticId,
    supplementClass: "RECOVERED_EXISTING_SOURCE",
    recoveryProvenance: provenance
      ? { ...provenance, reusableArtKey, targetFormation: input.formation, targetPlay: input.play }
      : undefined,
  };
}

export function applyRecoveredExistingSource(input: {
  targetPlaybookSlug: string;
  reference: PlayArtReference;
  directCards: ExtractedVideoCard[];
  globalRecovered: ExtractedVideoCard[];
}): {
  recoveredCards: ExtractedVideoCard[];
  combinedCards: ExtractedVideoCard[];
  mappingsSatisfied: number;
  identitiesRecovered: number;
} {
  const ownedKeys = new Set<string>();
  for (const card of input.directCards) {
    const key = cardIdentityKey(card);
    if (key) ownedKeys.add(key);
  }

  const recoveredCards: ExtractedVideoCard[] = [];
  const recoveredIdentityKeys = new Set<string>();

  for (const formation of input.reference.formations) {
    for (const play of formation.plays) {
      const identityKey = playIdentityKey(formation.name, play);
      if (ownedKeys.has(identityKey)) continue;

      const artKey = defensiveReusableArtKey(formation.name, play);
      const source = input.globalRecovered.find(
        (c) =>
          c.matchedFormation === formation.name &&
          normalizePlayName(c.matchedPlay!) === normalizePlayName(play),
      );
      if (!source) continue;

      const recoveredCard = buildRecoveredArtForBook({
        targetPlaybookSlug: input.targetPlaybookSlug,
        formation: formation.name,
        play,
        source,
      });
      recoveredCards.push(recoveredCard);
      ownedKeys.add(identityKey);
      recoveredIdentityKeys.add(artKey);
    }
  }

  return {
    recoveredCards,
    combinedCards: [...input.directCards, ...recoveredCards],
    mappingsSatisfied: recoveredCards.length,
    identitiesRecovered: recoveredIdentityKeys.size,
  };
}

export function buildReusedVideoCard(input: {
  targetPlaybookSlug: string;
  targetDisplayName: string;
  formation: string;
  play: string;
  source: ValidatedArtEntry;
}): ExtractedVideoCard {
  const sourceCard = input.source.card;
  const reusableArtKey = defensiveReusableArtKey(input.formation, input.play);
  const sourceType =
    sourceCard.sourceType === "cross-playbook-reuse"
      ? "video"
      : (sourceCard.sourceType ?? "video");
  const provenance: CrossPlaybookReuseProvenance = {
    reusableArtKey,
    sourcePlaybookSlug: input.source.playbookSlug,
    sourcePlaybookDisplayName: input.source.playbookDisplayName,
    sourceType: sourceType as CrossPlaybookReuseProvenance["sourceType"],
    sourceFile: sourceCard.sourceFile ?? sourceCard.videoFile,
    sourceArtCropPath: sourceCard.artCropPath,
    sourceCardPath: sourceCard.sourceCardPath,
  };
  const sourceBasename = basename(provenance.sourceFile);
  const syntheticId = `reuse:${input.source.playbookSlug}:${sourceBasename}:${normalizePlayName(input.play)}`;

  return {
    gameVersion: DEFENSIVE_REUSE_GAME_VERSION,
    side: DEFENSIVE_REUSE_SIDE,
    playbookSlug: input.targetPlaybookSlug,
    videoFile: syntheticId,
    timestamp: syntheticId,
    timestampSec: 0,
    screenIndex: -1,
    cardPosition: "middle",
    sourceCardPath: provenance.sourceCardPath,
    artCropPath: provenance.sourceArtCropPath,
    emptySlot: false,
    formationOcrRaw: input.formation,
    formationOcr: input.formation,
    playNameOcrRaw: input.play,
    playNameOcr: input.play,
    matchedFormation: input.formation,
    formationMatchConfidence: "exact",
    matchedPlay: input.play,
    playMatchConfidence: "exact",
    catalogValid: true,
    screenRejected: false,
    rejectReason: null,
    sourceType: "cross-playbook-reuse",
    sourceFile: syntheticId,
    supplementClass: "CROSS_PLAYBOOK_REUSE",
    reuseProvenance: provenance,
  };
}

export function computeDefensiveReuseCoverage(input: {
  reference: PlayArtReference;
  directCards: ExtractedVideoCard[];
  combinedCards: ExtractedVideoCard[];
}): DefensiveReuseCoverage {
  const expected = input.reference.formations.reduce((n, f) => n + f.plays.length, 0);
  const directCatalog = compareToCatalog(input.reference, input.directCards);
  const combinedCatalog = compareToCatalog(input.reference, input.combinedCards);
  const directCaptured = directCatalog.detectedUniquePlays;
  const totalCoverage = combinedCatalog.detectedUniquePlays;
  const recoveredExistingSource = input.combinedCards.filter(
    (c) => isRecoveredExistingSourceCard(c) && c.catalogValid,
  ).length;
  const exactReused = Math.max(
    0,
    totalCoverage - directCaptured - recoveredExistingSource,
  );
  const missing = combinedCatalog.missingCatalogPlays.length;
  return {
    expected,
    directCaptured,
    recoveredExistingSource,
    exactReused,
    totalCoverage,
    missing,
    coveragePct: expected > 0 ? (totalCoverage / expected) * 100 : 0,
  };
}

/**
 * Apply exact cross-playbook reuse to fill gaps in direct captures.
 * Only adds identities present in target reference catalog.
 */
export function applyDefensiveCrossPlaybookReuse(input: {
  targetPlaybookSlug: string;
  targetDisplayName: string;
  reference: PlayArtReference;
  directCards: ExtractedVideoCard[];
  corpus: DefensiveArtCorpus;
}): DefensiveReuseApplyResult {
  const ownedKeys = new Set<string>();
  for (const card of input.directCards) {
    const key = cardIdentityKey(card);
    if (key) ownedKeys.add(key);
  }

  const reuseCards: ExtractedVideoCard[] = [];
  const rejected: DefensiveReuseApplyResult["rejected"] = [];
  const reusedIdentityKeys = new Set<string>();

  for (const formation of input.reference.formations) {
    for (const play of formation.plays) {
      const identityKey = playIdentityKey(formation.name, play);
      if (ownedKeys.has(identityKey)) continue;

      const artKey = defensiveReusableArtKey(formation.name, play);
      const candidates = input.corpus.get(artKey) ?? [];
      const source = selectDeterministicReuseSource(
        candidates,
        input.targetPlaybookSlug,
      );
      if (!source) continue;

      if (
        source.card.matchedFormation !== formation.name ||
        normalizePlayName(source.card.matchedPlay!) !== normalizePlayName(play)
      ) {
        rejected.push({
          formation: formation.name,
          play,
          reason: "SOURCE_IDENTITY_MISMATCH",
        });
        continue;
      }

      if (!isValidatedReusableArtCard(source.card)) {
        rejected.push({
          formation: formation.name,
          play,
          reason: "SOURCE_NOT_TRUSTWORTHY",
        });
        continue;
      }

      const reuseCard = buildReusedVideoCard({
        targetPlaybookSlug: input.targetPlaybookSlug,
        targetDisplayName: input.targetDisplayName,
        formation: formation.name,
        play,
        source,
      });
      reuseCards.push(reuseCard);
      ownedKeys.add(identityKey);
      reusedIdentityKeys.add(artKey);
    }
  }

  return {
    reuseCards,
    combinedCards: [...input.directCards, ...reuseCards],
    directCards: input.directCards,
    mappingsSatisfied: reuseCards.length,
    identitiesReused: reusedIdentityKeys.size,
    rejected,
  };
}

export function buildRecaptureArtifacts(input: {
  playbookSlug: string;
  gameVersion: string;
  side: VideoSideOfBall;
  reference: PlayArtReference;
  combinedCards: ExtractedVideoCard[];
}) {
  const combinedCatalog = compareToCatalog(input.reference, input.combinedCards);
  const combinedFormationCoverage = buildFormationCoverage(
    input.reference,
    input.combinedCards,
  );
  const recaptureQueue = buildRecaptureQueue({
    playbook: input.playbookSlug,
    gameVersion: input.gameVersion,
    side: input.side,
    formationCoverage: combinedFormationCoverage,
  });
  return { combinedCatalog, combinedFormationCoverage, recaptureQueue };
}
