import { normalizePlayName } from "../../lib/utils";
import type { TeamPlaybookSeed } from "../../lib/seed/types";
import { importSeedModule } from "./build-reference";
import { hashPlayArtBytes } from "./content-hash";
import { resolveSeedSlugFromPlaybookReference } from "./source-discovery";
import {
  extractColorClassMasks,
  extractGeometryFeatures,
  extractReferenceGeometryFeatures,
  GEOMETRY_COMPOSITE_WEIGHTS,
  GEOMETRY_PASS_THRESHOLDS,
  resolveGeometryReview,
  topCandidateIndices,
  type GeometryFeatures,
} from "./image-geometry-v3";
import {
  extractColorInkMask,
  isNormalizedExactV3,
  normalizeDiagramRaster,
  prepareReferenceSetV3,
  registerRasterV3,
  scaleRaster,
  scoreAlignedOwnedAgainstReferenceV3,
  translateRaster,
  V3_COMPOSITE_WEIGHTS,
  type NormalizedRaster,
  type PairScoreV3,
} from "./image-similarity-v3";
import { mapPlayArtPositionally } from "./map-positional";
import {
  defaultOverridesPath,
  loadMatchingOverrides,
  remapOverridesByCropLocation,
  validateMatchingOverrides,
} from "./matching-overrides";
import {
  defaultOmitsPath,
  loadMatchingOmits,
} from "./matching-omits";
import {
  createReferenceDownloadStats,
  fetchReferenceImagesForFormation,
  logReferenceDownloadSummary,
  type ReferenceDownloadStats,
  type ReferenceImageResult,
} from "./reference-image";
import { loadTrustedAssetIndex, resolveTrustedHash } from "./trusted-hash";
import type {
  ExtractedPlayArtDoc,
  FormationMatchReport,
  FormationOwnedCrop,
  GeometryMatchDiagnostics,
  MappedPlayArt,
  MatchConfidenceStatus,
  MatchMethod,
  PlayArtMatchAssignment,
  PlayArtMatchingReport,
  PlayArtReference,
} from "./types";

/**
 * Matcher V3 confidence thresholds (same gates as V2 — do not loosen for metrics).
 * Assignment and confidence are separate: negative margin never auto-PASSes.
 */
export const MATCH_THRESHOLDS_V3 = {
  /** Minimum composite for automatic PASS (also needs margin + local-best + signals). */
  passMinScore: 0.78,
  /** Minimum local margin for automatic PASS. */
  passMinMargin: 0.035,
  /** Below this composite → FAIL (unless override / trusted-hash). */
  failMaxScore: 0.55,
  /** Between failMaxScore and pass gate → REVIEW. */
  reviewMinScore: 0.55,
  /** Registration quality floor for PASS. */
  registrationMinQuality: 0.62,
  /** Min of residual/edges agreement for PASS. */
  signalAgreementMin: 0.7,
} as const;

/** @deprecated Alias — V3 keeps identical confidence gates. */
export const MATCH_THRESHOLDS_V2 = MATCH_THRESHOLDS_V3;

/** @deprecated V1 thresholds retained for report comparisons only. */
export const MATCH_THRESHOLDS = {
  passHighScore: 0.92,
  passMinScore: 0.855,
  reviewMinScore: 0.835,
  passMinMargin: 0.003,
} as const;

export function seedSlugFromReference(reference: PlayArtReference): string {
  return resolveSeedSlugFromPlaybookReference(reference);
}

export function cropIdFromMediaPath(mediaPath: string): {
  cropId: string;
  sourceIndex: number;
  cardPosition: FormationOwnedCrop["cardPosition"];
} {
  const match = /^crop:\/\/(\d+)\/(\d+)\.jpg$/.exec(mediaPath);
  if (!match) {
    throw new Error(`Invalid crop media path: ${mediaPath}`);
  }
  const sourceIndex = Number(match[1]);
  const cardIndex = Number(match[2]);
  const cardPosition = cardPositionFromIndex(cardIndex);
  return {
    cropId: `source-${sourceIndex}:${cardPosition}`,
    sourceIndex,
    cardPosition,
  };
}

function cardPositionFromIndex(cardIndex: number): FormationOwnedCrop["cardPosition"] {
  if (cardIndex === 0) return "left";
  if (cardIndex === 1) return "middle";
  if (cardIndex === 2) return "right";
  throw new Error(`Invalid card index: ${cardIndex}`);
}

export function collectFormationCrops(
  reference: PlayArtReference,
  extracted: ExtractedPlayArtDoc,
): Map<string, FormationOwnedCrop[]> {
  const byFormation = new Map<string, FormationOwnedCrop[]>();
  let formationIndex = -1;
  let sourceOrder = 0;

  for (const block of extracted.blocks) {
    if (block.kind === "formation_header") {
      formationIndex += 1;
      sourceOrder = 0;
      continue;
    }

    const refFormation = reference.formations[formationIndex];
    if (!refFormation) {
      throw new Error(`Play card at block ${block.index} appears before any formation header`);
    }

    sourceOrder += 1;
    const { cropId, sourceIndex, cardPosition } = cropIdFromMediaPath(block.mediaPath);
    const crop: FormationOwnedCrop = {
      cropId,
      mediaPath: block.mediaPath,
      extension: block.extension,
      blockIndex: block.index,
      sourceIndex,
      cardPosition,
      sourceOrder,
    };
    const list = byFormation.get(refFormation.name) ?? [];
    list.push(crop);
    byFormation.set(refFormation.name, list);
  }

  return byFormation;
}

export function formationTypesFromSeed(seed: TeamPlaybookSeed): Map<string, string> {
  const map = new Map<string, string>();
  for (const formation of seed.formations) {
    map.set(formation.formation.trim(), formation.formationType.trim());
  }
  return map;
}

export function formationPlayTypesFromSeed(
  seed: TeamPlaybookSeed,
): Map<string, Map<string, string>> {
  const byFormation = new Map<string, Map<string, string>>();
  for (const formation of seed.formations) {
    const plays = new Map<string, string>();
    for (const play of formation.plays) {
      if (play.playType) {
        plays.set(normalizePlayName(play.playName), play.playType);
      }
    }
    byFormation.set(formation.formation.trim(), plays);
  }
  return byFormation;
}

/**
 * Maximum-weight bipartite matching (Hungarian / Kuhn-Munkres).
 * Returns playIndex assigned to each cropIndex.
 */
export function hungarianMaxAssignment(similarity: number[][]): number[] {
  const n = similarity.length;
  if (n === 0) return [];
  for (const row of similarity) {
    if (row.length !== n) {
      throw new Error("Hungarian assignment requires a square matrix");
    }
  }

  let maxVal = 0;
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      if (similarity[i][j] > maxVal) maxVal = similarity[i][j];
    }
  }

  const cost = similarity.map((row) => row.map((value) => maxVal - value));
  const u = new Array(n + 1).fill(0);
  const v = new Array(n + 1).fill(0);
  const p = new Array(n + 1).fill(0);
  const way = new Array(n + 1).fill(0);

  for (let i = 1; i <= n; i += 1) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(n + 1).fill(Number.POSITIVE_INFINITY);
    const used = new Array(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Number.POSITIVE_INFINITY;
      let j1 = 0;
      for (let j = 1; j <= n; j += 1) {
        if (used[j]) continue;
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= n; j += 1) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  const assignment = new Array(n).fill(-1);
  for (let j = 1; j <= n; j += 1) {
    if (p[j] > 0) {
      assignment[p[j] - 1] = j - 1;
    }
  }
  return assignment;
}

/**
 * Confidence is independent of global assignment.
 * Negative margin never PASSes. Weak evidence FAILs.
 * Thresholds unchanged from V2 — V3 improves evidence, not permissiveness.
 */
export function classifyMatchV3(input: {
  score: number;
  margin: number | null;
  isLocalBest: boolean;
  registrationFailed: boolean;
  registrationQuality: number;
  signalAgreement: number;
  residual: number;
  edges: number;
  matchMethod: MatchMethod;
}): MatchConfidenceStatus {
  if (
    input.matchMethod === "trusted-hash" ||
    input.matchMethod === "operator-override" ||
    input.matchMethod === "duplicate-omit"
  ) {
    return "PASS";
  }
  if (input.matchMethod === "normalized-exact") {
    if (input.margin !== null && input.margin < 0) return "REVIEW";
    if (!input.isLocalBest) return "REVIEW";
    return "PASS";
  }

  if (input.registrationFailed) return "FAIL";
  if (input.score < MATCH_THRESHOLDS_V3.failMaxScore) return "FAIL";

  // Assigned play is not uniquely preferred — REVIEW, never auto-PASS.
  if (input.margin !== null && input.margin < 0) return "REVIEW";
  if (!input.isLocalBest) return "REVIEW";

  // Local-best but play-specific signature still too weak to trust.
  if (input.residual < 0.8 && input.edges < 0.65) return "FAIL";

  const strong =
    input.score >= MATCH_THRESHOLDS_V3.passMinScore &&
    input.margin !== null &&
    input.margin >= MATCH_THRESHOLDS_V3.passMinMargin &&
    input.registrationQuality >= MATCH_THRESHOLDS_V3.registrationMinQuality &&
    input.signalAgreement >= MATCH_THRESHOLDS_V3.signalAgreementMin;

  if (strong) return "PASS";
  return "REVIEW";
}

/** @deprecated Prefer classifyMatchV3. */
export const classifyMatchV2 = classifyMatchV3;

function runnerUpFromRow(
  row: number[],
  assignedPlayIndex: number,
  playNames: string[],
): { playName: string | null; similarity: number | null; margin: number | null; localBestIndex: number } {
  let localBestIndex = 0;
  let localBestScore = row[0] ?? Number.NEGATIVE_INFINITY;
  for (let j = 1; j < row.length; j += 1) {
    if (row[j] > localBestScore) {
      localBestScore = row[j];
      localBestIndex = j;
    }
  }

  let bestOtherIndex = -1;
  let bestOtherScore = Number.NEGATIVE_INFINITY;
  for (let j = 0; j < row.length; j += 1) {
    if (j === assignedPlayIndex) continue;
    if (row[j] > bestOtherScore) {
      bestOtherScore = row[j];
      bestOtherIndex = j;
    }
  }

  const assignedScore = row[assignedPlayIndex] ?? 0;
  if (bestOtherIndex < 0) {
    return {
      playName: null,
      similarity: null,
      margin: null,
      localBestIndex,
    };
  }

  return {
    playName: playNames[bestOtherIndex] ?? null,
    similarity: bestOtherScore,
    margin: assignedScore - bestOtherScore,
    localBestIndex,
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export type VisualMatchOptions = {
  overridesPath?: string;
  skipReferenceFetch?: boolean;
  /** When true, REVIEW items do not block overall pass status (operator acknowledged report). */
  approveReview?: boolean;
  /** Skip trusted-hash lookup (force full visual path). */
  skipTrustedHash?: boolean;
  /** Optional accumulator for end-of-run download summary logging. */
  referenceDownloadStats?: ReferenceDownloadStats;
};

export type VisualMatchResult = {
  mapped: MappedPlayArt[];
  matchingReport: PlayArtMatchingReport;
  formationHeaders: number;
  playCards: number;
  referenceDownloadStats: ReferenceDownloadStats;
  /** Crops marked vault-duplicate; excluded from publish mappings. */
  omittedCropCount: number;
  /** Formation → how many catalog plays may lack a unique vault card. */
  unfulfilledAllowanceByFormation: Map<string, number>;
};

const UNAVAILABLE_REFERENCE_PAIR: PairScoreV3 = {
  composite: 0,
  signals: {
    residual: 0,
    edges: 0,
    foreground: 0,
    registered: 0,
    colorInk: 0,
    spatial: 0,
  },
  registration: {
    translationX: 0,
    translationY: 0,
    scale: 1,
    quality: 0,
    failed: true,
  },
};

export async function matchPlayArtVisually(
  reference: PlayArtReference,
  extracted: ExtractedPlayArtDoc,
  seed: TeamPlaybookSeed,
  options: VisualMatchOptions = {},
): Promise<VisualMatchResult> {
  const formationTypes = formationTypesFromSeed(seed);
  const formationPlayTypes = formationPlayTypesFromSeed(seed);
  const cropsByFormation = collectFormationCrops(reference, extracted);
  const positional = mapPlayArtPositionally(reference, extracted);
  const positionalByFormation = new Map<string, MappedPlayArt[]>();
  for (const row of positional.mapped) {
    const list = positionalByFormation.get(row.formation) ?? [];
    list.push(row);
    positionalByFormation.set(row.formation, list);
  }

  const overridesPath = options.overridesPath ?? defaultOverridesPath(reference);
  const rawOverrides = loadMatchingOverrides(overridesPath);
  const omitsPath = defaultOmitsPath(reference);
  const matchingOmits = loadMatchingOmits(omitsPath);
  const cropIdSets = new Map<string, Set<string>>();
  for (const [formationName, crops] of cropsByFormation) {
    cropIdSets.set(formationName, new Set(crops.map((c) => c.cropId)));
  }
  const remappedOverrides = remapOverridesByCropLocation(rawOverrides, cropIdSets);
  const overrideValidation = validateMatchingOverrides(reference, remappedOverrides, cropIdSets);
  if (!overrideValidation.valid) {
    throw new Error(
      `Matching overrides invalid:\n${overrideValidation.errors.map((e) => `  - ${e}`).join("\n")}`,
    );
  }
  const overrides = overrideValidation.normalized;
  const trustedIndex = options.skipTrustedHash
    ? new Map()
    : loadTrustedAssetIndex();

  const formationReports: FormationMatchReport[] = [];
  const mapped: MappedPlayArt[] = [];
  const globalErrors: string[] = [];
  let passCount = 0;
  let reviewCount = 0;
  let failCount = 0;
  let overrideCount = 0;
  let geometryPromotedCount = 0;
  let geometryConflictCount = 0;
  let perHuePromotedCount = 0;
  const methodCounts: Record<MatchMethod, number> = {
    "trusted-hash": 0,
    "normalized-exact": 0,
    "visual-v2": 0,
    "visual-v3": 0,
    "geometry-v3.1": 0,
    "geometry-v3.2": 0,
    "operator-override": 0,
    "duplicate-omit": 0,
  };
  const margins: number[] = [];
  let negativeMarginPassCount = 0;
  let nearZeroMarginPassCount = 0;
  const downloadStats = options.referenceDownloadStats ?? createReferenceDownloadStats();

  for (const refFormation of reference.formations) {
    const formationName = refFormation.name;
    const crops = cropsByFormation.get(formationName) ?? [];
    const formationType = formationTypes.get(formationName);
    const errors: string[] = [];

    if (!formationType) {
      errors.push(`Missing formationType in seed for "${formationName}"`);
    }
    if (crops.length !== refFormation.plays.length) {
      errors.push(
        `Crop count mismatch: expected ${refFormation.plays.length}, got ${crops.length}`,
      );
    }

    if (errors.length > 0 || !formationType) {
      formationReports.push({
        formation: formationName,
        expectedPlays: refFormation.plays.length,
        cropCount: crops.length,
        assignments: [],
        status: "fail",
        errors,
      });
      globalErrors.push(...errors.map((e) => `${formationName}: ${e}`));
      continue;
    }

    // Keep seed/reference spacing for cfb.fan URLs (`0 1 TRAP` → 0-1-trap.jpg).
    // Identity comparisons still use normalizePlayName (digit collapse).
    const urlPlayNames = refFormation.plays.map((p) => p.trim());
    const playNames = urlPlayNames.map((p) => normalizePlayName(p));
    const positionalRows = positionalByFormation.get(formationName) ?? [];

    const fetched = options.skipReferenceFetch
      ? { images: [] as ReferenceImageResult[], failures: [] as Array<{ playName: string; reason: string; url: string }> }
      : await fetchReferenceImagesForFormation(
          reference,
          formationName,
          formationType,
          urlPlayNames,
          downloadStats,
        );

    const imageByUrlName = new Map(
      fetched.images.map((image) => [image.playName, image] as const),
    );
    const orderedImages: (ReferenceImageResult | null)[] = urlPlayNames.map(
      (name) => imageByUrlName.get(name) ?? null,
    );
    const availablePlayIndices = orderedImages
      .map((image, index) => (image ? index : -1))
      .filter((index) => index >= 0);

    for (const failure of fetched.failures) {
      // Soft note only — partial download failure must not cascade-FAIL the formation.
      console.warn(
        `[WARN] Continuing without reference: ${formationName}/${failure.playName}`,
      );
    }

    if (availablePlayIndices.length === 0) {
      const reviewAssignments: PlayArtMatchAssignment[] = crops.map((crop, idx) => ({
        formation: formationName,
        cropId: crop.cropId,
        playName: playNames[idx] ?? "UNKNOWN",
        mediaPath: crop.mediaPath,
        extension: crop.extension,
        blockIndex: crop.blockIndex,
        sourceIndex: crop.sourceIndex,
        cardPosition: crop.cardPosition,
        sourceOrder: crop.sourceOrder,
        similarity: 0,
        runnerUpPlay: null,
        runnerUpSimilarity: null,
        margin: null,
        status: "REVIEW" as const,
        overridden: false,
        matchMethod: "visual-v3" as const,
        signals: null,
        registration: null,
        isLocalBest: false,
        referenceUrl: "",
        positionalPlayName:
          positionalRows.find((row) => row.blockIndex === crop.blockIndex)?.playName ?? null,
        geometry: null,
      }));
      reviewCount += reviewAssignments.length;
      errors.push("no references available — all candidate downloads failed");
      formationReports.push({
        formation: formationName,
        expectedPlays: refFormation.plays.length,
        cropCount: crops.length,
        assignments: reviewAssignments,
        status: "review",
        errors,
      });
      if (!options.approveReview) {
        globalErrors.push(
          `Formation "${formationName}" has no available reference images`,
        );
      }
      continue;
    }

    const referenceRasters: NormalizedRaster[] = [];
    const referenceBuffers: Buffer[] = [];
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

    const ownedRasters: NormalizedRaster[] = [];
    const ownedColorInks: NormalizedRaster[] = [];
    const cropHashes: string[] = [];
    for (const crop of crops) {
      const buffer = extracted.mediaFiles.get(crop.mediaPath);
      if (!buffer) {
        errors.push(`Missing crop buffer for ${crop.cropId}`);
        ownedRasters.push({
          pixels: new Float64Array(0),
          width: 0,
          height: 0,
        });
        ownedColorInks.push({
          pixels: new Float64Array(0),
          width: 0,
          height: 0,
        });
        cropHashes.push("");
        continue;
      }
      ownedRasters.push(await normalizeDiagramRaster(buffer));
      ownedColorInks.push(await extractColorInkMask(buffer));
      cropHashes.push(hashPlayArtBytes(buffer));
    }

    if (errors.length > 0) {
      formationReports.push({
        formation: formationName,
        expectedPlays: refFormation.plays.length,
        cropCount: crops.length,
        assignments: [],
        status: "fail",
        errors,
      });
      globalErrors.push(...errors.map((e) => `${formationName}: ${e}`));
      continue;
    }

    // Pre-resolve trusted-hash / overrides / duplicate-omits before visual scoring.
    const forcedPlayIndex = new Array<number>(crops.length).fill(-1);
    const forcedMethod = new Array<MatchMethod | null>(crops.length).fill(null);
    const formationOverrides = overrides[formationName] ?? {};
    const formationOmits = matchingOmits[formationName] ?? {};

    for (let cropIndex = 0; cropIndex < crops.length; cropIndex += 1) {
      const crop = crops[cropIndex];
      const omit = formationOmits[crop.cropId];
      if (omit) {
        const idx = playNames.findIndex(
          (p) => p === normalizePlayName(omit.duplicateOf),
        );
        if (idx >= 0) {
          forcedPlayIndex[cropIndex] = idx;
          forcedMethod[cropIndex] = "duplicate-omit";
        } else {
          errors.push(
            `Invalid duplicate-omit play for crop ${crop.cropId}: "${omit.duplicateOf}"`,
          );
        }
        continue;
      }

      const overridePlay = formationOverrides[crop.cropId];
      if (overridePlay) {
        const idx = playNames.findIndex((p) => p === normalizePlayName(overridePlay));
        if (idx >= 0) {
          forcedPlayIndex[cropIndex] = idx;
          forcedMethod[cropIndex] = "operator-override";
        } else {
          errors.push(`Invalid override play for crop ${crop.cropId}`);
        }
        continue;
      }

      const trusted = resolveTrustedHash(
        cropHashes[cropIndex],
        reference,
        formationName,
        playNames,
        trustedIndex,
      );
      if (trusted) {
        const idx = playNames.findIndex((p) => p === trusted.playName);
        if (idx >= 0) {
          forcedPlayIndex[cropIndex] = idx;
          forcedMethod[cropIndex] = "trusted-hash";
        }
      }
    }

    // Build full composite matrix: register each crop once to the formation baseline (V3 scale+translation).
    // Unavailable reference columns stay at score 0 so Hungarian remains square (NxN plays).
    const pairScores: PairScoreV3[][] = [];
    const matrix: number[][] = [];
    const alignedOwned: NormalizedRaster[] = [];
    const alignedColorInk: NormalizedRaster[] = [];
    const registrations: PairScoreV3["registration"][] = [];

    for (let i = 0; i < crops.length; i += 1) {
      const { aligned, registration } = registerRasterV3(ownedRasters[i], baseline);
      // Apply the same bounded transform to color-ink so overlap stays spatially meaningful.
      const colorAligned = translateRaster(
        registration.scale === 1
          ? ownedColorInks[i]
          : scaleRaster(ownedColorInks[i], registration.scale),
        registration.translationX,
        registration.translationY,
      );
      alignedOwned.push(aligned);
      alignedColorInk.push(colorAligned);
      registrations.push(registration);
      const rowScores: PairScoreV3[] = [];
      const row: number[] = [];
      for (let j = 0; j < playNames.length; j += 1) {
        const preparedIndex = preparedIndexByPlayIndex.get(j);
        if (preparedIndex === undefined) {
          rowScores.push(UNAVAILABLE_REFERENCE_PAIR);
          row.push(0);
          continue;
        }
        const scored = scoreAlignedOwnedAgainstReferenceV3(
          aligned,
          colorAligned,
          prepared[preparedIndex],
          baseline,
          varianceWeight,
          registration,
        );
        rowScores.push(scored);
        row.push(scored.composite);
      }
      pairScores.push(rowScores);
      matrix.push(row);
    }

    // For Hungarian: boost forced assignments so global assignment respects them.
    const assignmentMatrix = matrix.map((row, i) =>
      row.map((score, j) => {
        if (forcedPlayIndex[i] === j) return 1;
        if (forcedPlayIndex[i] >= 0 && forcedPlayIndex[i] !== j) return 0;
        return score;
      }),
    );
    const assignment = hungarianMaxAssignment(assignmentMatrix);

    // Phase 1: V3 confidence (geometry only on REVIEW).
    type DraftAssignment = {
      cropIndex: number;
      playIndex: number;
      status: MatchConfidenceStatus;
      matchMethod: MatchMethod;
      pair: PairScoreV3;
      runnerUp: ReturnType<typeof runnerUpFromRow>;
      isLocalBest: boolean;
      geometry: GeometryMatchDiagnostics | null;
    };

    const drafts: DraftAssignment[] = [];

    for (let cropIndex = 0; cropIndex < crops.length; cropIndex += 1) {
      const crop = crops[cropIndex];
      const playIndex =
        forcedPlayIndex[cropIndex] >= 0 ? forcedPlayIndex[cropIndex] : assignment[cropIndex];

      if (playIndex < 0) {
        errors.push(`No assignment for crop ${crop.cropId}`);
        failCount += 1;
        continue;
      }

      const pair = pairScores[cropIndex][playIndex];
      const runnerUp = runnerUpFromRow(matrix[cropIndex], playIndex, playNames);
      const isLocalBest = runnerUp.localBestIndex === playIndex;
      const signalAgreement = Math.min(pair.signals.residual, pair.signals.edges);

      let matchMethod: MatchMethod = forcedMethod[cropIndex] ?? "visual-v3";
      if (matchMethod === "visual-v3" && isNormalizedExactV3(pair) && isLocalBest) {
        matchMethod = "normalized-exact";
      }

      const referenceAvailable = preparedIndexByPlayIndex.has(playIndex);
      let status = classifyMatchV3({
        score: pair.composite,
        margin: runnerUp.margin,
        isLocalBest,
        registrationFailed: pair.registration.failed,
        registrationQuality: pair.registration.quality,
        signalAgreement,
        residual: pair.signals.residual,
        edges: pair.signals.edges,
        matchMethod,
      });
      // Missing cfb.fan asset → REVIEW for that crop, not formation-wide FAIL.
      if (
        !referenceAvailable &&
        matchMethod !== "trusted-hash" &&
        matchMethod !== "operator-override" &&
        matchMethod !== "duplicate-omit"
      ) {
        status = "REVIEW";
      }

      drafts.push({
        cropIndex,
        playIndex,
        status,
        matchMethod,
        pair,
        runnerUp,
        isLocalBest,
        geometry: null,
      });
    }

    // Phase 2: Geometry resolver on V3 REVIEW only (fail-closed).
    const playTypeByName = formationPlayTypes.get(formationName) ?? new Map<string, string>();
    const playTypes = playNames.map((name) => playTypeByName.get(name) ?? null);
    const refGeometryCache: Array<GeometryFeatures | null> = playNames.map(() => null);

    const lockedPlayIndices = new Set<number>();
    for (const draft of drafts) {
      if (draft.status === "PASS") lockedPlayIndices.add(draft.playIndex);
    }

    const reviewDrafts = drafts.filter(
      (d) =>
        d.status === "REVIEW" &&
        preparedIndexByPlayIndex.has(d.playIndex) &&
        (d.matchMethod === "visual-v3" || d.matchMethod === "normalized-exact"),
    );

    if (reviewDrafts.length > 0) {
      // Cache per-hue color-class masks for reference candidates (V3.2).
      const refColorClassCache: Array<{
        warm: NormalizedRaster;
        cool: NormalizedRaster;
        other: NormalizedRaster;
      } | null> = playNames.map(() => null);

      for (const draft of reviewDrafts) {
        const cropIndex = draft.cropIndex;
        const candidateIndices = topCandidateIndices(matrix[cropIndex], draft.playIndex, 3).filter(
          (playIndex) => preparedIndexByPlayIndex.has(playIndex),
        );

        for (const playIndex of candidateIndices) {
          const preparedIndex = preparedIndexByPlayIndex.get(playIndex);
          if (preparedIndex === undefined) continue;
          if (!refColorClassCache[playIndex]) {
            refColorClassCache[playIndex] = await extractColorClassMasks(
              referenceBuffers[preparedIndex],
            );
          }
          if (refGeometryCache[playIndex]) continue;
          refGeometryCache[playIndex] = extractReferenceGeometryFeatures(
            prepared[preparedIndex],
            baseline,
            varianceWeight,
            refColorClassCache[playIndex] ?? undefined,
          );
        }

        const ownedBuffer = extracted.mediaFiles.get(crops[cropIndex].mediaPath);
        let ownedColorClasses:
          | { warm: NormalizedRaster; cool: NormalizedRaster; other: NormalizedRaster }
          | undefined;
        if (ownedBuffer) {
          const rawClasses = await extractColorClassMasks(ownedBuffer);
          const reg = registrations[cropIndex];
          const alignClass = (mask: NormalizedRaster): NormalizedRaster =>
            translateRaster(
              reg.scale === 1 ? mask : scaleRaster(mask, reg.scale),
              reg.translationX,
              reg.translationY,
            );
          ownedColorClasses = {
            warm: alignClass(rawClasses.warm),
            cool: alignClass(rawClasses.cool),
            other: alignClass(rawClasses.other),
          };
        }

        const ownedFeatures = extractGeometryFeatures({
          alignedRaster: alignedOwned[cropIndex],
          colorInk: alignedColorInk[cropIndex],
          baseline,
          varianceWeight,
          colorClasses: ownedColorClasses,
        });

        const geo = resolveGeometryReview({
          assignedPlayIndex: draft.playIndex,
          playNames,
          v3Scores: matrix[cropIndex],
          v3Margin: draft.runnerUp.margin,
          v3IsLocalBest: draft.isLocalBest,
          v3Signals: draft.pair.signals,
          registration: registrations[cropIndex],
          candidateIndices,
          ownedFeatures,
          referenceFeatures: refGeometryCache,
          playTypes,
          lockedPlayIndices,
        });

        if (geo.conflictWithV3) geometryConflictCount += 1;

        const geometryDiag: GeometryMatchDiagnostics = {
          status: geo.status,
          score: geo.geometryScore,
          runnerUpPlay: geo.geometryRunnerUpPlay,
          runnerUpScore: geo.geometryRunnerUpScore,
          margin: geo.geometryMargin,
          signals: geo.signals,
          conflictWithV3: geo.conflictWithV3,
          reason: geo.reason,
          v3Score: draft.pair.composite,
          v3Margin: draft.runnerUp.margin,
          v3RunnerUpPlay: draft.runnerUp.playName,
          perHueMargins: geo.perHueMargins,
          maxPerHueMargin: geo.maxPerHueMargin,
          maxPerHueChannel: geo.maxPerHueChannel,
          perHuePromoted: geo.perHuePromoted,
        };
        draft.geometry = geometryDiag;

        if (geo.status !== "geometry-pass") continue;

        // One-to-one: refuse promotion if target play is locked by another PASS.
        if (geo.playIndex !== draft.playIndex && lockedPlayIndices.has(geo.playIndex)) {
          draft.geometry = {
            ...geometryDiag,
            status: "geometry-review",
            reason: "geometry winner locked by another PASS assignment",
            perHuePromoted: false,
          };
          continue;
        }

        // Preview post-geometry V3 margin — never introduce negative-margin auto PASS.
        const previewRunnerUp = runnerUpFromRow(matrix[cropIndex], geo.playIndex, playNames);
        if (previewRunnerUp.margin != null && previewRunnerUp.margin < 0) {
          draft.geometry = {
            ...geometryDiag,
            status: "geometry-review",
            reason: "geometry promotion blocked: negative V3 margin",
            perHuePromoted: false,
          };
          continue;
        }

        // If reassigning, the displaced play must currently belong to a REVIEW crop
        // (or be the same). Swap when another REVIEW holds the geometry winner.
        if (geo.playIndex !== draft.playIndex) {
          const holder = drafts.find(
            (d) => d.playIndex === geo.playIndex && d.cropIndex !== draft.cropIndex,
          );
          if (holder && holder.status === "PASS") {
            draft.geometry = {
              ...geometryDiag,
              status: "geometry-review",
              reason: "geometry reassignment blocked by PASS holder",
              perHuePromoted: false,
            };
            continue;
          }
          if (holder && holder.status === "REVIEW") {
            // Swap play indices; holder remains REVIEW (unless later geometry promotes it).
            holder.playIndex = draft.playIndex;
            holder.pair = pairScores[holder.cropIndex][holder.playIndex];
            holder.runnerUp = runnerUpFromRow(
              matrix[holder.cropIndex],
              holder.playIndex,
              playNames,
            );
            holder.isLocalBest = holder.runnerUp.localBestIndex === holder.playIndex;
          } else if (holder && holder.status === "FAIL") {
            draft.geometry = {
              ...geometryDiag,
              status: "geometry-review",
              reason: "geometry reassignment blocked by FAIL holder",
              perHuePromoted: false,
            };
            continue;
          }
        }

        draft.playIndex = geo.playIndex;
        draft.pair = pairScores[cropIndex][geo.playIndex];
        draft.runnerUp = runnerUpFromRow(matrix[cropIndex], geo.playIndex, playNames);
        draft.isLocalBest = draft.runnerUp.localBestIndex === geo.playIndex;
        draft.status = "PASS";
        draft.matchMethod = "geometry-v3.2";
        lockedPlayIndices.add(geo.playIndex);
        geometryPromotedCount += 1;
        if (geo.perHuePromoted) perHuePromotedCount += 1;
      }
    }

    const assignments: PlayArtMatchAssignment[] = [];
    const assignedPlays = new Set<string>();
    const assignedCrops = new Set<string>();

    for (const draft of drafts) {
      const crop = crops[draft.cropIndex];
      const playIndex = draft.playIndex;
      const pair = draft.pair;
      const runnerUp = draft.runnerUp;
      const status = draft.status;
      const matchMethod = draft.matchMethod;

      if (status === "PASS") passCount += 1;
      else if (status === "REVIEW") reviewCount += 1;
      else failCount += 1;

      if (matchMethod === "operator-override") overrideCount += 1;
      methodCounts[matchMethod] += 1;

      if (runnerUp.margin !== null) {
        margins.push(runnerUp.margin);
        if (
          status === "PASS" &&
          runnerUp.margin < 0 &&
          (matchMethod === "visual-v3" ||
            matchMethod === "visual-v2" ||
            matchMethod === "normalized-exact" ||
            matchMethod === "geometry-v3.1" ||
            matchMethod === "geometry-v3.2")
        ) {
          negativeMarginPassCount += 1;
        }
        if (
          status === "PASS" &&
          runnerUp.margin >= 0 &&
          runnerUp.margin < 0.01 &&
          (matchMethod === "visual-v3" ||
            matchMethod === "visual-v2" ||
            matchMethod === "normalized-exact" ||
            matchMethod === "geometry-v3.1" ||
            matchMethod === "geometry-v3.2")
        ) {
          nearZeroMarginPassCount += 1;
        }
      }

      const playName = playNames[playIndex];
      const isDuplicateOmit = matchMethod === "duplicate-omit";
      if (!isDuplicateOmit && assignedPlays.has(playName)) {
        errors.push(`Duplicate play assignment "${playName}" in formation "${formationName}"`);
      }
      if (assignedCrops.has(crop.cropId)) {
        errors.push(`Duplicate crop assignment "${crop.cropId}" in formation "${formationName}"`);
      }
      if (!isDuplicateOmit) {
        assignedPlays.add(playName);
      }
      assignedCrops.add(crop.cropId);

      assignments.push({
        formation: formationName,
        cropId: crop.cropId,
        playName,
        mediaPath: crop.mediaPath,
        extension: crop.extension,
        blockIndex: crop.blockIndex,
        sourceIndex: crop.sourceIndex,
        cardPosition: crop.cardPosition,
        sourceOrder: crop.sourceOrder,
        similarity: pair.composite,
        runnerUpPlay: runnerUp.playName,
        runnerUpSimilarity: runnerUp.similarity,
        margin: runnerUp.margin,
        status,
        overridden: matchMethod === "operator-override",
        matchMethod,
        signals: pair.signals,
        registration: pair.registration,
        isLocalBest: draft.isLocalBest,
        referenceUrl: orderedImages[playIndex]?.url ?? "",
        positionalPlayName:
          positionalRows.find((row) => row.blockIndex === crop.blockIndex)?.playName ?? null,
        geometry: draft.geometry,
      });

      // Vault duplicates are not published as a second logical mapping.
      if (!isDuplicateOmit) {
        mapped.push({
          formation: formationName,
          playName,
          mediaPath: crop.mediaPath,
          extension: crop.extension,
          assetId: "",
          assetPath: "",
          blockIndex: crop.blockIndex,
        });
      }
    }

    const formationStatus: FormationMatchReport["status"] =
      errors.length > 0 || assignments.some((a) => a.status === "FAIL")
        ? "fail"
        : assignments.some((a) => a.status === "REVIEW")
          ? "review"
          : "pass";

    formationReports.push({
      formation: formationName,
      expectedPlays: refFormation.plays.length,
      cropCount: crops.length,
      assignments,
      status: formationStatus,
      errors,
    });

    if (formationStatus === "fail") {
      globalErrors.push(`Formation "${formationName}" has FAIL matches or errors`);
    } else if (formationStatus === "review" && !options.approveReview) {
      globalErrors.push(`Formation "${formationName}" has unresolved REVIEW matches`);
    }
  }

  const playCount = reference.formations.reduce((sum, f) => sum + f.plays.length, 0);
  const unresolvedReview =
    reviewCount > 0 && overrideCount < reviewCount && !options.approveReview;
  const overallStatus: PlayArtMatchingReport["status"] =
    failCount > 0
      ? "fail"
      : unresolvedReview
        ? "review"
        : globalErrors.length > 0
          ? "fail"
          : "pass";

  const avgMargin =
    margins.length === 0 ? null : margins.reduce((s, m) => s + m, 0) / margins.length;

  const matchingReport: PlayArtMatchingReport = {
    playbook: reference.playbook,
    gameVersion: reference.gameVersion,
    sideOfBall: reference.sideOfBall,
    matcherVersion: "v3.2",
    status: overallStatus,
    formationCount: reference.formations.length,
    playCount,
    passCount,
    reviewCount,
    failCount,
    overrideCount,
    autoMatchRate: playCount === 0 ? 0 : passCount / playCount,
    methodCounts,
    averageMargin: avgMargin,
    medianMargin: median(margins),
    negativeMarginPassCount,
    nearZeroMarginPassCount,
    geometryPromotedCount,
    geometryConflictCount,
    perHuePromotedCount,
    formations: formationReports,
    errors: globalErrors,
    thresholds: { ...MATCH_THRESHOLDS_V3 },
    compositeWeights: { ...V3_COMPOSITE_WEIGHTS },
    geometryWeights: { ...GEOMETRY_COMPOSITE_WEIGHTS },
    geometryThresholds: {
      passMinScore: GEOMETRY_PASS_THRESHOLDS.passMinScore,
      passMinMargin: GEOMETRY_PASS_THRESHOLDS.passMinMargin,
      confirmMinScore: GEOMETRY_PASS_THRESHOLDS.confirmMinScore,
      confirmMinMargin: GEOMETRY_PASS_THRESHOLDS.confirmMinMargin,
      confirmMinMarginWithPerHue: GEOMETRY_PASS_THRESHOLDS.confirmMinMarginWithPerHue,
      perHueConfirmMinMargin: GEOMETRY_PASS_THRESHOLDS.perHueConfirmMinMargin,
      confirmV3MinMargin: GEOMETRY_PASS_THRESHOLDS.confirmV3MinMargin,
      orientationMin: GEOMETRY_PASS_THRESHOLDS.orientationMin,
      spatialMin: GEOMETRY_PASS_THRESHOLDS.spatialMin,
    },
  };

  const unfulfilledAllowanceByFormation = new Map<string, number>();
  let omittedCropCount = 0;
  for (const [formationName, cropMap] of Object.entries(matchingOmits)) {
    const n = Object.keys(cropMap).length;
    omittedCropCount += n;
    if (n > 0) unfulfilledAllowanceByFormation.set(formationName, n);
  }

  return {
    mapped,
    matchingReport,
    formationHeaders: positional.formationHeaders,
    playCards: positional.playCards,
    referenceDownloadStats: downloadStats,
    omittedCropCount,
    unfulfilledAllowanceByFormation,
  };
}

export async function loadSeedForReference(reference: PlayArtReference): Promise<TeamPlaybookSeed> {
  return importSeedModule(seedSlugFromReference(reference));
}
