import sharp from "sharp";

export const DIAGRAM_REGION = {
  left: 40,
  top: 72,
  width: 546,
  height: 250,
} as const;

export const COMPARE_SIZE = 128;

export type ComparisonFingerprint = {
  pixels: Float64Array;
  width: number;
  height: number;
};

function diagramRegionForSize(
  width: number,
  height: number,
): { left: number; top: number; width: number; height: number } {
  if (width === 626 && height === 355) {
    return { ...DIAGRAM_REGION };
  }

  const left = Math.round(width * (DIAGRAM_REGION.left / 626));
  const top = Math.round(height * (DIAGRAM_REGION.top / 355));
  const regionWidth = Math.max(1, Math.round(width * (DIAGRAM_REGION.width / 626)));
  const regionHeight = Math.max(1, Math.round(height * (DIAGRAM_REGION.height / 355)));
  return {
    left: Math.min(left, width - 1),
    top: Math.min(top, height - 1),
    width: Math.min(regionWidth, width - left),
    height: Math.min(regionHeight, height - top),
  };
}

/** Grayscale diagram raster for comparison (values 0–255). */
export async function buildComparisonFingerprint(buffer: Buffer): Promise<ComparisonFingerprint> {
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) {
    throw new Error("Image similarity failed: could not read dimensions");
  }

  const region = diagramRegionForSize(width, height);
  const { data, info } = await sharp(buffer)
    .extract(region)
    .resize(COMPARE_SIZE, COMPARE_SIZE, { fit: "fill" })
    .grayscale()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Float64Array(info.width * info.height);
  for (let i = 0; i < pixels.length; i += 1) {
    pixels[i] = data[i];
  }
  return { pixels, width: info.width, height: info.height };
}

/**
 * Similarity from inverse RMSE on diagram rasters (0–1).
 * Deterministic, orientation-preserving, tolerant of JPEG/compression differences.
 */
export function similarityScore(a: ComparisonFingerprint, b: ComparisonFingerprint): number {
  if (a.pixels.length !== b.pixels.length || a.pixels.length === 0) {
    return 0;
  }

  let sumSq = 0;
  for (let i = 0; i < a.pixels.length; i += 1) {
    const delta = a.pixels[i] - b.pixels[i];
    sumSq += delta * delta;
  }
  const rmse = Math.sqrt(sumSq / a.pixels.length);
  const normalized = 1 - rmse / 255;
  return Math.max(0, Math.min(1, normalized));
}

export function buildSimilarityMatrix(
  cropFingerprints: ComparisonFingerprint[],
  referenceFingerprints: ComparisonFingerprint[],
): number[][] {
  return cropFingerprints.map((cropFp) =>
    referenceFingerprints.map((refFp) => similarityScore(cropFp, refFp)),
  );
}
