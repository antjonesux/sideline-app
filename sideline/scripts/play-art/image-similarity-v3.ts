/**
 * Matcher V3 image pipeline (ingest-time only).
 *
 * Evidence-based upgrades over V2 (from matcher-v3-debug probe):
 * - bounded scale (0.96–1.04) + translation registration
 * - formation variance weighting on residuals/edges
 * - color-ink overlap signal (saturated route/block markings)
 * - left/right spatial occupancy for orientation-sensitive concepts
 *
 * Does NOT loosen PASS thresholds. No mirror invariance.
 */
import sharp from "sharp";
import {
  V2_COMPARE_SIZE,
  V2_DIAGRAM_REGION,
  V2_REGISTRATION_SEARCH,
  V2_RESIDUAL_FLOOR,
  edgeMap,
  foregroundOverlap,
  playSignature,
  translateRaster,
  type NormalizedRaster,
  type RegistrationResult,
} from "./image-similarity-v2";

export {
  V2_COMPARE_SIZE,
  V2_DIAGRAM_REGION,
  V2_REGISTRATION_SEARCH,
  V2_RESIDUAL_FLOOR,
  normalizeDiagramRaster,
  playSignature,
  edgeMap,
  foregroundOverlap,
  translateRaster,
  type NormalizedRaster,
  type RegistrationResult,
} from "./image-similarity-v2";

/** Scale search steps for V3 registration (deterministic, bounded). */
export const V3_SCALE_STEPS = [0.96, 0.98, 1.0, 1.02, 1.04] as const;

export type MatchSignalsV3 = {
  residual: number;
  edges: number;
  foreground: number;
  registered: number;
  colorInk: number;
  spatial: number;
};

export type PairScoreV3 = {
  composite: number;
  signals: MatchSignalsV3;
  registration: RegistrationResult;
};

export type PreparedReferenceV3 = {
  raster: NormalizedRaster;
  signature: NormalizedRaster;
  edges: NormalizedRaster;
  colorInk: NormalizedRaster;
  spatial: SpatialFeatures;
};

export type SpatialFeatures = {
  leftMass: number;
  rightMass: number;
  /** (right - left) / (right + left), orientation-preserving. */
  lrBalance: number;
  topMass: number;
  bottomMass: number;
};

export type FormationAnalysisV3 = {
  baseline: NormalizedRaster;
  /** Per-pixel stddev normalized to 0–1 (discriminative weight). */
  varianceWeight: NormalizedRaster;
  prepared: PreparedReferenceV3[];
};

function mse(a: Float64Array, b: Float64Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return sum / a.length;
}

function inverseRmseSimilarity(a: Float64Array, b: Float64Array): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i] - b[i];
    sumSq += d * d;
  }
  const rmse = Math.sqrt(sumSq / a.length);
  return Math.max(0, Math.min(1, 1 - rmse / 255));
}

function cosineSimilarity(a: Float64Array, b: Float64Array): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return Math.max(0, Math.min(1, (dot / Math.sqrt(na * nb) + 1) / 2));
}

/** Center-scale raster (bilinear). scale>1 zooms in. */
export function scaleRaster(source: NormalizedRaster, scale: number): NormalizedRaster {
  if (scale === 1) {
    return { pixels: new Float64Array(source.pixels), width: source.width, height: source.height };
  }
  const { width, height } = source;
  const pixels = new Float64Array(width * height);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sx = cx + (x - cx) / scale;
      const sy = cy + (y - cy) / scale;
      const x0 = Math.max(0, Math.min(width - 1, Math.floor(sx)));
      const y0 = Math.max(0, Math.min(height - 1, Math.floor(sy)));
      const x1 = Math.min(width - 1, x0 + 1);
      const y1 = Math.min(height - 1, y0 + 1);
      const fx = sx - x0;
      const fy = sy - y0;
      const v00 = source.pixels[y0 * width + x0];
      const v10 = source.pixels[y0 * width + x1];
      const v01 = source.pixels[y1 * width + x0];
      const v11 = source.pixels[y1 * width + x1];
      pixels[y * width + x] =
        v00 * (1 - fx) * (1 - fy) +
        v10 * fx * (1 - fy) +
        v01 * (1 - fx) * fy +
        v11 * fx * fy;
    }
  }
  return { pixels, width, height };
}

/**
 * Bounded scale + translation registration. No rotate/mirror.
 * Searches V3_SCALE_STEPS × (±V2_REGISTRATION_SEARCH)².
 */
export function registerRasterV3(
  owned: NormalizedRaster,
  reference: NormalizedRaster,
): { aligned: NormalizedRaster; registration: RegistrationResult } {
  if (owned.pixels.length !== reference.pixels.length) {
    return {
      aligned: owned,
      registration: {
        translationX: 0,
        translationY: 0,
        scale: 1,
        quality: 0,
        failed: true,
      },
    };
  }

  let bestDx = 0;
  let bestDy = 0;
  let bestScale = 1;
  let bestMse = Number.POSITIVE_INFINITY;

  for (const scale of V3_SCALE_STEPS) {
    const scaled = scale === 1 ? owned : scaleRaster(owned, scale);
    for (let dy = -V2_REGISTRATION_SEARCH; dy <= V2_REGISTRATION_SEARCH; dy += 1) {
      for (let dx = -V2_REGISTRATION_SEARCH; dx <= V2_REGISTRATION_SEARCH; dx += 1) {
        const shifted = translateRaster(scaled, dx, dy);
        const err = mse(shifted.pixels, reference.pixels);
        if (err < bestMse) {
          bestMse = err;
          bestDx = dx;
          bestDy = dy;
          bestScale = scale;
        }
      }
    }
  }

  const rmse = Math.sqrt(bestMse);
  const quality = Math.max(0, Math.min(1, 1 - rmse / 255));
  const failed = quality < 0.55;
  const scaled = bestScale === 1 ? owned : scaleRaster(owned, bestScale);

  return {
    aligned: translateRaster(scaled, bestDx, bestDy),
    registration: {
      translationX: bestDx,
      translationY: bestDy,
      scale: bestScale,
      quality,
      failed,
    },
  };
}

/** Pixel-wise median baseline (unchanged from V2 — probe confirmed it removes shell). */
export function buildFormationBaseline(references: NormalizedRaster[]): NormalizedRaster {
  if (references.length === 0) {
    throw new Error("V3 baseline failed: no reference rasters");
  }
  const { width, height } = references[0];
  const n = width * height;
  const pixels = new Float64Array(n);
  const column = new Float64Array(references.length);

  for (let i = 0; i < n; i += 1) {
    for (let r = 0; r < references.length; r += 1) {
      column[r] = references[r].pixels[i];
    }
    column.sort((a, b) => a - b);
    const mid = Math.floor(column.length / 2);
    pixels[i] =
      column.length % 2 === 0 ? (column[mid - 1] + column[mid]) / 2 : column[mid];
  }

  return { pixels, width, height };
}

/**
 * Per-pixel stddev across formation references, normalized to [0,1].
 * Low-variance (static formation) pixels down-weighted; play-varying pixels emphasized.
 */
export function buildFormationVarianceWeight(references: NormalizedRaster[]): NormalizedRaster {
  if (references.length === 0) {
    throw new Error("V3 variance failed: no reference rasters");
  }
  const { width, height } = references[0];
  const n = width * height;
  const mean = new Float64Array(n);
  for (const r of references) {
    for (let i = 0; i < n; i += 1) mean[i] += r.pixels[i];
  }
  for (let i = 0; i < n; i += 1) mean[i] /= references.length;

  const variance = new Float64Array(n);
  for (const r of references) {
    for (let i = 0; i < n; i += 1) {
      const d = r.pixels[i] - mean[i];
      variance[i] += d * d;
    }
  }
  const denom = Math.max(1, references.length - 1);
  let maxStd = 0;
  for (let i = 0; i < n; i += 1) {
    variance[i] = Math.sqrt(variance[i] / denom);
    if (variance[i] > maxStd) maxStd = variance[i];
  }

  const pixels = new Float64Array(n);
  // Floor weight so static regions still contribute slightly (avoid zeroing shell-only plays).
  const floor = 0.15;
  for (let i = 0; i < n; i += 1) {
    const w = maxStd > 0 ? variance[i] / maxStd : 1;
    pixels[i] = floor + (1 - floor) * w;
  }
  return { pixels, width, height };
}

function applyVarianceWeight(
  signature: NormalizedRaster,
  weight: NormalizedRaster,
): Float64Array {
  const out = new Float64Array(signature.pixels.length);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = signature.pixels[i] * weight.pixels[i];
  }
  return out;
}

function diagramRegionForSize(
  width: number,
  height: number,
): { left: number; top: number; width: number; height: number } {
  if (width === 626 && height === 355) {
    return { ...V2_DIAGRAM_REGION };
  }
  const left = Math.round(width * (V2_DIAGRAM_REGION.left / 626));
  const top = Math.round(height * (V2_DIAGRAM_REGION.top / 355));
  const regionWidth = Math.max(1, Math.round(width * (V2_DIAGRAM_REGION.width / 626)));
  const regionHeight = Math.max(1, Math.round(height * (V2_DIAGRAM_REGION.height / 355)));
  return {
    left: Math.min(left, width - 1),
    top: Math.min(top, height - 1),
    width: Math.min(regionWidth, width - left),
    height: Math.min(regionHeight, height - top),
  };
}

/** Saturated non-gray ink mask — routes/arrows often carry stable color identity. */
export async function extractColorInkMask(buffer: Buffer): Promise<NormalizedRaster> {
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) {
    throw new Error("V3 color ink: could not read dimensions");
  }
  const region = diagramRegionForSize(width, height);
  const { data, info } = await sharp(buffer)
    .extract(region)
    .resize(V2_COMPARE_SIZE, V2_COMPARE_SIZE, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Float64Array(info.width * info.height);
  for (let i = 0; i < pixels.length; i += 1) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    pixels[i] = sat > 0.18 && max > 40 ? Math.min(255, sat * 255) : 0;
  }
  return { pixels, width: info.width, height: info.height };
}

export function spatialFeatures(signature: NormalizedRaster): SpatialFeatures {
  const { width, height, pixels } = signature;
  const midX = width / 2;
  const midY = height / 2;
  let leftMass = 0;
  let rightMass = 0;
  let topMass = 0;
  let bottomMass = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const v = pixels[y * width + x];
      if (v < V2_RESIDUAL_FLOOR) continue;
      if (x < midX) leftMass += v;
      else rightMass += v;
      if (y < midY) topMass += v;
      else bottomMass += v;
    }
  }

  const lrSum = leftMass + rightMass;
  return {
    leftMass,
    rightMass,
    lrBalance: lrSum > 0 ? (rightMass - leftMass) / lrSum : 0,
    topMass,
    bottomMass,
  };
}

/** Similarity of orientation features — mirrored concepts score low. */
export function spatialSimilarity(a: SpatialFeatures, b: SpatialFeatures): number {
  const lrDiff = Math.abs(a.lrBalance - b.lrBalance);
  // lrBalance ∈ [-1,1]; diff 0 → 1, diff 2 → 0
  const lrScore = Math.max(0, 1 - lrDiff);
  const aTB = a.topMass + a.bottomMass;
  const bTB = b.topMass + b.bottomMass;
  const aBal = aTB > 0 ? (a.bottomMass - a.topMass) / aTB : 0;
  const bBal = bTB > 0 ? (b.bottomMass - b.topMass) / bTB : 0;
  const tbScore = Math.max(0, 1 - Math.abs(aBal - bBal));
  return 0.75 * lrScore + 0.25 * tbScore;
}

/**
 * Thresholded residual then Sobel — reduces player-outline noise vs raw residual edges.
 */
export function playEdgeMap(signature: NormalizedRaster): NormalizedRaster {
  const cleaned: NormalizedRaster = {
    width: signature.width,
    height: signature.height,
    pixels: new Float64Array(signature.pixels.length),
  };
  for (let i = 0; i < signature.pixels.length; i += 1) {
    cleaned.pixels[i] = signature.pixels[i] >= V2_RESIDUAL_FLOOR + 4 ? signature.pixels[i] : 0;
  }
  return edgeMap(cleaned);
}

export const V3_COMPOSITE_WEIGHTS = {
  residual: 0.32,
  edges: 0.28,
  foreground: 0.14,
  registered: 0.04,
  colorInk: 0.12,
  spatial: 0.1,
} as const;

export function compositeScoreV3(signals: MatchSignalsV3): number {
  const w = V3_COMPOSITE_WEIGHTS;
  return (
    signals.residual * w.residual +
    signals.edges * w.edges +
    signals.foreground * w.foreground +
    signals.registered * w.registered +
    signals.colorInk * w.colorInk +
    signals.spatial * w.spatial
  );
}

export async function prepareReferenceSetV3(
  referenceRasters: NormalizedRaster[],
  referenceBuffers: Buffer[],
): Promise<FormationAnalysisV3> {
  if (referenceRasters.length !== referenceBuffers.length) {
    throw new Error("V3 prepare: raster/buffer count mismatch");
  }
  const baseline = buildFormationBaseline(referenceRasters);
  const varianceWeight = buildFormationVarianceWeight(referenceRasters);
  const prepared: PreparedReferenceV3[] = [];

  for (let i = 0; i < referenceRasters.length; i += 1) {
    const raster = referenceRasters[i];
    const signature = playSignature(raster, baseline);
    const colorInk = await extractColorInkMask(referenceBuffers[i]);
    prepared.push({
      raster,
      signature,
      edges: playEdgeMap(signature),
      colorInk,
      spatial: spatialFeatures(signature),
    });
  }

  return { baseline, varianceWeight, prepared };
}

export function scoreAlignedOwnedAgainstReferenceV3(
  alignedOwned: NormalizedRaster,
  ownedColorInk: NormalizedRaster,
  prepared: PreparedReferenceV3,
  baseline: NormalizedRaster,
  varianceWeight: NormalizedRaster,
  registration: RegistrationResult,
): PairScoreV3 {
  if (registration.failed) {
    return {
      composite: 0,
      signals: {
        residual: 0,
        edges: 0,
        foreground: 0,
        registered: 0,
        colorInk: 0,
        spatial: 0,
      },
      registration,
    };
  }

  const ownedSig = playSignature(alignedOwned, baseline);
  const ownedEdges = playEdgeMap(ownedSig);
  const ownedSpatial = spatialFeatures(ownedSig);

  const ownedWeighted = applyVarianceWeight(ownedSig, varianceWeight);
  const refWeighted = applyVarianceWeight(prepared.signature, varianceWeight);
  const ownedEdgeWeighted = applyVarianceWeight(ownedEdges, varianceWeight);
  const refEdgeWeighted = applyVarianceWeight(prepared.edges, varianceWeight);

  const residual =
    0.55 * inverseRmseSimilarity(ownedWeighted, refWeighted) +
    0.45 * cosineSimilarity(ownedWeighted, refWeighted);
  const edges =
    0.55 * inverseRmseSimilarity(ownedEdgeWeighted, refEdgeWeighted) +
    0.45 * cosineSimilarity(ownedEdgeWeighted, refEdgeWeighted);
  const foreground = foregroundOverlap(ownedSig, prepared.signature);
  const registered = inverseRmseSimilarity(alignedOwned.pixels, prepared.raster.pixels);
  const colorInk = foregroundOverlap(ownedColorInk, prepared.colorInk, 20);
  const spatial = spatialSimilarity(ownedSpatial, prepared.spatial);

  const signals: MatchSignalsV3 = {
    residual: Math.max(0, Math.min(1, residual)),
    edges: Math.max(0, Math.min(1, edges)),
    foreground: Math.max(0, Math.min(1, foreground)),
    registered: Math.max(0, Math.min(1, registered)),
    colorInk: Math.max(0, Math.min(1, colorInk)),
    spatial: Math.max(0, Math.min(1, spatial)),
  };

  return {
    composite: compositeScoreV3(signals),
    signals,
    registration,
  };
}

/**
 * Near-exact remains intentionally strict. Probe showed avg registered RMSE ~16,
 * so this tier stays rare — do not force it.
 */
export function isNormalizedExactV3(pair: PairScoreV3): boolean {
  return (
    !pair.registration.failed &&
    pair.signals.registered >= 0.97 &&
    pair.signals.residual >= 0.94 &&
    pair.signals.edges >= 0.92
  );
}
