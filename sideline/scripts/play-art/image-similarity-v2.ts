/**
 * Matcher V2 image pipeline (ingest-time only).
 *
 * Isolates play-specific markings (routes, blocking, arrows) by subtracting a
 * formation baseline and comparing residual + edge signals after registration.
 */
import sharp from "sharp";

export const V2_DIAGRAM_REGION = {
  left: 40,
  top: 72,
  width: 546,
  height: 250,
} as const;

/** Working raster size for registration + residual comparison. */
export const V2_COMPARE_SIZE = 96;

/** Translation search half-range in normalized pixels. */
export const V2_REGISTRATION_SEARCH = 6;

/** Residual magnitude below this is treated as formation shell (suppressed). */
export const V2_RESIDUAL_FLOOR = 12;

export type NormalizedRaster = {
  pixels: Float64Array;
  width: number;
  height: number;
};

export type RegistrationResult = {
  translationX: number;
  translationY: number;
  scale: number;
  quality: number;
  failed: boolean;
};

export type MatchSignalsV2 = {
  residual: number;
  edges: number;
  foreground: number;
  registered: number;
};

export type PairScoreV2 = {
  composite: number;
  signals: MatchSignalsV2;
  registration: RegistrationResult;
};

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

/** Crop diagram region → grayscale → fixed size → light contrast stretch. */
export async function normalizeDiagramRaster(buffer: Buffer): Promise<NormalizedRaster> {
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) {
    throw new Error("V2 normalization failed: could not read dimensions");
  }

  const region = diagramRegionForSize(width, height);
  const { data, info } = await sharp(buffer)
    .extract(region)
    .resize(V2_COMPARE_SIZE, V2_COMPARE_SIZE, { fit: "fill" })
    .grayscale()
    .normalize()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Float64Array(info.width * info.height);
  for (let i = 0; i < pixels.length; i += 1) {
    pixels[i] = data[i];
  }
  return { pixels, width: info.width, height: info.height };
}

function samplePixel(raster: NormalizedRaster, x: number, y: number): number {
  const xi = Math.max(0, Math.min(raster.width - 1, Math.round(x)));
  const yi = Math.max(0, Math.min(raster.height - 1, Math.round(y)));
  return raster.pixels[yi * raster.width + xi];
}

/** Translate `source` by (dx, dy) into a same-size raster (edge clamp). */
export function translateRaster(
  source: NormalizedRaster,
  dx: number,
  dy: number,
): NormalizedRaster {
  const pixels = new Float64Array(source.pixels.length);
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      pixels[y * source.width + x] = samplePixel(source, x - dx, y - dy);
    }
  }
  return { pixels, width: source.width, height: source.height };
}

function mse(a: Float64Array, b: Float64Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return sum / a.length;
}

/**
 * Deterministic translational registration of owned crop onto a reference raster.
 * Searches integer pixel offsets; no rotate/mirror.
 */
export function registerRaster(
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
  let bestMse = Number.POSITIVE_INFINITY;

  for (let dy = -V2_REGISTRATION_SEARCH; dy <= V2_REGISTRATION_SEARCH; dy += 1) {
    for (let dx = -V2_REGISTRATION_SEARCH; dx <= V2_REGISTRATION_SEARCH; dx += 1) {
      const shifted = translateRaster(owned, dx, dy);
      const err = mse(shifted.pixels, reference.pixels);
      if (err < bestMse) {
        bestMse = err;
        bestDx = dx;
        bestDy = dy;
      }
    }
  }

  const rmse = Math.sqrt(bestMse);
  const quality = Math.max(0, Math.min(1, 1 - rmse / 255));
  const failed = quality < 0.55;

  return {
    aligned: translateRaster(owned, bestDx, bestDy),
    registration: {
      translationX: bestDx,
      translationY: bestDy,
      scale: 1,
      quality,
      failed,
    },
  };
}

/** Pixel-wise median across formation reference rasters (formation shell). */
export function buildFormationBaseline(references: NormalizedRaster[]): NormalizedRaster {
  if (references.length === 0) {
    throw new Error("V2 baseline failed: no reference rasters");
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

/** Absolute residual vs formation baseline; floor suppresses shell noise. */
export function playSignature(
  raster: NormalizedRaster,
  baseline: NormalizedRaster,
): NormalizedRaster {
  const pixels = new Float64Array(raster.pixels.length);
  for (let i = 0; i < pixels.length; i += 1) {
    const mag = Math.abs(raster.pixels[i] - baseline.pixels[i]);
    pixels[i] = mag < V2_RESIDUAL_FLOOR ? 0 : mag;
  }
  return { pixels, width: raster.width, height: raster.height };
}

/** Sobel magnitude edge map (0–255-ish), orientation-preserving. */
export function edgeMap(raster: NormalizedRaster): NormalizedRaster {
  const { width, height, pixels } = raster;
  const out = new Float64Array(pixels.length);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const gx =
        -pixels[i - width - 1] +
        pixels[i - width + 1] +
        -2 * pixels[i - 1] +
        2 * pixels[i + 1] +
        -pixels[i + width - 1] +
        pixels[i + width + 1];
      const gy =
        -pixels[i - width - 1] -
        2 * pixels[i - width] -
        pixels[i - width + 1] +
        pixels[i + width - 1] +
        2 * pixels[i + width] +
        pixels[i + width + 1];
      out[i] = Math.min(255, Math.hypot(gx, gy));
    }
  }

  return { pixels: out, width, height };
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

/** Binary foreground overlap (Dice) on residual magnitudes. */
export function foregroundOverlap(
  a: NormalizedRaster,
  b: NormalizedRaster,
  threshold = V2_RESIDUAL_FLOOR,
): number {
  let both = 0;
  let either = 0;
  for (let i = 0; i < a.pixels.length; i += 1) {
    const fa = a.pixels[i] >= threshold;
    const fb = b.pixels[i] >= threshold;
    if (fa || fb) either += 1;
    if (fa && fb) both += 1;
  }
  if (either === 0) return 0;
  return (2 * both) / (either + both);
}

/**
 * Composite weights — calibrated on USC verified pairs + Air Force discrimination.
 * Residual + edges dominate; registered full-frame is a weak stabilizer only.
 */
export const V2_COMPOSITE_WEIGHTS = {
  residual: 0.4,
  edges: 0.35,
  foreground: 0.2,
  registered: 0.05,
} as const;

export function compositeScore(signals: MatchSignalsV2): number {
  const w = V2_COMPOSITE_WEIGHTS;
  return (
    signals.residual * w.residual +
    signals.edges * w.edges +
    signals.foreground * w.foreground +
    signals.registered * w.registered
  );
}

export type PreparedReferenceV2 = {
  raster: NormalizedRaster;
  signature: NormalizedRaster;
  edges: NormalizedRaster;
};

export function prepareReferenceSet(
  referenceRasters: NormalizedRaster[],
): { baseline: NormalizedRaster; prepared: PreparedReferenceV2[] } {
  const baseline = buildFormationBaseline(referenceRasters);
  const prepared = referenceRasters.map((raster) => {
    const signature = playSignature(raster, baseline);
    return {
      raster,
      signature,
      edges: edgeMap(signature),
    };
  });
  return { baseline, prepared };
}

/**
 * Score owned crop against one prepared reference using residual/edge signals.
 * Caller should register the owned raster onto the formation baseline first.
 */
export function scoreAlignedOwnedAgainstReference(
  alignedOwned: NormalizedRaster,
  prepared: PreparedReferenceV2,
  baseline: NormalizedRaster,
  registration: RegistrationResult,
): PairScoreV2 {
  if (registration.failed) {
    return {
      composite: 0,
      signals: { residual: 0, edges: 0, foreground: 0, registered: 0 },
      registration,
    };
  }

  const ownedSig = playSignature(alignedOwned, baseline);
  const ownedEdges = edgeMap(ownedSig);

  const residual =
    0.6 * inverseRmseSimilarity(ownedSig.pixels, prepared.signature.pixels) +
    0.4 * cosineSimilarity(ownedSig.pixels, prepared.signature.pixels);
  const edges =
    0.6 * inverseRmseSimilarity(ownedEdges.pixels, prepared.edges.pixels) +
    0.4 * cosineSimilarity(ownedEdges.pixels, prepared.edges.pixels);
  const foreground = foregroundOverlap(ownedSig, prepared.signature);
  const registered = inverseRmseSimilarity(alignedOwned.pixels, prepared.raster.pixels);

  const signals: MatchSignalsV2 = {
    residual: Math.max(0, Math.min(1, residual)),
    edges: Math.max(0, Math.min(1, edges)),
    foreground: Math.max(0, Math.min(1, foreground)),
    registered: Math.max(0, Math.min(1, registered)),
  };

  return {
    composite: compositeScore(signals),
    signals,
    registration,
  };
}

/** @deprecated Prefer register-to-baseline then scoreAlignedOwnedAgainstReference. */
export function scoreOwnedAgainstReference(
  owned: NormalizedRaster,
  prepared: PreparedReferenceV2,
  baseline: NormalizedRaster,
): PairScoreV2 {
  const { aligned, registration } = registerRaster(owned, prepared.raster);
  return scoreAlignedOwnedAgainstReference(aligned, prepared, baseline, registration);
}

/** Near-exact: registered residual energy is tiny after alignment. */
export function isNormalizedExact(pair: PairScoreV2): boolean {
  return (
    !pair.registration.failed &&
    pair.signals.registered >= 0.97 &&
    pair.signals.residual >= 0.94 &&
    pair.signals.edges >= 0.92
  );
}
