/**
 * OBS / video-staging optional visual diagnostic (not identity, not publish gate).
 *
 * Production identity for OBS sources is game-capture OCR → exact catalog resolution.
 * The game-captured art on that labeled card is the art for that identity.
 *
 * External imagery (cfb.fan / DOCX / etc.) must not overrule OBS identity or block publish.
 * This module is informational only when enabled.
 */
import { normalizePlayName } from "../../lib/utils";
import type { TeamPlaybookSeed } from "../../lib/seed/types";
import type { VideoStagingCropProvenance } from "./adapt-video-staging";
import {
  formationTypesFromSeed,
  MATCH_THRESHOLDS_V3,
} from "./match-play-art";
import {
  extractColorInkMask,
  normalizeDiagramRaster,
  prepareReferenceSetV3,
  registerRasterV3,
  scaleRaster,
  scoreAlignedOwnedAgainstReferenceV3,
  translateRaster,
} from "./image-similarity-v3";
import {
  createReferenceDownloadStats,
  fetchReferenceImagesForFormation,
  logReferenceDownloadSummary,
  type ReferenceDownloadStats,
} from "./reference-image";
import type { ExtractedPlayArtDoc, MappedPlayArt, PlayArtReference } from "./types";

export type ObsVisualVerdict =
  | "VISUAL_AGREEMENT"
  | "VISUAL_DISAGREEMENT"
  | "VISUAL_UNAVAILABLE";

export type ObsVisualVerificationRow = {
  formation: string;
  playName: string;
  cropId: string;
  mediaPath: string;
  sourceCardPath: string;
  artCropPath: string;
  sourceType: string;
  sourceFile: string;
  sourceTimestamp: string | null;
  verdict: ObsVisualVerdict;
  ocrScore: number | null;
  visualBestPlay: string | null;
  visualBestScore: number | null;
  marginVsOcr: number | null;
  reason: string;
};

export type ObsVisualVerificationReport = {
  playbook: string;
  gameVersion: string;
  sideOfBall: string;
  identityAuthority: "obs-game-capture-ocr-catalog";
  visualRole: "informational-diagnostic-only";
  affectsPublish: false;
  materialDisagreementMargin: number;
  expectedIdentities: number;
  visualAgreement: number;
  visualDisagreement: number;
  visualUnavailable: number;
  rows: ObsVisualVerificationRow[];
  disagreements: ObsVisualVerificationRow[];
  unavailable: ObsVisualVerificationRow[];
};

/** Margin used only for diagnostic labeling — does not affect publish. */
export const OBS_MATERIAL_DISAGREEMENT_MARGIN = MATCH_THRESHOLDS_V3.passMinMargin;

/**
 * Map validated OBS crops to publish mappings using OCR/catalog identity only.
 * Visual matcher ranking is not consulted.
 */
export function mapObsCatalogIdentity(input: {
  reference: PlayArtReference;
  provenance: VideoStagingCropProvenance[];
}): MappedPlayArt[] {
  const byIdentity = new Map<string, VideoStagingCropProvenance>();
  for (const row of input.provenance) {
    const key = `${row.formation.trim()}\0${normalizePlayName(row.ocrPlayCandidate)}`;
    if (byIdentity.has(key)) {
      throw new Error(
        `Duplicate OBS identity in provenance: ${row.formation} / ${row.ocrPlayCandidate}`,
      );
    }
    byIdentity.set(key, row);
  }

  const mapped: MappedPlayArt[] = [];
  for (const formation of input.reference.formations) {
    for (const play of formation.plays) {
      const key = `${formation.name.trim()}\0${normalizePlayName(play)}`;
      const prov = byIdentity.get(key);
      if (!prov) {
        throw new Error(
          `Missing OBS catalog identity mapping for ${formation.name} / ${play}`,
        );
      }
      mapped.push({
        formation: formation.name,
        playName: play.trim(),
        mediaPath: prov.mediaPath,
        extension: "jpg",
        assetId: "",
        assetPath: "",
        blockIndex: -1,
      });
    }
  }

  if (mapped.length !== input.provenance.length) {
    throw new Error(
      `OBS identity map size mismatch: mapped ${mapped.length} vs provenance ${input.provenance.length}`,
    );
  }
  return mapped;
}

/** Attach blockIndex from ExtractedPlayArtDoc media paths. */
export function attachObsBlockIndexes(
  mapped: MappedPlayArt[],
  extracted: ExtractedPlayArtDoc,
): MappedPlayArt[] {
  const blockByMedia = new Map<string, number>();
  for (const block of extracted.blocks) {
    if (block.kind === "play_card") {
      blockByMedia.set(block.mediaPath, block.index);
    }
  }
  return mapped.map((row) => ({
    ...row,
    blockIndex: blockByMedia.get(row.mediaPath) ?? row.blockIndex,
  }));
}

/**
 * Optional engineering diagnostic: compare OBS crops to external reference imagery.
 * Never affects canonical identity or publish eligibility.
 */
export async function verifyObsVisualIdentity(input: {
  reference: PlayArtReference;
  seed: TeamPlaybookSeed;
  extracted: ExtractedPlayArtDoc;
  provenance: VideoStagingCropProvenance[];
  mapped: MappedPlayArt[];
  referenceDownloadStats?: ReferenceDownloadStats;
}): Promise<ObsVisualVerificationReport> {
  const formationTypes = formationTypesFromSeed(input.seed);
  const stats = input.referenceDownloadStats ?? createReferenceDownloadStats();
  const provByMedia = new Map(input.provenance.map((p) => [p.mediaPath, p] as const));
  const rows: ObsVisualVerificationRow[] = [];

  const mappedByFormation = new Map<string, MappedPlayArt[]>();
  for (const row of input.mapped) {
    const list = mappedByFormation.get(row.formation) ?? [];
    list.push(row);
    mappedByFormation.set(row.formation, list);
  }

  for (const refFormation of input.reference.formations) {
    const formationName = refFormation.name;
    const formationType = formationTypes.get(formationName);
    const formationMapped = mappedByFormation.get(formationName) ?? [];

    if (!formationType) {
      for (const row of formationMapped) {
        const prov = provByMedia.get(row.mediaPath);
        rows.push(
          unavailableRow(row, prov, "Missing formationType in seed — visual diagnostic unavailable"),
        );
      }
      continue;
    }

    const urlPlayNames = refFormation.plays.map((p) => p.trim());
    const playNames = urlPlayNames.map((p) => normalizePlayName(p));

    const fetched = await fetchReferenceImagesForFormation(
      input.reference,
      formationName,
      formationType,
      urlPlayNames,
      stats,
    );

    if (fetched.images.length === 0) {
      for (const row of formationMapped) {
        const prov = provByMedia.get(row.mediaPath);
        rows.push(
          unavailableRow(
            row,
            prov,
            "No external reference images for formation — diagnostic only",
          ),
        );
      }
      continue;
    }

    const imageByNorm = new Map(
      fetched.images.map((image) => [normalizePlayName(image.playName), image] as const),
    );
    const orderedImages = urlPlayNames.map((name) => imageByNorm.get(normalizePlayName(name)) ?? null);
    const availablePlayIndices = orderedImages
      .map((image, index) => (image ? index : -1))
      .filter((index) => index >= 0);

    const referenceRasters = [];
    const referenceBuffers = [];
    for (const playIndex of availablePlayIndices) {
      const image = orderedImages[playIndex]!;
      referenceBuffers.push(image.buffer);
      referenceRasters.push(await normalizeDiagramRaster(image.buffer));
    }
    const { baseline, varianceWeight, prepared } = await prepareReferenceSetV3(
      referenceRasters,
      referenceBuffers,
    );
    const preparedIndexByPlayIndex = new Map<number, number>();
    availablePlayIndices.forEach((playIndex, preparedIndex) => {
      preparedIndexByPlayIndex.set(playIndex, preparedIndex);
    });

    for (const row of formationMapped) {
      const prov = provByMedia.get(row.mediaPath);
      const ocrNorm = normalizePlayName(row.playName);
      const ocrPlayIndex = playNames.findIndex((p) => p === ocrNorm);

      const base = {
        formation: formationName,
        playName: row.playName,
        cropId: prov?.cropId ?? row.mediaPath,
        mediaPath: row.mediaPath,
        sourceCardPath: prov?.sourceCardPath ?? "",
        artCropPath: prov?.artCropPath ?? "",
        sourceType: prov?.sourceType ?? "video",
        sourceFile: prov?.sourceFile ?? "",
        sourceTimestamp: prov?.sourceTimestamp ?? null,
      };

      if (ocrPlayIndex < 0) {
        rows.push({
          ...base,
          verdict: "VISUAL_UNAVAILABLE",
          ocrScore: null,
          visualBestPlay: null,
          visualBestScore: null,
          marginVsOcr: null,
          reason: "OCR play not found in reference formation play list",
        });
        continue;
      }

      if (!preparedIndexByPlayIndex.has(ocrPlayIndex)) {
        rows.push({
          ...base,
          verdict: "VISUAL_UNAVAILABLE",
          ocrScore: null,
          visualBestPlay: null,
          visualBestScore: null,
          marginVsOcr: null,
          reason: `No external reference image for "${row.playName}" — diagnostic only`,
        });
        continue;
      }

      const buffer = input.extracted.mediaFiles.get(row.mediaPath);
      if (!buffer) {
        rows.push({
          ...base,
          verdict: "VISUAL_UNAVAILABLE",
          ocrScore: null,
          visualBestPlay: null,
          visualBestScore: null,
          marginVsOcr: null,
          reason: "Missing source-card buffer for visual diagnostic",
        });
        continue;
      }

      const ownedRaster = await normalizeDiagramRaster(buffer);
      const ownedColorInk = await extractColorInkMask(buffer);
      const { aligned, registration } = registerRasterV3(ownedRaster, baseline);
      const colorAligned = translateRaster(
        registration.scale === 1
          ? ownedColorInk
          : scaleRaster(ownedColorInk, registration.scale),
        registration.translationX,
        registration.translationY,
      );

      const scores: number[] = playNames.map(() => 0);
      let anyScored = false;
      for (const playIndex of availablePlayIndices) {
        const preparedIndex = preparedIndexByPlayIndex.get(playIndex);
        if (preparedIndex === undefined) continue;
        const scored = scoreAlignedOwnedAgainstReferenceV3(
          aligned,
          colorAligned,
          prepared[preparedIndex],
          baseline,
          varianceWeight,
          registration,
        );
        scores[playIndex] = scored.composite;
        anyScored = true;
      }

      if (!anyScored) {
        rows.push({
          ...base,
          verdict: "VISUAL_UNAVAILABLE",
          ocrScore: null,
          visualBestPlay: null,
          visualBestScore: null,
          marginVsOcr: null,
          reason: "Visual scoring produced no usable reference comparisons",
        });
        continue;
      }

      const ocrScore = scores[ocrPlayIndex] ?? 0;
      let bestIndex = 0;
      let bestScore = scores[0] ?? Number.NEGATIVE_INFINITY;
      for (let j = 1; j < scores.length; j += 1) {
        if ((scores[j] ?? Number.NEGATIVE_INFINITY) > bestScore) {
          bestScore = scores[j] ?? 0;
          bestIndex = j;
        }
      }
      const visualBestPlay = urlPlayNames[bestIndex] ?? playNames[bestIndex] ?? null;
      const marginVsOcr = bestScore - ocrScore;
      const ocrIsLocalBest = bestIndex === ocrPlayIndex;

      if (ocrIsLocalBest) {
        rows.push({
          ...base,
          verdict: "VISUAL_AGREEMENT",
          ocrScore,
          visualBestPlay,
          visualBestScore: bestScore,
          marginVsOcr: 0,
          reason: "External visual local-best agrees with game-capture identity (informational)",
        });
        continue;
      }

      if (marginVsOcr >= OBS_MATERIAL_DISAGREEMENT_MARGIN) {
        rows.push({
          ...base,
          verdict: "VISUAL_DISAGREEMENT",
          ocrScore,
          visualBestPlay,
          visualBestScore: bestScore,
          marginVsOcr,
          reason:
            `External visual prefers "${visualBestPlay}" over game-capture "${row.playName}" ` +
            `(margin ${marginVsOcr.toFixed(3)}; informational only — does not block publish)`,
        });
        continue;
      }

      rows.push({
        ...base,
        verdict: "VISUAL_AGREEMENT",
        ocrScore,
        visualBestPlay,
        visualBestScore: bestScore,
        marginVsOcr,
        reason:
          `External visual local-best differs slightly from game-capture but margin ` +
          `${marginVsOcr.toFixed(3)} < ${OBS_MATERIAL_DISAGREEMENT_MARGIN} (informational)`,
      });
    }
  }

  logReferenceDownloadSummary(stats);

  const visualAgreement = rows.filter((r) => r.verdict === "VISUAL_AGREEMENT").length;
  const visualDisagreement = rows.filter((r) => r.verdict === "VISUAL_DISAGREEMENT").length;
  const visualUnavailable = rows.filter((r) => r.verdict === "VISUAL_UNAVAILABLE").length;

  return {
    playbook: input.reference.playbook,
    gameVersion: input.reference.gameVersion,
    sideOfBall: input.reference.sideOfBall,
    identityAuthority: "obs-game-capture-ocr-catalog",
    visualRole: "informational-diagnostic-only",
    affectsPublish: false,
    materialDisagreementMargin: OBS_MATERIAL_DISAGREEMENT_MARGIN,
    expectedIdentities: input.mapped.length,
    visualAgreement,
    visualDisagreement,
    visualUnavailable,
    rows,
    disagreements: rows.filter((r) => r.verdict === "VISUAL_DISAGREEMENT"),
    unavailable: rows.filter((r) => r.verdict === "VISUAL_UNAVAILABLE"),
  };
}

function unavailableRow(
  row: MappedPlayArt,
  prov: VideoStagingCropProvenance | undefined,
  reason: string,
): ObsVisualVerificationRow {
  return {
    formation: row.formation,
    playName: row.playName,
    cropId: prov?.cropId ?? row.mediaPath,
    mediaPath: row.mediaPath,
    sourceCardPath: prov?.sourceCardPath ?? "",
    artCropPath: prov?.artCropPath ?? "",
    sourceType: prov?.sourceType ?? "video",
    sourceFile: prov?.sourceFile ?? "",
    sourceTimestamp: prov?.sourceTimestamp ?? null,
    verdict: "VISUAL_UNAVAILABLE",
    ocrScore: null,
    visualBestPlay: null,
    visualBestScore: null,
    marginVsOcr: null,
    reason,
  };
}

export function printObsVisualVerificationReport(report: ObsVisualVerificationReport): void {
  console.log("");
  console.log(`${report.playbook.toUpperCase()} OBS VISUAL DIAGNOSTIC (informational only)`);
  console.log("Game capture is source of truth — external visual does not affect publish.");
  console.log(`VISUAL_AGREEMENT: ${report.visualAgreement}`);
  console.log(`VISUAL_DISAGREEMENT: ${report.visualDisagreement} (informational)`);
  console.log(`VISUAL_UNAVAILABLE: ${report.visualUnavailable} (informational)`);
  console.log("Does not block publish. Does not use play-art:review.");
  console.log("");
}

export type ObsPublishGateInput = {
  namespaceOk: boolean;
  expectedIdentities: number;
  normalizedInputs: number;
  uniqueIdentities: number;
  duplicates: number;
  unresolvedOcr: number;
  catalogMismatches: number;
  missingSourceCards: number;
  missingArtCrops: number;
  structuralValidationPass: boolean;
};

/** OBS publish gate — game-capture identity + structural checks only (no visual). */
export function evaluateObsPublishGate(input: ObsPublishGateInput): {
  ready: boolean;
  failures: string[];
} {
  const failures: string[] = [];
  if (!input.namespaceOk) failures.push("Namespace does not resolve exactly");
  if (input.normalizedInputs !== input.expectedIdentities) {
    failures.push(
      `Normalized inputs ${input.normalizedInputs} ≠ expected ${input.expectedIdentities}`,
    );
  }
  if (input.uniqueIdentities !== input.expectedIdentities) {
    failures.push(
      `Unique identities ${input.uniqueIdentities} ≠ expected ${input.expectedIdentities}`,
    );
  }
  if (input.duplicates !== 0) failures.push(`Duplicates: ${input.duplicates}`);
  if (input.unresolvedOcr !== 0) failures.push(`Unresolved OCR: ${input.unresolvedOcr}`);
  if (input.catalogMismatches !== 0) {
    failures.push(`Catalog mismatches: ${input.catalogMismatches}`);
  }
  if (input.missingSourceCards !== 0) {
    failures.push(`Missing source cards: ${input.missingSourceCards}`);
  }
  if (input.missingArtCrops !== 0) {
    failures.push(`Missing production art crops: ${input.missingArtCrops}`);
  }
  if (!input.structuralValidationPass) failures.push("Structural validation failed");
  return { ready: failures.length === 0, failures };
}
