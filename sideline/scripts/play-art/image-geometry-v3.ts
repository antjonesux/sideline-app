/**
 * Matcher V3.2 geometry resolver (REVIEW cases only).
 *
 * Fail-closed secondary pass over play-ink geometry:
 * connected components, spatial grid, L/R occupancy, directional histograms,
 * plus per-hue (warm/cool/other) spatial + occupancy signals.
 * Does NOT loosen V3 PASS thresholds. No mirror invariance. No OCR.
 */
import sharp from "sharp";
import {
  V2_COMPARE_SIZE,
  V2_DIAGRAM_REGION,
  V2_RESIDUAL_FLOOR,
  type NormalizedRaster,
  type RegistrationResult,
} from "./image-similarity-v2";
import {
  playEdgeMap,
  playSignature,
  type MatchSignalsV3,
  type PreparedReferenceV3,
} from "./image-similarity-v3";

/** Coarse spatial grid — robust to small registration residual. */
export const GEOMETRY_GRID_COLS = 4;
export const GEOMETRY_GRID_ROWS = 3;

/** Orientation bins for gradient histogram (0–180°, unsigned). */
export const GEOMETRY_ORIENTATION_BINS = 8;

/** Minimum component area (pixels) after ink thresholding. */
export const GEOMETRY_MIN_COMPONENT_AREA = 8;

/**
 * Hue buckets from source-image evidence (S>0.25 peaks ~65°/225°/345°).
 * warm ≈ reds/oranges/yellows; cool ≈ cyans/blues; other ≈ remainder (~5% mass).
 */
export const HUE_CLASS_NAMES = ["warm", "cool", "other"] as const;
export type HueClassName = (typeof HUE_CLASS_NAMES)[number];

/** Minimum per-hue density to treat a channel as active (else empty↔empty = agree). */
export const PER_HUE_MIN_DENSITY = 0.0004;

/** Geometry composite weights — V3.2: combined ink + per-hue spatial/occupancy. */
export const GEOMETRY_COMPOSITE_WEIGHTS = {
  spatialGrid: 0.18,
  occupancy: 0.24,
  directional: 0.2,
  components: 0.1,
  topology: 0.05,
  endpoints: 0.07,
  perHueSpatial: 0.09,
  perHueOccupancy: 0.07,
} as const;

/** Run/option vs pass weighting nudges (canonical playType from seed when available). */
export const GEOMETRY_FAMILY_WEIGHT_NUDGE = {
  run: {
    occupancy: 0.04,
    directional: 0.04,
    spatialGrid: -0.04,
    endpoints: -0.04,
    perHueOccupancy: 0.02,
    perHueSpatial: -0.02,
  },
  pass: {
    endpoints: 0.06,
    spatialGrid: 0.02,
    occupancy: -0.04,
    directional: -0.04,
    perHueSpatial: 0.02,
    perHueOccupancy: -0.02,
  },
} as const;

/**
 * Confidence gates for promoting V3 REVIEW → geometry PASS.
 * Conservative: wrong geometry PASS must stay 0 on USC calibration.
 *
 * Two paths:
 * - confirm: geometry agrees with V3 local-best assignment (safer, lower margin)
 * - switch: geometry uniquely prefers a different candidate (stricter)
 *
 * V3.2: confirm margin may use a lower combined floor when max per-hue margin is clear.
 */
export const GEOMETRY_PASS_THRESHOLDS = {
  /** Minimum geometry composite for confirm-path promotion. */
  confirmMinScore: 0.88,
  /** Minimum geometry margin when confirming V3 local-best. */
  confirmMinMargin: 0.012,
  /**
   * Lower combined-margin floor when a single hue channel separates clearly
   * (Option B hybrid — only with confirm path + V3 local-best).
   */
  confirmMinMarginWithPerHue: 0.006,
  /** Minimum max-per-hue margin to unlock the thinner confirm floor. */
  perHueConfirmMinMargin: 0.04,
  /** Minimum V3 composite to allow confirm-path (still REVIEW, but close). */
  confirmV3MinScore: 0.7,
  /**
   * Minimum V3 margin for confirm-path. Blocks weak V3 local-best ties
   * (e.g. AF Speed Option mis-confirmed as Midline Read Option at margin≈0.003).
   */
  confirmV3MinMargin: 0.005,
  /** Minimum geometry composite for switch-path promotion. */
  passMinScore: 0.82,
  /** Minimum geometry margin over runner-up for switch-path. */
  passMinMargin: 0.055,
  /** Orientation (L/R occupancy) agreement floor. */
  orientationMin: 0.72,
  /** Spatial-grid agreement floor. */
  spatialMin: 0.7,
  /** Reject if ink mask is nearly empty (component/registration failure). */
  minInkDensity: 0.004,
  /** V3 "strong preference" for conflict detection (still REVIEW, but committed). */
  v3StrongScore: 0.78,
  v3StrongMargin: 0.015,
  /** Geometry "strong preference" for conflict detection. */
  geometryStrongScore: 0.8,
  geometryStrongMargin: 0.05,
} as const;

export type GeometryStatus = "geometry-pass" | "geometry-review" | "geometry-fail";

export type GeometryPlayFamily = "run" | "pass" | "unknown";

export type GeometryComponent = {
  area: number;
  centroidX: number;
  centroidY: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
  aspectRatio: number;
  /** Side: -1 left, 0 center, +1 right. */
  side: -1 | 0 | 1;
  /** Depth: -1 backfield, 0 mid, +1 downfield (image top = downfield). */
  depth: -1 | 0 | 1;
  orientationDeg: number;
  pathLength: number;
  endpointA: { x: number; y: number };
  endpointB: { x: number; y: number };
};

export type GeometryOccupancy = {
  leftHalf: number;
  rightHalf: number;
  farLeft: number;
  farRight: number;
  backfieldCenter: number;
  lineOfScrimmage: number;
  downfield: number;
  /** (right - left) / (right + left). */
  lrBalance: number;
};

/** Compact occupancy used for per-hue L/R / depth signals. */
export type PerHueOccupancy = {
  leftHalf: number;
  rightHalf: number;
  lrBalance: number;
  downfield: number;
  backfieldCenter: number;
};

/**
 * Per-hue geometry channel (warm / cool / other).
 * Directional histograms are diagnostic-only in V3.2 (did not add stable
 * separation beyond spatial+occupancy on hard-case probes).
 */
export type PerHueGeometryFeatures = {
  density: number;
  spatialGrid: Float64Array;
  occupancy: PerHueOccupancy;
  /** 8-bin orientation hist — stored for diagnostics; not in composite. */
  orientationHist: Float64Array;
  leftwardEnergy: number;
  rightwardEnergy: number;
};

export type GeometryFeatures = {
  inkDensity: number;
  colorInkDensity: number;
  edgeDensity: number;
  /** Flattened GEOMETRY_GRID_COLS × GEOMETRY_GRID_ROWS ink densities. */
  spatialGrid: Float64Array;
  /** Per-cell colored-ink density. */
  colorGrid: Float64Array;
  /** Per-cell edge density. */
  edgeGrid: Float64Array;
  /** Per-cell major-component count (normalized). */
  componentGrid: Float64Array;
  occupancy: GeometryOccupancy;
  /** Unsigned orientation histogram (sum≈1). */
  orientationHist: Float64Array;
  leftwardEnergy: number;
  rightwardEnergy: number;
  verticalEnergy: number;
  horizontalEnergy: number;
  diagonalEnergy: number;
  components: GeometryComponent[];
  majorComponentCount: number;
  longComponentCount: number;
  backfieldComponentCount: number;
  downfieldComponentCount: number;
  endpointCount: number;
  /** Top endpoint positions normalized to [0,1] (x,y pairs, up to 6). */
  endpointSignature: Float64Array;
  /** Warm / cool / other color-ink mass fractions (sum≈1 when ink present). */
  colorClassMass: { warm: number; cool: number; other: number };
  /** Per-hue spatial + occupancy feature channels. */
  perHue: Record<HueClassName, PerHueGeometryFeatures>;
  failed: boolean;
  failReason: string | null;
};

export type GeometrySignals = {
  spatial: number;
  occupancy: number;
  directional: number;
  components: number;
  topology: number;
  endpoints: number;
  orientation: number;
  /** Mean active-channel per-hue spatial similarity. */
  perHueSpatial: number;
  /** Mean active-channel per-hue occupancy similarity. */
  perHueOccupancy: number;
  /** Per-channel composite (spatial+occupancy) for diagnostics. */
  perHueByChannel: { warm: number; cool: number; other: number };
};

export type GeometryPairScore = {
  composite: number;
  signals: GeometrySignals;
  featuresOwned: GeometryFeatures;
  featuresRef: GeometryFeatures;
};

export type GeometryCandidateScore = {
  playIndex: number;
  playName: string;
  score: number;
  signals: GeometrySignals;
};

export type GeometryResolveResult = {
  status: GeometryStatus;
  /** Play index to use if geometry-pass (may differ from V3 assignment). */
  playIndex: number;
  playName: string;
  geometryScore: number;
  geometryRunnerUpPlay: string | null;
  geometryRunnerUpScore: number | null;
  geometryMargin: number | null;
  signals: GeometrySignals | null;
  conflictWithV3: boolean;
  candidates: GeometryCandidateScore[];
  reason: string;
  /** Per-hue margin (chosen vs runner-up) for each channel. */
  perHueMargins: { warm: number; cool: number; other: number } | null;
  maxPerHueMargin: number | null;
  maxPerHueChannel: HueClassName | null;
  /** True when per-hue evidence unlocked the thinner confirm margin. */
  perHuePromoted: boolean;
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function cosineSimilarity(a: Float64Array | number[], b: Float64Array | number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 && nb === 0) return 1;
  if (na === 0 || nb === 0) return 0;
  return clamp01((dot / Math.sqrt(na * nb) + 1) / 2);
}

function histSimilarity(a: Float64Array, b: Float64Array): number {
  // Intersection similarity for normalized histograms.
  let inter = 0;
  for (let i = 0; i < a.length; i += 1) {
    inter += Math.min(a[i], b[i]);
  }
  return clamp01(inter);
}

function scalarAgreement(a: number, b: number, scale: number): number {
  return clamp01(1 - Math.abs(a - b) / scale);
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

/**
 * Extract hue-bucket color-ink rasters (warm / cool / other) from source bytes.
 * Retains color identity without collapsing to grayscale too early.
 */
export async function extractColorClassMasks(buffer: Buffer): Promise<{
  warm: NormalizedRaster;
  cool: NormalizedRaster;
  other: NormalizedRaster;
  combined: NormalizedRaster;
}> {
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) {
    throw new Error("Geometry color classes: could not read dimensions");
  }
  const region = diagramRegionForSize(width, height);
  const { data, info } = await sharp(buffer)
    .extract(region)
    .resize(V2_COMPARE_SIZE, V2_COMPARE_SIZE, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const n = info.width * info.height;
  const warm = new Float64Array(n);
  const cool = new Float64Array(n);
  const other = new Float64Array(n);
  const combined = new Float64Array(n);

  for (let i = 0; i < n; i += 1) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    if (sat <= 0.18 || max <= 40) continue;

    const ink = Math.min(255, sat * 255);
    combined[i] = ink;

    // Hue in degrees from RGB (simplified).
    let hue = 0;
    const delta = max - min;
    if (delta > 0) {
      if (max === r) hue = ((g - b) / delta) % 6;
      else if (max === g) hue = (b - r) / delta + 2;
      else hue = (r - g) / delta + 4;
      hue *= 60;
      if (hue < 0) hue += 360;
    }

    // Warm: reds/oranges/yellows (routes/arrows often). Cool: cyans/blues/greens (blocks/option).
    if (hue < 70 || hue >= 320) warm[i] = ink;
    else if (hue >= 140 && hue < 260) cool[i] = ink;
    else other[i] = ink;
  }

  return {
    warm: { pixels: warm, width: info.width, height: info.height },
    cool: { pixels: cool, width: info.width, height: info.height },
    other: { pixels: other, width: info.width, height: info.height },
    combined: { pixels: combined, width: info.width, height: info.height },
  };
}

/**
 * Build play-specific ink mask: variance-weighted residual ∪ color ink, noise-suppressed.
 */
export function buildPlayInkMask(input: {
  signature: NormalizedRaster;
  colorInk: NormalizedRaster;
  varianceWeight: NormalizedRaster;
  edges?: NormalizedRaster;
}): NormalizedRaster {
  const { signature, colorInk, varianceWeight } = input;
  const edges = input.edges ?? playEdgeMap(signature);
  const n = signature.pixels.length;
  const pixels = new Float64Array(n);
  const residualFloor = V2_RESIDUAL_FLOOR + 6;

  for (let i = 0; i < n; i += 1) {
    const w = varianceWeight.pixels[i];
    const residual = signature.pixels[i] >= residualFloor ? signature.pixels[i] * w : 0;
    const color = colorInk.pixels[i] >= 20 ? colorInk.pixels[i] : 0;
    const edge = edges.pixels[i] >= 40 ? edges.pixels[i] * 0.35 : 0;
    // Emphasize color + residual; edges reinforce thin paths.
    const ink = Math.max(residual * 0.85, color * 1.1) + edge * 0.25;
    pixels[i] = ink >= 14 ? Math.min(255, ink) : 0;
  }

  return { pixels, width: signature.width, height: signature.height };
}

function binaryMask(ink: NormalizedRaster, threshold = 14): Uint8Array {
  const out = new Uint8Array(ink.pixels.length);
  for (let i = 0; i < ink.pixels.length; i += 1) {
    out[i] = ink.pixels[i] >= threshold ? 1 : 0;
  }
  return out;
}

function connectedComponents(
  mask: Uint8Array,
  width: number,
  height: number,
  ink: NormalizedRaster,
): GeometryComponent[] {
  const visited = new Uint8Array(mask.length);
  const components: GeometryComponent[] = [];
  const stack: number[] = [];

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;
    stack.length = 0;
    stack.push(start);
    visited[start] = 1;

    let area = 0;
    let sumX = 0;
    let sumY = 0;
    let sumInk = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    let momentXX = 0;
    let momentYY = 0;
    let momentXY = 0;
    const pixels: number[] = [];

    while (stack.length > 0) {
      const i = stack.pop()!;
      const x = i % width;
      const y = (i / width) | 0;
      area += 1;
      pixels.push(i);
      const v = ink.pixels[i];
      sumX += x * v;
      sumY += y * v;
      sumInk += v;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const ni = ny * width + nx;
          if (!mask[ni] || visited[ni]) continue;
          visited[ni] = 1;
          stack.push(ni);
        }
      }
    }

    if (area < GEOMETRY_MIN_COMPONENT_AREA) continue;

    const centroidX = sumInk > 0 ? sumX / sumInk : (minX + maxX) / 2;
    const centroidY = sumInk > 0 ? sumY / sumInk : (minY + maxY) / 2;

    for (const i of pixels) {
      const x = i % width;
      const y = (i / width) | 0;
      const dx = x - centroidX;
      const dy = y - centroidY;
      const v = ink.pixels[i];
      momentXX += v * dx * dx;
      momentYY += v * dy * dy;
      momentXY += v * dx * dy;
    }

    // PCA major-axis angle.
    const orientationRad = 0.5 * Math.atan2(2 * momentXY, momentXX - momentYY);
    const orientationDeg = ((orientationRad * 180) / Math.PI + 180) % 180;

    // Endpoint candidates: farthest pair of pixels in the component (approx path ends).
    let endpointA = { x: minX, y: minY };
    let endpointB = { x: maxX, y: maxY };
    let bestDist = -1;
    // Sample for speed on large components.
    const step = Math.max(1, Math.floor(pixels.length / 80));
    for (let ai = 0; ai < pixels.length; ai += step) {
      const ia = pixels[ai];
      const ax = ia % width;
      const ay = (ia / width) | 0;
      for (let bi = ai + step; bi < pixels.length; bi += step) {
        const ib = pixels[bi];
        const bx = ib % width;
        const by = (ib / width) | 0;
        const d = (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
        if (d > bestDist) {
          bestDist = d;
          endpointA = { x: ax, y: ay };
          endpointB = { x: bx, y: by };
        }
      }
    }

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    const midX = width / 2;
    const thirdY = height / 3;
    let side: -1 | 0 | 1 = 0;
    if (centroidX < midX * 0.85) side = -1;
    else if (centroidX > midX * 1.15) side = 1;
    let depth: -1 | 0 | 1 = 0;
    if (centroidY < thirdY) depth = 1; // top = downfield
    else if (centroidY > height - thirdY) depth = -1; // bottom = backfield

    components.push({
      area,
      centroidX,
      centroidY,
      minX,
      maxX,
      minY,
      maxY,
      width: w,
      height: h,
      aspectRatio: h > 0 ? w / h : 1,
      side,
      depth,
      orientationDeg,
      pathLength: Math.sqrt(Math.max(0, bestDist)),
      endpointA,
      endpointB,
    });
  }

  components.sort((a, b) => b.area - a.area);
  return components;
}

function occupancyFromInk(ink: NormalizedRaster): GeometryOccupancy {
  const { width, height, pixels } = ink;
  const midX = width / 2;
  const far = width * 0.25;
  const losTop = height * 0.4;
  const losBot = height * 0.7;
  const backTop = height * 0.7;

  let leftHalf = 0;
  let rightHalf = 0;
  let farLeft = 0;
  let farRight = 0;
  let backfieldCenter = 0;
  let lineOfScrimmage = 0;
  let downfield = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const v = pixels[y * width + x];
      if (v <= 0) continue;
      if (x < midX) leftHalf += v;
      else rightHalf += v;
      if (x < far) farLeft += v;
      if (x >= width - far) farRight += v;
      if (y < losTop) downfield += v;
      if (y >= losTop && y < losBot) lineOfScrimmage += v;
      if (y >= backTop && x >= width * 0.3 && x < width * 0.7) backfieldCenter += v;
    }
  }

  const lrSum = leftHalf + rightHalf;
  return {
    leftHalf,
    rightHalf,
    farLeft,
    farRight,
    backfieldCenter,
    lineOfScrimmage,
    downfield,
    lrBalance: lrSum > 0 ? (rightHalf - leftHalf) / lrSum : 0,
  };
}

function directionalFeatures(ink: NormalizedRaster): {
  hist: Float64Array;
  leftward: number;
  rightward: number;
  vertical: number;
  horizontal: number;
  diagonal: number;
} {
  const { width, height, pixels } = ink;
  const hist = new Float64Array(GEOMETRY_ORIENTATION_BINS);
  let leftward = 0;
  let rightward = 0;
  let vertical = 0;
  let horizontal = 0;
  let diagonal = 0;
  let total = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      if (pixels[i] <= 0) continue;
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
      const mag = Math.hypot(gx, gy);
      if (mag < 8) continue;

      // Gradient angle → path orientation is perpendicular; use edge orientation.
      let deg = ((Math.atan2(gy, gx) * 180) / Math.PI + 180) % 180;
      const bin = Math.min(
        GEOMETRY_ORIENTATION_BINS - 1,
        Math.floor((deg / 180) * GEOMETRY_ORIENTATION_BINS),
      );
      hist[bin] += mag;
      total += mag;

      // Path direction approx: tangent ≈ perpendicular to gradient.
      const pathAngle = (deg + 90) % 180;
      if (pathAngle < 30 || pathAngle >= 150) horizontal += mag;
      else if (pathAngle >= 60 && pathAngle < 120) vertical += mag;
      else diagonal += mag;

      // Signed left/right from gx of residual flow along x.
      if (gx > 0) rightward += mag;
      else leftward += mag;
    }
  }

  if (total > 0) {
    for (let i = 0; i < hist.length; i += 1) hist[i] /= total;
    leftward /= total;
    rightward /= total;
    vertical /= total;
    horizontal /= total;
    diagonal /= total;
  }

  return { hist, leftward, rightward, vertical, horizontal, diagonal };
}

function spatialGrids(
  ink: NormalizedRaster,
  colorInk: NormalizedRaster,
  edges: NormalizedRaster,
  components: GeometryComponent[],
): {
  spatialGrid: Float64Array;
  colorGrid: Float64Array;
  edgeGrid: Float64Array;
  componentGrid: Float64Array;
} {
  const { width, height } = ink;
  const cells = GEOMETRY_GRID_COLS * GEOMETRY_GRID_ROWS;
  const spatialGrid = new Float64Array(cells);
  const colorGrid = new Float64Array(cells);
  const edgeGrid = new Float64Array(cells);
  const componentGrid = new Float64Array(cells);
  const cellW = width / GEOMETRY_GRID_COLS;
  const cellH = height / GEOMETRY_GRID_ROWS;
  const cellArea = cellW * cellH;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const col = Math.min(GEOMETRY_GRID_COLS - 1, Math.floor(x / cellW));
      const row = Math.min(GEOMETRY_GRID_ROWS - 1, Math.floor(y / cellH));
      const c = row * GEOMETRY_GRID_COLS + col;
      const i = y * width + x;
      spatialGrid[c] += ink.pixels[i];
      colorGrid[c] += colorInk.pixels[i];
      edgeGrid[c] += edges.pixels[i];
    }
  }

  for (let c = 0; c < cells; c += 1) {
    spatialGrid[c] /= cellArea * 255;
    colorGrid[c] /= cellArea * 255;
    edgeGrid[c] /= cellArea * 255;
  }

  for (const comp of components) {
    if (comp.area < GEOMETRY_MIN_COMPONENT_AREA * 2) continue;
    const col = Math.min(GEOMETRY_GRID_COLS - 1, Math.floor(comp.centroidX / cellW));
    const row = Math.min(GEOMETRY_GRID_ROWS - 1, Math.floor(comp.centroidY / cellH));
    componentGrid[row * GEOMETRY_GRID_COLS + col] += 1;
  }
  const maxComp = Math.max(1, ...componentGrid);
  for (let c = 0; c < cells; c += 1) componentGrid[c] /= maxComp;

  return { spatialGrid, colorGrid, edgeGrid, componentGrid };
}

function colorClassMass(warm: NormalizedRaster, cool: NormalizedRaster, other: NormalizedRaster): {
  warm: number;
  cool: number;
  other: number;
} {
  let w = 0;
  let c = 0;
  let o = 0;
  for (let i = 0; i < warm.pixels.length; i += 1) {
    w += warm.pixels[i];
    c += cool.pixels[i];
    o += other.pixels[i];
  }
  const sum = w + c + o;
  if (sum <= 0) return { warm: 0, cool: 0, other: 0 };
  return { warm: w / sum, cool: c / sum, other: o / sum };
}

function inkDensityOf(ink: NormalizedRaster): number {
  let sum = 0;
  for (let i = 0; i < ink.pixels.length; i += 1) sum += ink.pixels[i];
  return sum / (ink.pixels.length * 255);
}

function spatialGridFromInk(ink: NormalizedRaster): Float64Array {
  const { width, height, pixels } = ink;
  const cells = GEOMETRY_GRID_COLS * GEOMETRY_GRID_ROWS;
  const spatialGrid = new Float64Array(cells);
  const cellW = width / GEOMETRY_GRID_COLS;
  const cellH = height / GEOMETRY_GRID_ROWS;
  const cellArea = cellW * cellH;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const col = Math.min(GEOMETRY_GRID_COLS - 1, Math.floor(x / cellW));
      const row = Math.min(GEOMETRY_GRID_ROWS - 1, Math.floor(y / cellH));
      spatialGrid[row * GEOMETRY_GRID_COLS + col] += pixels[y * width + x];
    }
  }
  for (let c = 0; c < cells; c += 1) spatialGrid[c] /= cellArea * 255;
  return spatialGrid;
}

function perHueOccupancyFromInk(ink: NormalizedRaster): PerHueOccupancy {
  const full = occupancyFromInk(ink);
  return {
    leftHalf: full.leftHalf,
    rightHalf: full.rightHalf,
    lrBalance: full.lrBalance,
    downfield: full.downfield,
    backfieldCenter: full.backfieldCenter,
  };
}

function emptyPerHueFeatures(): PerHueGeometryFeatures {
  return {
    density: 0,
    spatialGrid: new Float64Array(GEOMETRY_GRID_COLS * GEOMETRY_GRID_ROWS),
    occupancy: {
      leftHalf: 0,
      rightHalf: 0,
      lrBalance: 0,
      downfield: 0,
      backfieldCenter: 0,
    },
    orientationHist: new Float64Array(GEOMETRY_ORIENTATION_BINS),
    leftwardEnergy: 0,
    rightwardEnergy: 0,
  };
}

export function extractPerHueFeatures(mask: NormalizedRaster): PerHueGeometryFeatures {
  const density = inkDensityOf(mask);
  if (density < PER_HUE_MIN_DENSITY * 0.25) {
    return emptyPerHueFeatures();
  }
  const directional = directionalFeatures(mask);
  return {
    density,
    spatialGrid: spatialGridFromInk(mask),
    occupancy: perHueOccupancyFromInk(mask),
    orientationHist: directional.hist,
    leftwardEnergy: directional.leftward,
    rightwardEnergy: directional.rightward,
  };
}

function emptyPerHueRecord(): Record<HueClassName, PerHueGeometryFeatures> {
  return {
    warm: emptyPerHueFeatures(),
    cool: emptyPerHueFeatures(),
    other: emptyPerHueFeatures(),
  };
}

/** L1 spatial similarity — better than cosine alone on sparse near-collinear hue grids. */
function spatialL1Similarity(a: Float64Array, b: Float64Array): number {
  let l1 = 0;
  let sa = 0;
  let sb = 0;
  for (let i = 0; i < a.length; i += 1) {
    l1 += Math.abs(a[i] - b[i]);
    sa += a[i];
    sb += b[i];
  }
  return clamp01(1 - l1 / Math.max(sa + sb, 1e-6));
}

function perHueOccupancyVector(o: PerHueOccupancy): Float64Array {
  const sum = o.leftHalf + o.rightHalf + o.downfield + o.backfieldCenter + 1e-6;
  return new Float64Array([
    o.leftHalf / sum,
    o.rightHalf / sum,
    o.downfield / sum,
    o.backfieldCenter / sum,
    (o.lrBalance + 1) / 2,
  ]);
}

function scorePerHueChannel(
  owned: PerHueGeometryFeatures,
  ref: PerHueGeometryFeatures,
): { spatial: number; occupancy: number; composite: number; active: boolean } {
  const ownedActive = owned.density >= PER_HUE_MIN_DENSITY;
  const refActive = ref.density >= PER_HUE_MIN_DENSITY;
  if (!ownedActive && !refActive) {
    return { spatial: 1, occupancy: 1, composite: 1, active: false };
  }
  if (!ownedActive || !refActive) {
    return { spatial: 0, occupancy: 0, composite: 0, active: true };
  }
  const spatial = clamp01(
    0.55 * spatialL1Similarity(owned.spatialGrid, ref.spatialGrid) +
      0.45 * cosineSimilarity(owned.spatialGrid, ref.spatialGrid),
  );
  const occupancy = clamp01(
    0.55 *
      cosineSimilarity(perHueOccupancyVector(owned.occupancy), perHueOccupancyVector(ref.occupancy)) +
      0.45 * Math.pow(scalarAgreement(owned.occupancy.lrBalance, ref.occupancy.lrBalance, 2), 1.4),
  );
  const densitySim = clamp01(
    1 - Math.abs(owned.density - ref.density) / Math.max(owned.density, ref.density, 1e-6),
  );
  const composite = clamp01(0.4 * spatial + 0.35 * occupancy + 0.25 * densitySim);
  return { spatial, occupancy, composite, active: true };
}

function endpointSignature(components: GeometryComponent[], width: number, height: number): {
  count: number;
  signature: Float64Array;
} {
  const ends: Array<{ x: number; y: number; area: number }> = [];
  for (const comp of components.slice(0, 8)) {
    if (comp.area < GEOMETRY_MIN_COMPONENT_AREA * 2) continue;
    ends.push({ x: comp.endpointA.x, y: comp.endpointA.y, area: comp.area });
    ends.push({ x: comp.endpointB.x, y: comp.endpointB.y, area: comp.area });
  }
  ends.sort((a, b) => b.area - a.area);
  const top = ends.slice(0, 6);
  const signature = new Float64Array(12);
  for (let i = 0; i < top.length; i += 1) {
    signature[i * 2] = top[i].x / width;
    signature[i * 2 + 1] = top[i].y / height;
  }
  return { count: top.length, signature };
}

/**
 * Extract full geometry feature vector from an aligned play raster + color ink.
 */
export function extractGeometryFeatures(input: {
  alignedRaster: NormalizedRaster;
  colorInk: NormalizedRaster;
  baseline: NormalizedRaster;
  varianceWeight: NormalizedRaster;
  colorClasses?: {
    warm: NormalizedRaster;
    cool: NormalizedRaster;
    other: NormalizedRaster;
  };
}): GeometryFeatures {
  const signature = playSignature(input.alignedRaster, input.baseline);
  const edges = playEdgeMap(signature);
  const ink = buildPlayInkMask({
    signature,
    colorInk: input.colorInk,
    varianceWeight: input.varianceWeight,
    edges,
  });

  const { width, height } = ink;
  const n = ink.pixels.length;
  let inkSum = 0;
  let colorSum = 0;
  let edgeSum = 0;
  for (let i = 0; i < n; i += 1) {
    inkSum += ink.pixels[i];
    colorSum += input.colorInk.pixels[i];
    edgeSum += edges.pixels[i];
  }
  const inkDensity = inkSum / (n * 255);
  const colorInkDensity = colorSum / (n * 255);
  const edgeDensity = edgeSum / (n * 255);

  if (inkDensity < GEOMETRY_PASS_THRESHOLDS.minInkDensity * 0.25) {
    return emptyFeatures("near-empty ink mask");
  }

  const mask = binaryMask(ink);
  const components = connectedComponents(mask, width, height, ink);
  if (components.length === 0) {
    return emptyFeatures("no connected components");
  }

  const occupancy = occupancyFromInk(ink);
  const directional = directionalFeatures(ink);
  const grids = spatialGrids(ink, input.colorInk, edges, components);
  const ends = endpointSignature(components, width, height);

  const major = components.filter((c) => c.area >= GEOMETRY_MIN_COMPONENT_AREA * 3);
  const long = components.filter((c) => c.pathLength >= Math.min(width, height) * 0.25);
  const backfield = components.filter((c) => c.depth === -1);
  const downfield = components.filter((c) => c.depth === 1);

  const classes = input.colorClasses
    ? colorClassMass(input.colorClasses.warm, input.colorClasses.cool, input.colorClasses.other)
    : { warm: 0, cool: 0, other: colorInkDensity > 0 ? 1 : 0 };

  const perHue: Record<HueClassName, PerHueGeometryFeatures> = input.colorClasses
    ? {
        warm: extractPerHueFeatures(input.colorClasses.warm),
        cool: extractPerHueFeatures(input.colorClasses.cool),
        other: extractPerHueFeatures(input.colorClasses.other),
      }
    : emptyPerHueRecord();

  return {
    inkDensity,
    colorInkDensity,
    edgeDensity,
    spatialGrid: grids.spatialGrid,
    colorGrid: grids.colorGrid,
    edgeGrid: grids.edgeGrid,
    componentGrid: grids.componentGrid,
    occupancy,
    orientationHist: directional.hist,
    leftwardEnergy: directional.leftward,
    rightwardEnergy: directional.rightward,
    verticalEnergy: directional.vertical,
    horizontalEnergy: directional.horizontal,
    diagonalEnergy: directional.diagonal,
    components,
    majorComponentCount: major.length,
    longComponentCount: long.length,
    backfieldComponentCount: backfield.length,
    downfieldComponentCount: downfield.length,
    endpointCount: ends.count,
    endpointSignature: ends.signature,
    colorClassMass: classes,
    perHue,
    failed: false,
    failReason: null,
  };
}

function emptyFeatures(reason: string): GeometryFeatures {
  const cells = GEOMETRY_GRID_COLS * GEOMETRY_GRID_ROWS;
  return {
    inkDensity: 0,
    colorInkDensity: 0,
    edgeDensity: 0,
    spatialGrid: new Float64Array(cells),
    colorGrid: new Float64Array(cells),
    edgeGrid: new Float64Array(cells),
    componentGrid: new Float64Array(cells),
    occupancy: {
      leftHalf: 0,
      rightHalf: 0,
      farLeft: 0,
      farRight: 0,
      backfieldCenter: 0,
      lineOfScrimmage: 0,
      downfield: 0,
      lrBalance: 0,
    },
    orientationHist: new Float64Array(GEOMETRY_ORIENTATION_BINS),
    leftwardEnergy: 0,
    rightwardEnergy: 0,
    verticalEnergy: 0,
    horizontalEnergy: 0,
    diagonalEnergy: 0,
    components: [],
    majorComponentCount: 0,
    longComponentCount: 0,
    backfieldComponentCount: 0,
    downfieldComponentCount: 0,
    endpointCount: 0,
    endpointSignature: new Float64Array(12),
    colorClassMass: { warm: 0, cool: 0, other: 0 },
    perHue: emptyPerHueRecord(),
    failed: true,
    failReason: reason,
  };
}

function componentCentroidSignature(features: GeometryFeatures): Float64Array {
  // Top-6 major component centroids + sides (normalized).
  const sig = new Float64Array(18);
  const top = features.components.slice(0, 6);
  for (let i = 0; i < top.length; i += 1) {
    const c = top[i];
    sig[i * 3] = c.centroidX / 96;
    sig[i * 3 + 1] = c.centroidY / 96;
    sig[i * 3 + 2] = (c.side + 1) / 2;
  }
  return sig;
}

function topologyVector(features: GeometryFeatures): Float64Array {
  return new Float64Array([
    features.majorComponentCount / 12,
    features.longComponentCount / 8,
    features.backfieldComponentCount / 8,
    features.downfieldComponentCount / 8,
    features.endpointCount / 12,
    features.colorClassMass.warm,
    features.colorClassMass.cool,
    features.colorClassMass.other,
  ]);
}

function occupancyVector(o: GeometryOccupancy): Float64Array {
  const sum =
    o.leftHalf +
    o.rightHalf +
    o.farLeft +
    o.farRight +
    o.backfieldCenter +
    o.lineOfScrimmage +
    o.downfield +
    1e-6;
  return new Float64Array([
    o.leftHalf / sum,
    o.rightHalf / sum,
    o.farLeft / sum,
    o.farRight / sum,
    o.backfieldCenter / sum,
    o.lineOfScrimmage / sum,
    o.downfield / sum,
    (o.lrBalance + 1) / 2,
  ]);
}

function directionalVector(f: GeometryFeatures): Float64Array {
  return new Float64Array([
    ...f.orientationHist,
    f.leftwardEnergy,
    f.rightwardEnergy,
    f.verticalEnergy,
    f.horizontalEnergy,
    f.diagonalEnergy,
  ]);
}

export function inferGeometryFamily(playType: string | null | undefined): GeometryPlayFamily {
  if (!playType) return "unknown";
  const t = playType.trim().toLowerCase();
  // Seed labels: Run, Pass, Play Action, Screen, Option, RPO, …
  if (t === "pass" || t === "play action" || t === "screen") return "pass";
  if (t === "run" || t === "option" || t === "rpo") return "run";
  if (t.includes("pass") || t.includes("play action") || t.includes("screen")) return "pass";
  if (t.includes("run") || t.includes("option") || t.includes("rpo")) return "run";
  return "unknown";
}

function weightsForFamily(family: GeometryPlayFamily): typeof GEOMETRY_COMPOSITE_WEIGHTS {
  const base = { ...GEOMETRY_COMPOSITE_WEIGHTS };
  if (family === "run") {
    const n = GEOMETRY_FAMILY_WEIGHT_NUDGE.run;
    base.occupancy += n.occupancy;
    base.directional += n.directional;
    base.spatialGrid += n.spatialGrid;
    base.endpoints += n.endpoints;
    base.perHueOccupancy += n.perHueOccupancy;
    base.perHueSpatial += n.perHueSpatial;
  } else if (family === "pass") {
    const n = GEOMETRY_FAMILY_WEIGHT_NUDGE.pass;
    base.endpoints += n.endpoints;
    base.spatialGrid += n.spatialGrid;
    base.occupancy += n.occupancy;
    base.directional += n.directional;
    base.perHueSpatial += n.perHueSpatial;
    base.perHueOccupancy += n.perHueOccupancy;
  }
  const sum =
    base.spatialGrid +
    base.occupancy +
    base.directional +
    base.components +
    base.topology +
    base.endpoints +
    base.perHueSpatial +
    base.perHueOccupancy;
  base.spatialGrid /= sum;
  base.occupancy /= sum;
  base.directional /= sum;
  base.components /= sum;
  base.topology /= sum;
  base.endpoints /= sum;
  base.perHueSpatial /= sum;
  base.perHueOccupancy /= sum;
  return base;
}

function emptyGeometrySignals(): GeometrySignals {
  return {
    spatial: 0,
    occupancy: 0,
    directional: 0,
    components: 0,
    topology: 0,
    endpoints: 0,
    orientation: 0,
    perHueSpatial: 0,
    perHueOccupancy: 0,
    perHueByChannel: { warm: 0, cool: 0, other: 0 },
  };
}

/**
 * Compare geometry features of owned crop vs a reference candidate.
 */
export function scoreGeometryPair(
  owned: GeometryFeatures,
  ref: GeometryFeatures,
  family: GeometryPlayFamily = "unknown",
): GeometryPairScore {
  if (owned.failed || ref.failed) {
    return {
      composite: 0,
      signals: emptyGeometrySignals(),
      featuresOwned: owned,
      featuresRef: ref,
    };
  }

  const spatial = clamp01(
    0.5 * cosineSimilarity(owned.spatialGrid, ref.spatialGrid) +
      0.3 * cosineSimilarity(owned.colorGrid, ref.colorGrid) +
      0.2 * cosineSimilarity(owned.edgeGrid, ref.edgeGrid),
  );

  const occupancy = clamp01(
    0.45 * cosineSimilarity(occupancyVector(owned.occupancy), occupancyVector(ref.occupancy)) +
      0.4 * Math.pow(scalarAgreement(owned.occupancy.lrBalance, ref.occupancy.lrBalance, 2), 1.5) +
      0.15 *
        scalarAgreement(
          owned.occupancy.farRight - owned.occupancy.farLeft,
          ref.occupancy.farRight - ref.occupancy.farLeft,
          Math.max(
            1,
            Math.abs(owned.occupancy.farRight) +
              Math.abs(owned.occupancy.farLeft) +
              Math.abs(ref.occupancy.farRight) +
              Math.abs(ref.occupancy.farLeft),
          ),
        ),
  );

  const directional = clamp01(
    0.4 * histSimilarity(owned.orientationHist, ref.orientationHist) +
      0.35 * cosineSimilarity(directionalVector(owned), directionalVector(ref)) +
      0.25 *
        Math.pow(
          scalarAgreement(
            owned.rightwardEnergy - owned.leftwardEnergy,
            ref.rightwardEnergy - ref.leftwardEnergy,
            2,
          ),
          1.4,
        ),
  );

  const components = clamp01(
    0.6 * cosineSimilarity(componentCentroidSignature(owned), componentCentroidSignature(ref)) +
      0.4 * cosineSimilarity(owned.componentGrid, ref.componentGrid),
  );

  const topology = cosineSimilarity(topologyVector(owned), topologyVector(ref));

  // Endpoint similarity is diagnostic-friendly; down-weight noise via presence check.
  const endpoints =
    owned.endpointCount === 0 && ref.endpointCount === 0
      ? 1
      : cosineSimilarity(owned.endpointSignature, ref.endpointSignature);

  const orientation = clamp01(
    0.7 * scalarAgreement(owned.occupancy.lrBalance, ref.occupancy.lrBalance, 2) +
      0.3 *
        scalarAgreement(
          owned.rightwardEnergy - owned.leftwardEnergy,
          ref.rightwardEnergy - ref.leftwardEnergy,
          2,
        ),
  );

  // Per-hue channels (Option A): mean of active hue spatial / occupancy sims.
  const perHueByChannel = { warm: 0, cool: 0, other: 0 };
  let perHueSpatialSum = 0;
  let perHueOccupancySum = 0;
  let perHueActive = 0;
  for (const hue of HUE_CLASS_NAMES) {
    const scored = scorePerHueChannel(owned.perHue[hue], ref.perHue[hue]);
    perHueByChannel[hue] = scored.composite;
    if (!scored.active) continue;
    perHueSpatialSum += scored.spatial;
    perHueOccupancySum += scored.occupancy;
    perHueActive += 1;
  }
  const perHueSpatial = perHueActive > 0 ? perHueSpatialSum / perHueActive : 1;
  const perHueOccupancy = perHueActive > 0 ? perHueOccupancySum / perHueActive : 1;

  const signals: GeometrySignals = {
    spatial,
    occupancy,
    directional,
    components,
    topology,
    endpoints,
    orientation,
    perHueSpatial,
    perHueOccupancy,
    perHueByChannel,
  };

  const w = weightsForFamily(family);
  const composite = clamp01(
    signals.spatial * w.spatialGrid +
      signals.occupancy * w.occupancy +
      signals.directional * w.directional +
      signals.components * w.components +
      signals.topology * w.topology +
      signals.endpoints * w.endpoints +
      signals.perHueSpatial * w.perHueSpatial +
      signals.perHueOccupancy * w.perHueOccupancy,
  );

  return { composite, signals, featuresOwned: owned, featuresRef: ref };
}

export type GeometryResolveInput = {
  assignedPlayIndex: number;
  playNames: string[];
  /** Composite V3 scores per play (same order as playNames). */
  v3Scores: number[];
  v3Margin: number | null;
  v3IsLocalBest: boolean;
  v3Signals: MatchSignalsV3 | null;
  registration: RegistrationResult;
  /** Candidate play indices to score (assigned + runner-ups). */
  candidateIndices: number[];
  ownedFeatures: GeometryFeatures;
  /** Geometry features per play index (sparse: only candidates need be filled). */
  referenceFeatures: Array<GeometryFeatures | null>;
  /** Optional playType strings aligned with playNames (seed metadata). */
  playTypes?: Array<string | null>;
  /** Plays already locked by PASS (one-to-one). */
  lockedPlayIndices?: Set<number>;
};

function emptyPerHueResolveFields(): Pick<
  GeometryResolveResult,
  "perHueMargins" | "maxPerHueMargin" | "maxPerHueChannel" | "perHuePromoted"
> {
  return {
    perHueMargins: null,
    maxPerHueMargin: null,
    maxPerHueChannel: null,
    perHuePromoted: false,
  };
}

/**
 * Per-hue margin of chosen candidate vs runner-up (Option B diagnostic signal).
 */
export function computePerHueMargins(
  chosen: GeometryCandidateScore,
  runnerUp: GeometryCandidateScore | null,
): {
  perHueMargins: { warm: number; cool: number; other: number };
  maxPerHueMargin: number;
  maxPerHueChannel: HueClassName;
} {
  const perHueMargins = { warm: 0, cool: 0, other: 0 };
  for (const hue of HUE_CLASS_NAMES) {
    const a = chosen.signals.perHueByChannel[hue];
    const b = runnerUp?.signals.perHueByChannel[hue] ?? 0;
    perHueMargins[hue] = a - b;
  }
  let maxPerHueChannel: HueClassName = "warm";
  let maxPerHueMargin = perHueMargins.warm;
  for (const hue of HUE_CLASS_NAMES) {
    if (perHueMargins[hue] > maxPerHueMargin) {
      maxPerHueMargin = perHueMargins[hue];
      maxPerHueChannel = hue;
    }
  }
  return { perHueMargins, maxPerHueMargin, maxPerHueChannel };
}

/**
 * Fail-closed geometry resolver for a single V3 REVIEW assignment.
 */
export function resolveGeometryReview(input: GeometryResolveInput): GeometryResolveResult {
  const {
    assignedPlayIndex,
    playNames,
    v3Scores,
    v3Margin,
    v3IsLocalBest,
    registration,
    candidateIndices,
    ownedFeatures,
    referenceFeatures,
    playTypes,
    lockedPlayIndices,
  } = input;

  if (registration.failed) {
    return {
      status: "geometry-fail",
      playIndex: assignedPlayIndex,
      playName: playNames[assignedPlayIndex],
      geometryScore: 0,
      geometryRunnerUpPlay: null,
      geometryRunnerUpScore: null,
      geometryMargin: null,
      signals: null,
      conflictWithV3: false,
      candidates: [],
      reason: "registration failed",
      ...emptyPerHueResolveFields(),
    };
  }

  if (ownedFeatures.failed || ownedFeatures.inkDensity < GEOMETRY_PASS_THRESHOLDS.minInkDensity) {
    return {
      status: "geometry-fail",
      playIndex: assignedPlayIndex,
      playName: playNames[assignedPlayIndex],
      geometryScore: 0,
      geometryRunnerUpPlay: null,
      geometryRunnerUpScore: null,
      geometryMargin: null,
      signals: null,
      conflictWithV3: false,
      candidates: [],
      reason: ownedFeatures.failReason ?? "insufficient play ink",
      ...emptyPerHueResolveFields(),
    };
  }

  const uniqueCandidates = [...new Set(candidateIndices)].filter(
    (idx) => idx >= 0 && idx < playNames.length,
  );

  const candidates: GeometryCandidateScore[] = [];
  for (const playIndex of uniqueCandidates) {
    const ref = referenceFeatures[playIndex];
    if (!ref) continue;
    const family = inferGeometryFamily(playTypes?.[playIndex] ?? null);
    const scored = scoreGeometryPair(ownedFeatures, ref, family);
    candidates.push({
      playIndex,
      playName: playNames[playIndex],
      score: scored.composite,
      signals: scored.signals,
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    return {
      status: "geometry-review",
      playIndex: assignedPlayIndex,
      playName: playNames[assignedPlayIndex],
      geometryScore: 0,
      geometryRunnerUpPlay: null,
      geometryRunnerUpScore: null,
      geometryMargin: null,
      signals: null,
      conflictWithV3: false,
      candidates: [],
      reason: "no geometry candidates scored",
      ...emptyPerHueResolveFields(),
    };
  }

  const best = candidates[0];
  const runnerUp = candidates[1] ?? null;
  const geometryMargin = runnerUp ? best.score - runnerUp.score : null;
  const perHueInfo = computePerHueMargins(best, runnerUp);

  const v3AssignedScore = v3Scores[assignedPlayIndex] ?? 0;
  const v3Strong =
    v3IsLocalBest &&
    v3AssignedScore >= GEOMETRY_PASS_THRESHOLDS.v3StrongScore &&
    v3Margin != null &&
    v3Margin >= GEOMETRY_PASS_THRESHOLDS.v3StrongMargin;

  const geometryStrong =
    best.score >= GEOMETRY_PASS_THRESHOLDS.geometryStrongScore &&
    geometryMargin != null &&
    geometryMargin >= GEOMETRY_PASS_THRESHOLDS.geometryStrongMargin;

  const conflictWithV3 =
    best.playIndex !== assignedPlayIndex && v3Strong && geometryStrong;

  if (conflictWithV3) {
    return {
      status: "geometry-review",
      playIndex: assignedPlayIndex,
      playName: playNames[assignedPlayIndex],
      geometryScore: best.score,
      geometryRunnerUpPlay: runnerUp?.playName ?? null,
      geometryRunnerUpScore: runnerUp?.score ?? null,
      geometryMargin,
      signals: best.signals,
      conflictWithV3: true,
      candidates,
      reason: `V3/geometry conflict: V3=${playNames[assignedPlayIndex]} geometry=${best.playName}`,
      ...perHueInfo,
      perHuePromoted: false,
    };
  }

  // One-to-one: geometry winner already PASSed elsewhere — stay REVIEW on V3 assignment.
  if (
    best.playIndex !== assignedPlayIndex &&
    lockedPlayIndices?.has(best.playIndex)
  ) {
    const assignedCand = candidates.find((c) => c.playIndex === assignedPlayIndex);
    const lockedPerHue = assignedCand
      ? computePerHueMargins(assignedCand, best)
      : perHueInfo;
    return {
      status: "geometry-review",
      playIndex: assignedPlayIndex,
      playName: playNames[assignedPlayIndex],
      geometryScore: assignedCand?.score ?? best.score,
      geometryRunnerUpPlay: best.playName,
      geometryRunnerUpScore: best.score,
      geometryMargin:
        assignedCand != null ? assignedCand.score - best.score : geometryMargin,
      signals: assignedCand?.signals ?? best.signals,
      conflictWithV3: false,
      candidates,
      reason: "geometry winner locked by another PASS assignment",
      ...lockedPerHue,
      perHuePromoted: false,
    };
  }

  // Only promote when geometry uniquely prefers a candidate (clear best + margin).
  // May reassign off V3 when geometry winner differs and separation is strong.
  const chosen = best;
  const others = candidates.filter((c) => c.playIndex !== chosen.playIndex);
  const geoRunner = others[0] ?? null;
  const chosenMargin = geoRunner ? chosen.score - geoRunner.score : null;
  const chosenPerHue = computePerHueMargins(chosen, geoRunner);

  const orientationOk =
    chosen.signals.orientation >= GEOMETRY_PASS_THRESHOLDS.orientationMin;
  const spatialOk = chosen.signals.spatial >= GEOMETRY_PASS_THRESHOLDS.spatialMin;

  const confirmsV3 = chosen.playIndex === assignedPlayIndex;
  const v3Score = v3Scores[assignedPlayIndex] ?? 0;

  const perHueBoost =
    chosenPerHue.maxPerHueMargin >= GEOMETRY_PASS_THRESHOLDS.perHueConfirmMinMargin;

  const confirmMarginOk =
    chosenMargin != null &&
    (chosenMargin >= GEOMETRY_PASS_THRESHOLDS.confirmMinMargin ||
      (perHueBoost &&
        chosenMargin >= GEOMETRY_PASS_THRESHOLDS.confirmMinMarginWithPerHue));

  const confirmPass =
    confirmsV3 &&
    v3IsLocalBest &&
    (v3Margin == null || v3Margin >= GEOMETRY_PASS_THRESHOLDS.confirmV3MinMargin) &&
    v3Score >= GEOMETRY_PASS_THRESHOLDS.confirmV3MinScore &&
    chosen.score >= GEOMETRY_PASS_THRESHOLDS.confirmMinScore &&
    confirmMarginOk &&
    orientationOk &&
    spatialOk &&
    !conflictWithV3;

  const perHuePromoted =
    confirmPass &&
    perHueBoost &&
    chosenMargin != null &&
    chosenMargin < GEOMETRY_PASS_THRESHOLDS.confirmMinMargin;

  const switchPass =
    !confirmsV3 &&
    chosen.score >= GEOMETRY_PASS_THRESHOLDS.passMinScore &&
    chosenMargin != null &&
    chosenMargin >= GEOMETRY_PASS_THRESHOLDS.passMinMargin &&
    orientationOk &&
    spatialOk &&
    !conflictWithV3;

  if (confirmPass || switchPass) {
    return {
      status: "geometry-pass",
      playIndex: chosen.playIndex,
      playName: playNames[chosen.playIndex],
      geometryScore: chosen.score,
      geometryRunnerUpPlay: geoRunner?.playName ?? null,
      geometryRunnerUpScore: geoRunner?.score ?? null,
      geometryMargin: chosenMargin,
      signals: chosen.signals,
      conflictWithV3: false,
      candidates,
      reason: confirmPass
        ? perHuePromoted
          ? "geometry confirms V3 local-best (per-hue margin boost)"
          : "geometry confirms V3 local-best"
        : "geometry separation sufficient",
      ...chosenPerHue,
      perHuePromoted,
    };
  }

  // Remain on V3 assignment when geometry cannot uniquely separate.
  const assignedCand = candidates.find((c) => c.playIndex === assignedPlayIndex);
  const reportScore = assignedCand?.score ?? chosen.score;
  const reportSignals = assignedCand?.signals ?? chosen.signals;
  const reportRunner = candidates.find((c) => c.playIndex !== assignedPlayIndex) ?? null;
  const reportMargin =
    assignedCand && reportRunner ? assignedCand.score - reportRunner.score : geometryMargin;
  const reportPerHue = assignedCand
    ? computePerHueMargins(assignedCand, reportRunner)
    : chosenPerHue;

  let reason = "geometry orientation/spatial gate failed";
  if (chosenMargin != null && confirmsV3) {
    if (chosen.score < GEOMETRY_PASS_THRESHOLDS.confirmMinScore) {
      reason = "geometry confirm score below gate";
    } else if (
      chosenMargin < GEOMETRY_PASS_THRESHOLDS.confirmMinMargin &&
      !(
        perHueBoost &&
        chosenMargin >= GEOMETRY_PASS_THRESHOLDS.confirmMinMarginWithPerHue
      )
    ) {
      reason = "geometry confirm margin insufficient";
    } else if (
      !v3IsLocalBest ||
      (v3Margin != null && v3Margin < GEOMETRY_PASS_THRESHOLDS.confirmV3MinMargin)
    ) {
      reason = "geometry confirm blocked: V3 not local-best / thin or negative margin";
    } else {
      reason = "geometry confirm gates not met";
    }
  } else if (chosenMargin != null && chosenMargin < GEOMETRY_PASS_THRESHOLDS.passMinMargin) {
    reason = "geometry margin insufficient";
  } else if (chosen.score < GEOMETRY_PASS_THRESHOLDS.passMinScore) {
    reason = "geometry score below gate";
  }

  return {
    status: "geometry-review",
    playIndex: assignedPlayIndex,
    playName: playNames[assignedPlayIndex],
    geometryScore: reportScore,
    geometryRunnerUpPlay: reportRunner?.playName ?? runnerUp?.playName ?? null,
    geometryRunnerUpScore: reportRunner?.score ?? runnerUp?.score ?? null,
    geometryMargin: reportMargin,
    signals: reportSignals,
    conflictWithV3: false,
    candidates,
    reason,
    ...reportPerHue,
    perHuePromoted: false,
  };
}

/**
 * Pick top-K candidate indices from a V3 score row (includes assigned).
 */
export function topCandidateIndices(
  scores: number[],
  assignedPlayIndex: number,
  k = 3,
): number[] {
  const ranked = scores
    .map((score, index) => ({ score, index }))
    .sort((a, b) => b.score - a.score);
  const out: number[] = [];
  const seen = new Set<number>();
  if (assignedPlayIndex >= 0) {
    out.push(assignedPlayIndex);
    seen.add(assignedPlayIndex);
  }
  for (const row of ranked) {
    if (seen.has(row.index)) continue;
    out.push(row.index);
    seen.add(row.index);
    if (out.length >= k) break;
  }
  return out;
}

/** Prepare reference geometry features for a prepared V3 reference. */
export function extractReferenceGeometryFeatures(
  prepared: PreparedReferenceV3,
  baseline: NormalizedRaster,
  varianceWeight: NormalizedRaster,
  colorClasses?: {
    warm: NormalizedRaster;
    cool: NormalizedRaster;
    other: NormalizedRaster;
  },
): GeometryFeatures {
  return extractGeometryFeatures({
    alignedRaster: prepared.raster,
    colorInk: prepared.colorInk,
    baseline,
    varianceWeight,
    colorClasses,
  });
}
