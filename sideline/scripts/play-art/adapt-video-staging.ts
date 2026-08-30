/**
 * Thin adapter: validated OBS video-staging (+ manual supplements) → ExtractedPlayArtDoc.
 *
 * For OBS sources, production identity is OCR → exact catalog (see verify-obs-visual.ts).
 * This adapter only normalizes crops into the shared ExtractedPlayArtDoc / validation shape.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { normalizePlayName } from "../../lib/utils";
import { loadPlaybookCatalog, SEED_PLAYBOOKS_DIR } from "./source-discovery";
import { teamSlugToSeedSlug } from "./lib/slug-utils";
import type {
  ClassifiedDocxBlock,
  ExtractedPlayArtDoc,
  PlayArtReference,
} from "./types";
import type { ManualSupplementReport } from "./video/process-supplements";
import type {
  CardPosition,
  CardSourceType,
  ExtractedVideoCard,
  VideoPrepareReport,
  VideoSideOfBall,
} from "./video/types";

export type VideoStagingNamespace = {
  stagingRoot: string;
  gameVersion: string;
  side: VideoSideOfBall;
  playbookSlug: string;
  playbookDisplayName: string;
  seedSlug: string;
};

export type VideoStagingCropProvenance = {
  cropId: string;
  mediaPath: string;
  formation: string;
  /** Catalog-validated OCR play candidate (diagnostic only). */
  ocrPlayCandidate: string;
  ocrFormationCandidate: string;
  sourceType: CardSourceType;
  sourceFile: string;
  sourceTimestamp: string | null;
  timestampSec: number | null;
  screenIndex: number | null;
  cardPosition: CardPosition;
  sourceCardPath: string;
  artCropPath: string;
  artCropSha256: string;
};

export type VideoStagingBridgeReport = {
  namespace: VideoStagingNamespace;
  expectedIdentities: number;
  stagingIdentities: number;
  normalizedInputs: number;
  uniqueFormationPlayCandidates: number;
  duplicatesCollapsed: number;
  missingInputs: Array<{ formation: string; play: string }>;
  duplicateCanonicalInputs: Array<{ formation: string; play: string; count: number }>;
  duplicateCropFingerprints: Array<{
    sha256: string;
    identities: Array<{ formation: string; play: string }>;
  }>;
  invalidSourcePaths: string[];
  assetCompatibility: {
    sampleSourceCard: { width: number; height: number; format: string } | null;
    sampleArtCrop: { width: number; height: number; format: string } | null;
    expectedSourceCard: { width: number; height: number };
    notes: string[];
  };
  formationCounts: Array<{
    formation: string;
    expected: number;
    inputs: number;
  }>;
  provenance: VideoStagingCropProvenance[];
};

export type AdaptedVideoStaging = {
  extracted: ExtractedPlayArtDoc & {
    structure: {
      embeddedImages: number;
      formationHeaders: number;
      playStrips: number;
      generatedPlayCards: number;
      expectedFormations: number;
      expectedPlays: number;
      mappedFormations: number;
      mappedPlays: number;
      classificationMethod: string;
    };
    effectiveReference: PlayArtReference;
  };
  bridgeReport: VideoStagingBridgeReport;
  /** cropId → OCR play candidate for post-match comparison. */
  ocrPlayByCropId: Map<string, string>;
};

const OWNED_CARD_WIDTH = 626;
const OWNED_CARD_HEIGHT = 355;

function cardIndexFromPosition(position: CardPosition): number {
  if (position === "left") return 0;
  if (position === "middle") return 1;
  return 2;
}

/**
 * Resolve `video-staging/{game}/{side}/{slug}/` → exact playbook namespace.
 * Fail-closed — never guess across game/side/playbook.
 */
export function resolveVideoStagingNamespace(stagingPath: string): VideoStagingNamespace {
  const stagingRoot = resolve(stagingPath);
  const parts = stagingRoot.split(/[/\\]/).filter(Boolean);
  const idx = parts.findIndex((p) => p === "video-staging");
  if (idx < 0 || idx + 3 >= parts.length) {
    throw new Error(
      `VIDEO STAGING PATH INVALID: Path must include video-staging/{game}/{side}/{playbook-slug}/.\n` +
        `Got: ${stagingPath}`,
    );
  }
  const gameVersion = parts[idx + 1]?.toLowerCase() ?? "";
  const sideRaw = parts[idx + 2]?.toLowerCase() ?? "";
  const playbookSlug = parts[idx + 3]?.toLowerCase() ?? "";

  if (!gameVersion.startsWith("cfb")) {
    throw new Error(
      `VIDEO STAGING PATH INVALID: Expected game version under video-staging/ (e.g. cfb27).\n` +
        `Got: ${gameVersion}`,
    );
  }
  if (sideRaw !== "offense" && sideRaw !== "defense") {
    throw new Error(
      `VIDEO STAGING PATH INVALID: Expected offense|defense, got "${sideRaw}".`,
    );
  }
  const side = sideRaw as VideoSideOfBall;
  if (!playbookSlug || playbookSlug === "video-staging") {
    throw new Error(`VIDEO STAGING PATH INVALID: Missing playbook slug in ${stagingPath}`);
  }

  // Reject deeper nesting that would make slug ambiguous.
  if (parts.length > idx + 4) {
    throw new Error(
      `VIDEO STAGING PATH INVALID: Expected exactly video-staging/{game}/{side}/{slug}/.\n` +
        `Got extra segments after slug: ${parts.slice(idx + 4).join("/")}`,
    );
  }

  const seedSlug = teamSlugToSeedSlug(playbookSlug, gameVersion);
  const seedPath = join(SEED_PLAYBOOKS_DIR, `${seedSlug}.ts`);
  if (!existsSync(seedPath)) {
    throw new Error(
      `No ${gameVersion.toUpperCase()} ${side} playbook resolved for staging slug:\n` +
        `  ${playbookSlug}\n` +
        `Expected seed: lib/seed/playbooks/${seedSlug}.ts`,
    );
  }

  const catalog = loadPlaybookCatalog(SEED_PLAYBOOKS_DIR);
  const matches = catalog.filter(
    (e) =>
      e.seedSlug === seedSlug &&
      e.gameVersion === gameVersion &&
      e.sideOfBall === side,
  );
  if (matches.length === 0) {
    throw new Error(
      `Seed ${seedSlug}.ts exists but does not match staging namespace ` +
        `${gameVersion}/${side}/${playbookSlug}.`,
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `Ambiguous playbook for staging ${playbookSlug}: ` +
        matches.map((m) => m.team).join(", "),
    );
  }

  return {
    stagingRoot,
    gameVersion,
    side,
    playbookSlug,
    playbookDisplayName: matches[0].team,
    seedSlug,
  };
}

function identityKey(formation: string, play: string): string {
  return `${formation.trim()}\0${normalizePlayName(play)}`;
}

function loadCombinedValidatedCards(
  ns: VideoStagingNamespace,
): {
  cards: ExtractedVideoCard[];
  stagingIdentities: number;
  expectedFromReport: number;
  source: "supplement-report" | "report";
} {
  const supplementPath = join(ns.stagingRoot, "supplement-report.json");
  const reportPath = join(ns.stagingRoot, "report.json");
  const combinedCoveragePath = join(ns.stagingRoot, "combined-coverage.json");

  if (existsSync(supplementPath)) {
    const report = JSON.parse(readFileSync(supplementPath, "utf8")) as ManualSupplementReport;
    if (
      report.namespace.gameVersion !== ns.gameVersion ||
      report.namespace.side !== ns.side ||
      report.namespace.playbookSlug !== ns.playbookSlug
    ) {
      throw new Error(
        `Supplement report namespace mismatch.\n` +
          `Staging path: ${ns.gameVersion}/${ns.side}/${ns.playbookSlug}\n` +
          `Report: ${report.namespace.gameVersion}/${report.namespace.side}/${report.namespace.playbookSlug}`,
      );
    }
    const expected = report.combinedCoverage.expected;
    const detected = report.combinedCoverage.detected;
    if (detected !== expected) {
      throw new Error(
        `Staging coverage incomplete: ${detected} / ${expected} catalog identities.\n` +
          `Combined validated staging must be complete before ingest bridge.`,
      );
    }
    if (existsSync(combinedCoveragePath)) {
      const sidecar = JSON.parse(readFileSync(combinedCoveragePath, "utf8")) as {
        combined?: { detected?: number; expected?: number };
      };
      if (
        sidecar.combined?.detected != null &&
        sidecar.combined?.expected != null &&
        (sidecar.combined.detected !== detected || sidecar.combined.expected !== expected)
      ) {
        throw new Error(
          `combined-coverage.json disagrees with supplement-report.json ` +
            `(${sidecar.combined.detected}/${sidecar.combined.expected} vs ${detected}/${expected}).`,
        );
      }
    }
    return {
      cards: report.combinedCards ?? [],
      stagingIdentities: detected,
      expectedFromReport: expected,
      source: "supplement-report",
    };
  }

  if (!existsSync(reportPath)) {
    throw new Error(
      `No validated staging report found under ${ns.stagingRoot}.\n` +
        `Expected supplement-report.json (combined) or report.json.`,
    );
  }

  const report = JSON.parse(readFileSync(reportPath, "utf8")) as VideoPrepareReport;
  if (
    report.gameVersion !== ns.gameVersion ||
    report.side !== ns.side ||
    report.playbookSlug !== ns.playbookSlug
  ) {
    throw new Error(
      `Video report namespace mismatch.\n` +
        `Staging path: ${ns.gameVersion}/${ns.side}/${ns.playbookSlug}\n` +
        `Report: ${report.gameVersion}/${report.side}/${report.playbookSlug}`,
    );
  }
  const expected = report.catalog.expectedPlayCount;
  const detected = report.catalog.detectedUniquePlays;
  if (detected !== expected) {
    throw new Error(
      `Staging coverage incomplete: ${detected} / ${expected} catalog identities.\n` +
        `Run manual supplements or re-capture before ingest bridge.`,
    );
  }
  return {
    cards: report.cards ?? [],
    stagingIdentities: detected,
    expectedFromReport: expected,
    source: "report",
  };
}

function isAcceptedValidatedCard(card: ExtractedVideoCard): boolean {
  if (card.emptySlot || card.screenRejected) return false;
  if (!card.catalogValid) return false;
  if (!card.matchedFormation?.trim() || !card.matchedPlay?.trim()) return false;
  if (card.supplementClass && card.supplementClass !== "NEW_MISSING_PLAY") return false;
  return true;
}

/**
 * Prefer video over supplement; then earlier timestamp; then left→right card slot.
 * Deterministic — never uses screen order as play identity.
 */
function pickPreferredCard(a: ExtractedVideoCard, b: ExtractedVideoCard): ExtractedVideoCard {
  const aType = a.sourceType ?? "video";
  const bType = b.sourceType ?? "video";
  if (aType !== bType) {
    return aType === "video" ? a : b;
  }
  const aTs = a.timestampSec ?? Number.POSITIVE_INFINITY;
  const bTs = b.timestampSec ?? Number.POSITIVE_INFINITY;
  if (aTs !== bTs) return aTs < bTs ? a : b;
  const order = { left: 0, middle: 1, right: 2 } as const;
  return order[a.cardPosition] <= order[b.cardPosition] ? a : b;
}

function jpegMeta(
  buffer: Buffer,
): { width: number; height: number; format: string } | null {
  // Minimal SOF0/SOF2 scan for JPEG dimensions (avoid sharp dependency in structural gate).
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return { width: 0, height: 0, format: "unknown" };
  }
  let i = 2;
  while (i + 9 < buffer.length) {
    if (buffer[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buffer[i + 1];
    if (marker === 0xd9 || marker === 0xda) break;
    const len = (buffer[i + 2] << 8) | buffer[i + 3];
    if (len < 2) break;
    // SOF0 / SOF2
    if (marker === 0xc0 || marker === 0xc2) {
      const height = (buffer[i + 5] << 8) | buffer[i + 6];
      const width = (buffer[i + 7] << 8) | buffer[i + 8];
      return { width, height, format: "jpeg" };
    }
    i += 2 + len;
  }
  return { width: 0, height: 0, format: "jpeg" };
}

/**
 * Convert validated Go Go (or any) video-staging into DOCX-equivalent ExtractedPlayArtDoc.
 * Fail-closed on coverage gaps, duplicates, missing paths, or namespace ambiguity.
 */
export function adaptVideoStagingToExtracted(
  stagingPath: string,
  reference: PlayArtReference,
): AdaptedVideoStaging {
  const ns = resolveVideoStagingNamespace(stagingPath);

  if (
    reference.gameVersion.toLowerCase() !== ns.gameVersion ||
    reference.sideOfBall.toLowerCase() !== ns.side ||
    reference.playbook.trim() !== ns.playbookDisplayName
  ) {
    throw new Error(
      `Reference/playbook namespace mismatch.\n` +
        `Staging: ${ns.gameVersion} / ${ns.side} / ${ns.playbookDisplayName}\n` +
        `Reference: ${reference.gameVersion} / ${reference.sideOfBall} / ${reference.playbook}`,
    );
  }

  const expectedIdentities = reference.formations.reduce((n, f) => n + f.plays.length, 0);
  const loaded = loadCombinedValidatedCards(ns);

  if (loaded.expectedFromReport !== expectedIdentities) {
    throw new Error(
      `Catalog expected play count mismatch: staging report ${loaded.expectedFromReport} ` +
        `vs reference ${expectedIdentities}.`,
    );
  }
  if (loaded.stagingIdentities !== expectedIdentities) {
    throw new Error(
      `Staging identities ${loaded.stagingIdentities} / ${expectedIdentities} — not ready for bridge.`,
    );
  }

  const accepted = loaded.cards.filter(isAcceptedValidatedCard);
  const byIdentity = new Map<string, ExtractedVideoCard>();
  const duplicateCounts = new Map<string, number>();

  for (const card of accepted) {
    const key = identityKey(card.matchedFormation!, card.matchedPlay!);
    // Guard: card namespace must match staging
    if (
      card.gameVersion !== ns.gameVersion ||
      card.side !== ns.side ||
      card.playbookSlug !== ns.playbookSlug
    ) {
      throw new Error(
        `Card namespace drift: ${card.gameVersion}/${card.side}/${card.playbookSlug} ` +
          `≠ staging ${ns.gameVersion}/${ns.side}/${ns.playbookSlug}`,
      );
    }
    duplicateCounts.set(key, (duplicateCounts.get(key) ?? 0) + 1);
    const existing = byIdentity.get(key);
    byIdentity.set(key, existing ? pickPreferredCard(existing, card) : card);
  }

  const duplicateCanonicalInputs = [...duplicateCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key, count]) => {
      const [formation, playNorm] = key.split("\0");
      return { formation, play: playNorm, count };
    });

  const expectedKeys = new Set<string>();
  for (const f of reference.formations) {
    for (const play of f.plays) {
      expectedKeys.add(identityKey(f.name, play));
    }
  }

  const missingInputs: Array<{ formation: string; play: string }> = [];
  for (const key of expectedKeys) {
    if (!byIdentity.has(key)) {
      const [formation, play] = key.split("\0");
      missingInputs.push({ formation, play });
    }
  }

  const unexpected = [...byIdentity.keys()].filter((k) => !expectedKeys.has(k));
  if (unexpected.length > 0) {
    throw new Error(
      `Unexpected catalog identities in staging (${unexpected.length}). ` +
        `Example: ${unexpected[0]?.replace("\0", " / ")}`,
    );
  }

  const invalidSourcePaths: string[] = [];
  const fingerprintToIdentities = new Map<string, Array<{ formation: string; play: string }>>();

  for (const [key, card] of byIdentity) {
    if (!existsSync(card.sourceCardPath)) {
      invalidSourcePaths.push(card.sourceCardPath);
    }
    if (!existsSync(card.artCropPath)) {
      invalidSourcePaths.push(card.artCropPath);
    }
    if (existsSync(card.artCropPath)) {
      const sha = createHash("sha256").update(readFileSync(card.artCropPath)).digest("hex");
      const [formation, play] = key.split("\0");
      const list = fingerprintToIdentities.get(sha) ?? [];
      list.push({ formation, play });
      fingerprintToIdentities.set(sha, list);
    }
  }

  const duplicateCropFingerprints = [...fingerprintToIdentities.entries()]
    .filter(([, identities]) => identities.length > 1)
    .map(([sha256, identities]) => ({ sha256, identities }));

  if (
    missingInputs.length > 0 ||
    byIdentity.size !== expectedIdentities ||
    invalidSourcePaths.length > 0 ||
    duplicateCropFingerprints.length > 0
  ) {
    const lines = [
      "VIDEO STAGING BRIDGE STRUCTURAL GATE FAILED",
      `Expected catalog identities: ${expectedIdentities}`,
      `Normalized unique inputs: ${byIdentity.size}`,
      `Missing: ${missingInputs.length}`,
      `Invalid source paths: ${invalidSourcePaths.length}`,
      `Duplicate crop fingerprints across identities: ${duplicateCropFingerprints.length}`,
    ];
    if (missingInputs[0]) {
      lines.push(`First missing: ${missingInputs[0].formation} / ${missingInputs[0].play}`);
    }
    if (invalidSourcePaths[0]) {
      lines.push(`First invalid path: ${invalidSourcePaths[0]}`);
    }
    throw new Error(lines.join("\n"));
  }

  // Build ExtractedPlayArtDoc in reference formation order (same contract as DOCX extract).
  const blocks: ClassifiedDocxBlock[] = [];
  const mediaFiles = new Map<string, Buffer>();
  const provenance: VideoStagingCropProvenance[] = [];
  const ocrPlayByCropId = new Map<string, string>();
  const formationCounts: VideoStagingBridgeReport["formationCounts"] = [];
  let blockIndex = 0;
  let sourceIndex = 0;
  let sampleSource: Buffer | null = null;
  let sampleArt: Buffer | null = null;

  for (const refFormation of reference.formations) {
    const formationCards: ExtractedVideoCard[] = [];
    for (const play of refFormation.plays) {
      const card = byIdentity.get(identityKey(refFormation.name, play));
      if (!card) {
        throw new Error(
          `Internal bridge error: missing ${refFormation.name} / ${play} after structural gate`,
        );
      }
      formationCards.push(card);
    }

    if (formationCards.length !== refFormation.plays.length) {
      throw new Error(
        `Formation "${refFormation.name}": expected ${refFormation.plays.length} inputs, ` +
          `got ${formationCards.length}`,
      );
    }

    blocks.push({ kind: "formation_header", index: blockIndex });
    blockIndex += 1;

    for (const card of formationCards) {
      const cardIndex = cardIndexFromPosition(card.cardPosition);
      const mediaPath = `crop://${sourceIndex}/${cardIndex}.jpg`;
      const buffer = readFileSync(card.sourceCardPath);
      mediaFiles.set(mediaPath, buffer);
      if (!sampleSource) sampleSource = buffer;
      if (!sampleArt && existsSync(card.artCropPath)) {
        sampleArt = readFileSync(card.artCropPath);
      }

      const cropId = `source-${sourceIndex}:${card.cardPosition}`;
      const artSha = createHash("sha256")
        .update(readFileSync(card.artCropPath))
        .digest("hex");

      const prov: VideoStagingCropProvenance = {
        cropId,
        mediaPath,
        formation: refFormation.name,
        ocrPlayCandidate: card.matchedPlay!,
        ocrFormationCandidate: card.matchedFormation!,
        sourceType: card.sourceType ?? "video",
        sourceFile:
          card.sourceFile ??
          card.videoFile ??
          basename(card.sourceCardPath),
        sourceTimestamp: card.timestamp ?? null,
        timestampSec: card.timestampSec ?? null,
        screenIndex: card.screenIndex ?? null,
        cardPosition: card.cardPosition,
        sourceCardPath: card.sourceCardPath,
        artCropPath: card.artCropPath,
        artCropSha256: artSha,
      };
      provenance.push(prov);
      ocrPlayByCropId.set(cropId, card.matchedPlay!);

      blocks.push({
        kind: "play_card",
        index: blockIndex,
        mediaPath,
        extension: "jpg",
      });
      blockIndex += 1;
      sourceIndex += 1;
    }

    formationCounts.push({
      formation: refFormation.name,
      expected: refFormation.plays.length,
      inputs: formationCards.length,
    });
  }

  const sourceMeta = sampleSource ? jpegMeta(sampleSource) : null;
  const artMeta = sampleArt ? jpegMeta(sampleArt) : null;
  const compatNotes: string[] = [
    "Matcher consumes full source cards (626×355 JPEG) — same as DOCX owned crops.",
    "Art crops are diagnostic provenance; normalizeDiagramRaster crops the diagram region from the source card.",
  ];
  if (
    sourceMeta &&
    (sourceMeta.width !== OWNED_CARD_WIDTH || sourceMeta.height !== OWNED_CARD_HEIGHT)
  ) {
    throw new Error(
      `Matcher-incompatible source card dimensions: ${sourceMeta.width}×${sourceMeta.height} ` +
        `(expected ${OWNED_CARD_WIDTH}×${OWNED_CARD_HEIGHT})`,
    );
  }

  const extracted: AdaptedVideoStaging["extracted"] = {
    docxPath: `video-staging://${ns.gameVersion}/${ns.side}/${ns.playbookSlug}`,
    blocks,
    mediaFiles,
    structure: {
      embeddedImages: provenance.length,
      formationHeaders: reference.formations.length,
      playStrips: Math.ceil(provenance.length / 3),
      generatedPlayCards: provenance.length,
      expectedFormations: reference.formations.length,
      expectedPlays: expectedIdentities,
      mappedFormations: reference.formations.length,
      mappedPlays: provenance.length,
      classificationMethod:
        `video-staging adapter (${loaded.source}): catalog-valid unique OCR identities → ` +
        `ExtractedPlayArtDoc; production identity = OCR/catalog; visual is verification-only`,
    },
    effectiveReference: reference,
  };

  const bridgeReport: VideoStagingBridgeReport = {
    namespace: ns,
    expectedIdentities,
    stagingIdentities: loaded.stagingIdentities,
    normalizedInputs: provenance.length,
    uniqueFormationPlayCandidates: byIdentity.size,
    duplicatesCollapsed: accepted.length - byIdentity.size,
    missingInputs,
    duplicateCanonicalInputs,
    duplicateCropFingerprints,
    invalidSourcePaths,
    assetCompatibility: {
      sampleSourceCard: sourceMeta,
      sampleArtCrop: artMeta,
      expectedSourceCard: { width: OWNED_CARD_WIDTH, height: OWNED_CARD_HEIGHT },
      notes: compatNotes,
    },
    formationCounts,
    provenance,
  };

  return { extracted, bridgeReport, ocrPlayByCropId };
}

export function printVideoStagingBridgeReport(report: VideoStagingBridgeReport): void {
  const ns = report.namespace;
  console.log("");
  console.log("VIDEO STAGING → MATCHER BRIDGE");
  console.log(
    `Namespace: ${ns.gameVersion.toUpperCase()} / ${ns.side === "offense" ? "Offense" : "Defense"} / ${ns.playbookDisplayName}`,
  );
  console.log(`Staging identities: ${report.stagingIdentities} / ${report.expectedIdentities}`);
  console.log(
    `Normalized matcher inputs: ${report.normalizedInputs} / ${report.expectedIdentities}`,
  );
  console.log(`Duplicates collapsed (same identity): ${report.duplicatesCollapsed}`);
  console.log(`Missing inputs: ${report.missingInputs.length}`);
  console.log(
    `Duplicate crop fingerprints: ${report.duplicateCropFingerprints.length}`,
  );
  if (report.assetCompatibility.sampleSourceCard) {
    const s = report.assetCompatibility.sampleSourceCard;
    console.log(`Source card sample: ${s.width}×${s.height} ${s.format}`);
  }
  if (report.assetCompatibility.sampleArtCrop) {
    const a = report.assetCompatibility.sampleArtCrop;
    console.log(`Art crop sample: ${a.width}×${a.height} ${a.format}`);
  }
  console.log("");
}
