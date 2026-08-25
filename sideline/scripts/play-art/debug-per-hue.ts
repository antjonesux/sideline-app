#!/usr/bin/env node
/**
 * Matcher V3.2 pre-work diagnostics:
 * 1) Per-hue spatial/occupancy separation on hard REVIEW cases
 * 2) Hue histogram sampling across owned crops + cfb.fan references
 *
 * Artifacts → scripts/play-art/reports/matcher-v3-debug/geometry/per-hue-diagnostic/
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { normalizePlayName } from "../../lib/utils";
import { extractPlayArtDocx } from "./extract-docx";
import {
  GEOMETRY_CALIBRATION_ALL,
  type GeometryCalibrationSample,
} from "./geometry-calibration-set";
import {
  buildPlayInkMask,
  extractColorClassMasks,
  extractGeometryFeatures,
  GEOMETRY_GRID_COLS,
  GEOMETRY_GRID_ROWS,
  type GeometryOccupancy,
} from "./image-geometry-v3";
import {
  extractColorInkMask,
  normalizeDiagramRaster,
  playEdgeMap,
  playSignature,
  prepareReferenceSetV3,
  registerRasterV3,
  scaleRaster,
  scoreAlignedOwnedAgainstReferenceV3,
  translateRaster,
  type NormalizedRaster,
} from "./image-similarity-v3";
import {
  collectFormationCrops,
  formationTypesFromSeed,
  loadSeedForReference,
} from "./match-play-art";
import { PLAYBOOK_PATHS } from "./matcher-v3-sample-set";
import { loadPlayArtReference } from "./reference";
import { fetchReferenceImagesForFormation } from "./reference-image";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = join(
  __dirname,
  "reports",
  "matcher-v3-debug",
  "geometry",
  "per-hue-diagnostic",
);

const HUE_BINS = 36; // 10° bins
const SAT_FLOOR = 0.25;

type HueClass = "warm" | "cool" | "other";

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
  return Math.max(0, Math.min(1, (dot / Math.sqrt(na * nb) + 1) / 2));
}

function spatialGridFromInk(ink: NormalizedRaster): Float64Array {
  const { width, height, pixels } = ink;
  const cells = GEOMETRY_GRID_COLS * GEOMETRY_GRID_ROWS;
  const grid = new Float64Array(cells);
  const cellW = width / GEOMETRY_GRID_COLS;
  const cellH = height / GEOMETRY_GRID_ROWS;
  const cellArea = cellW * cellH;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const col = Math.min(GEOMETRY_GRID_COLS - 1, Math.floor(x / cellW));
      const row = Math.min(GEOMETRY_GRID_ROWS - 1, Math.floor(y / cellH));
      grid[row * GEOMETRY_GRID_COLS + col] += pixels[y * width + x];
    }
  }
  for (let c = 0; c < cells; c += 1) grid[c] /= cellArea * 255;
  return grid;
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

function directionalHist(ink: NormalizedRaster): {
  hist: Float64Array;
  leftward: number;
  rightward: number;
} {
  const { width, height, pixels } = ink;
  const hist = new Float64Array(8);
  let leftward = 0;
  let rightward = 0;
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
      const deg = ((Math.atan2(gy, gx) * 180) / Math.PI + 180) % 180;
      const bin = Math.min(7, Math.floor((deg / 180) * 8));
      hist[bin] += mag;
      total += mag;
      if (gx > 0) rightward += mag;
      else leftward += mag;
    }
  }
  if (total > 0) {
    for (let i = 0; i < hist.length; i += 1) hist[i] /= total;
    leftward /= total;
    rightward /= total;
  }
  return { hist, leftward, rightward };
}

function hueFeatures(mask: NormalizedRaster) {
  const spatial = spatialGridFromInk(mask);
  const occupancy = occupancyFromInk(mask);
  const directional = directionalHist(mask);
  const density = mask.pixels.reduce((s, v) => s + v, 0) / (mask.pixels.length * 255);
  return { spatial, occupancy, directional, density };
}

function pairHueSim(
  owned: ReturnType<typeof hueFeatures>,
  ref: ReturnType<typeof hueFeatures>,
): { spatial: number; occupancy: number; directional: number; composite: number } {
  // Empty↔empty = agreement; empty↔ink = disagreement.
  if (owned.density < 0.0005 && ref.density < 0.0005) {
    return { spatial: 1, occupancy: 1, directional: 1, composite: 1 };
  }
  if (owned.density < 0.0005 || ref.density < 0.0005) {
    return { spatial: 0, occupancy: 0, directional: 0, composite: 0 };
  }
  const spatial = cosineSimilarity(owned.spatial, ref.spatial);
  const occupancy = cosineSimilarity(
    occupancyVector(owned.occupancy),
    occupancyVector(ref.occupancy),
  );
  const directional =
    0.6 * cosineSimilarity(owned.directional.hist, ref.directional.hist) +
    0.4 *
      (1 -
        Math.abs(
          owned.directional.rightward -
            owned.directional.leftward -
            (ref.directional.rightward - ref.directional.leftward),
        ) /
          2);
  const composite = 0.45 * spatial + 0.4 * occupancy + 0.15 * directional;
  return { spatial, occupancy, directional, composite };
}

async function hueHistogram(buffer: Buffer): Promise<{
  bins: number[];
  peakBins: Array<{ bin: number; hueCenter: number; count: number; fraction: number }>;
  satPixelCount: number;
  warmFrac: number;
  coolFrac: number;
  otherFrac: number;
}> {
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) throw new Error("hueHistogram: no dimensions");
  const { data, info } = await sharp(buffer)
    .resize(128, 128, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bins = new Array(HUE_BINS).fill(0);
  let warm = 0;
  let cool = 0;
  let other = 0;
  let satPixelCount = 0;

  for (let i = 0; i < info.width * info.height; i += 1) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    if (sat <= SAT_FLOOR || max <= 40) continue;
    satPixelCount += 1;
    const delta = max - min;
    let hue = 0;
    if (delta > 0) {
      if (max === r) hue = ((g - b) / delta) % 6;
      else if (max === g) hue = (b - r) / delta + 2;
      else hue = (r - g) / delta + 4;
      hue *= 60;
      if (hue < 0) hue += 360;
    }
    const bin = Math.min(HUE_BINS - 1, Math.floor(hue / (360 / HUE_BINS)));
    bins[bin] += 1;
    if (hue < 70 || hue >= 320) warm += 1;
    else if (hue >= 140 && hue < 260) cool += 1;
    else other += 1;
  }

  const total = satPixelCount || 1;
  const ranked = bins
    .map((count, bin) => ({
      bin,
      hueCenter: bin * (360 / HUE_BINS) + 360 / HUE_BINS / 2,
      count,
      fraction: count / total,
    }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    bins,
    peakBins: ranked.slice(0, 6),
    satPixelCount,
    warmFrac: warm / total,
    coolFrac: cool / total,
    otherFrac: other / total,
  };
}

async function rasterToPng(raster: NormalizedRaster, path: string): Promise<void> {
  const bytes = Buffer.alloc(raster.pixels.length);
  for (let i = 0; i < raster.pixels.length; i += 1) {
    bytes[i] = Math.max(0, Math.min(255, Math.round(raster.pixels[i])));
  }
  await sharp(bytes, {
    raw: { width: raster.width, height: raster.height, channels: 1 },
  })
    .png()
    .toFile(path);
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function diagnoseHardCase(sample: GeometryCalibrationSample): Promise<Record<string, unknown>> {
  const paths = PLAYBOOK_PATHS[sample.playbook];
  const reference = loadPlayArtReference(paths.reference);
  const extracted = await extractPlayArtDocx(paths.source, reference);
  const seed = await loadSeedForReference(reference);
  const formationTypes = formationTypesFromSeed(seed);
  const cropsByFormation = collectFormationCrops(reference, extracted);
  const crops = cropsByFormation.get(sample.formation) ?? [];
  const crop = crops.find((c) => c.cropId === sample.cropId);
  if (!crop) throw new Error(`Crop ${sample.cropId} not found`);

  const refFormation = reference.formations.find((f) => f.name === sample.formation);
  if (!refFormation) throw new Error(`Formation missing: ${sample.formation}`);
  const formationType = formationTypes.get(sample.formation);
  if (!formationType) throw new Error(`Missing formationType`);

  const playNames = refFormation.plays.map((p) => normalizePlayName(p));
  const fetched = await fetchReferenceImagesForFormation(
    reference,
    sample.formation,
    formationType,
    playNames,
  );
  if (fetched.failures.length > 0) {
    throw new Error(`Fetch failures: ${fetched.failures.map((f) => f.playName).join(", ")}`);
  }

  const referenceRasters: NormalizedRaster[] = [];
  const referenceBuffers: Buffer[] = [];
  for (const image of fetched.images) {
    referenceBuffers.push(image.buffer);
    referenceRasters.push(await normalizeDiagramRaster(image.buffer));
  }
  const { baseline, varianceWeight, prepared } = await prepareReferenceSetV3(
    referenceRasters,
    referenceBuffers,
  );

  const ownedBuffer = extracted.mediaFiles.get(crop.mediaPath);
  if (!ownedBuffer) throw new Error(`Missing buffer`);
  const ownedRaster = await normalizeDiagramRaster(ownedBuffer);
  const ownedColor = await extractColorInkMask(ownedBuffer);
  const ownedClasses = await extractColorClassMasks(ownedBuffer);
  const { aligned, registration } = registerRasterV3(ownedRaster, baseline);

  const alignMask = (mask: NormalizedRaster): NormalizedRaster =>
    translateRaster(
      registration.scale === 1 ? mask : scaleRaster(mask, registration.scale),
      registration.translationX,
      registration.translationY,
    );

  const colorAligned = alignMask(ownedColor);
  const warmAligned = alignMask(ownedClasses.warm);
  const coolAligned = alignMask(ownedClasses.cool);
  const otherAligned = alignMask(ownedClasses.other);

  const matrix: number[] = [];
  for (let j = 0; j < prepared.length; j += 1) {
    const scored = scoreAlignedOwnedAgainstReferenceV3(
      aligned,
      colorAligned,
      prepared[j],
      baseline,
      varianceWeight,
      registration,
    );
    matrix.push(scored.composite);
  }

  const truthName = normalizePlayName(sample.truthPlayName);
  let truthIdx = playNames.findIndex((p) => p === truthName);
  if (truthIdx < 0) truthIdx = matrix.indexOf(Math.max(...matrix));

  // Top-2 V3 candidates + truth
  const ranked = matrix
    .map((score, index) => ({ score, index, name: playNames[index] }))
    .sort((a, b) => b.score - a.score);
  const top2 = ranked.slice(0, 2);
  const candidateSet = new Map<number, string>();
  for (const row of top2) candidateSet.set(row.index, row.name);
  candidateSet.set(truthIdx, playNames[truthIdx]);

  const ownedHue: Record<HueClass, ReturnType<typeof hueFeatures>> = {
    warm: hueFeatures(warmAligned),
    cool: hueFeatures(coolAligned),
    other: hueFeatures(otherAligned),
  };

  // Combined ink features for baseline
  const ownedSig = playSignature(aligned, baseline);
  const ownedEdges = playEdgeMap(ownedSig);
  const combinedInk = buildPlayInkMask({
    signature: ownedSig,
    colorInk: colorAligned,
    varianceWeight,
    edges: ownedEdges,
  });
  const combinedOwned = hueFeatures(combinedInk);
  const ownedGeom = extractGeometryFeatures({
    alignedRaster: aligned,
    colorInk: colorAligned,
    baseline,
    varianceWeight,
    colorClasses: {
      warm: warmAligned,
      cool: coolAligned,
      other: otherAligned,
    },
  });

  const candidateReports: Array<Record<string, unknown>> = [];

  for (const [playIndex, playName] of candidateSet) {
    const refBuf = referenceBuffers[playIndex];
    const refClasses = await extractColorClassMasks(refBuf);
    const refHue = {
      warm: hueFeatures(refClasses.warm),
      cool: hueFeatures(refClasses.cool),
      other: hueFeatures(refClasses.other),
    };
    const refCombined = hueFeatures(prepared[playIndex].colorInk);

    const perHue: Record<string, unknown> = {};
    for (const hue of ["warm", "cool", "other"] as HueClass[]) {
      perHue[hue] = {
        ownedDensity: ownedHue[hue].density,
        refDensity: refHue[hue].density,
        ...pairHueSim(ownedHue[hue], refHue[hue]),
        ownedOccupancy: {
          leftHalf: ownedHue[hue].occupancy.leftHalf,
          rightHalf: ownedHue[hue].occupancy.rightHalf,
          lrBalance: ownedHue[hue].occupancy.lrBalance,
          downfield: ownedHue[hue].occupancy.downfield,
          backfieldCenter: ownedHue[hue].occupancy.backfieldCenter,
        },
        refOccupancy: {
          leftHalf: refHue[hue].occupancy.leftHalf,
          rightHalf: refHue[hue].occupancy.rightHalf,
          lrBalance: refHue[hue].occupancy.lrBalance,
          downfield: refHue[hue].occupancy.downfield,
          backfieldCenter: refHue[hue].occupancy.backfieldCenter,
        },
      };
    }

    candidateReports.push({
      playName,
      isTruth: playIndex === truthIdx,
      v3Score: matrix[playIndex],
      combined: pairHueSim(combinedOwned, refCombined),
      perHue,
      colorClassMassOwned: ownedGeom.colorClassMass,
    });
  }

  // Margins: truth vs best non-truth
  const truthReport = candidateReports.find((c) => c.isTruth) as
    | (typeof candidateReports)[0]
    | undefined;
  const rivals = candidateReports.filter((c) => !c.isTruth);
  const margins: Record<string, number | null> = {
    combined: null,
    warm: null,
    cool: null,
    other: null,
  };
  if (truthReport && rivals.length > 0) {
    const truthCombined = (truthReport.combined as { composite: number }).composite;
    const bestRivalCombined = Math.max(
      ...rivals.map((r) => (r.combined as { composite: number }).composite),
    );
    margins.combined = truthCombined - bestRivalCombined;
    for (const hue of ["warm", "cool", "other"] as HueClass[]) {
      const t = ((truthReport.perHue as Record<string, { composite: number }>)[hue]).composite;
      const bestRival = Math.max(
        ...rivals.map(
          (r) => ((r.perHue as Record<string, { composite: number }>)[hue]).composite,
        ),
      );
      margins[hue] = t - bestRival;
    }
  }

  const maxPerHue = (["warm", "cool", "other"] as HueClass[])
    .map((h) => ({ channel: h, margin: margins[h] ?? Number.NEGATIVE_INFINITY }))
    .sort((a, b) => b.margin - a.margin)[0];

  const dir = join(
    OUT_ROOT,
    "hard-cases",
    slugify(sample.playbook),
    slugify(sample.formation),
    slugify(sample.cropId),
  );
  mkdirSync(dir, { recursive: true });
  await rasterToPng(warmAligned, join(dir, "warm-mask.png"));
  await rasterToPng(coolAligned, join(dir, "cool-mask.png"));
  await rasterToPng(otherAligned, join(dir, "other-mask.png"));
  await rasterToPng(combinedInk, join(dir, "combined-ink.png"));

  return {
    sample: {
      playbook: sample.playbook,
      formation: sample.formation,
      cropId: sample.cropId,
      truthPlayName: sample.truthPlayName,
      family: sample.family,
      note: sample.note,
    },
    v3Top: top2,
    margins,
    maxPerHueChannel: maxPerHue.channel,
    maxPerHueMargin: maxPerHue.margin,
    separationClear: (maxPerHue.margin ?? 0) >= 0.05,
    candidates: candidateReports,
  };
}

async function sampleHueDistribution(): Promise<Record<string, unknown>> {
  const samples: Array<{
    playbook: "air-force" | "usc";
    formation: string;
    cropId: string;
    source: "owned" | "reference";
  }> = [
    { playbook: "air-force", formation: "Gun Split Twins", cropId: "source-139:left", source: "owned" },
    { playbook: "air-force", formation: "Gun Split Tight", cropId: "source-141:right", source: "owned" },
    { playbook: "air-force", formation: "Gun Doubles", cropId: "source-77:right", source: "owned" },
    { playbook: "air-force", formation: "Flexbone Trio Right", cropId: "source-61:middle", source: "owned" },
    { playbook: "air-force", formation: "Wingbone Normal", cropId: "source-72:left", source: "owned" },
    { playbook: "usc", formation: "Gun Trips", cropId: "source-138:left", source: "owned" },
    { playbook: "usc", formation: "Gun Trips", cropId: "source-139:middle", source: "owned" },
    { playbook: "usc", formation: "Gun Y Off Trips", cropId: "source-45:right", source: "owned" },
    { playbook: "usc", formation: "Gun Y Off Trips", cropId: "source-44:middle", source: "owned" },
    { playbook: "air-force", formation: "Power I Strong", cropId: "source-91:middle", source: "owned" },
  ];

  const aggregateBins = new Array(HUE_BINS).fill(0);
  const results: Array<Record<string, unknown>> = [];
  let warmSum = 0;
  let coolSum = 0;
  let otherSum = 0;
  let n = 0;

  // Process unique playbook/formation once for refs
  const cache = new Map<
    string,
    {
      extracted: Awaited<ReturnType<typeof extractPlayArtDocx>>;
      reference: ReturnType<typeof loadPlayArtReference>;
      formationType: string;
      playNames: string[];
      fetched: Awaited<ReturnType<typeof fetchReferenceImagesForFormation>>;
    }
  >();

  for (const sample of samples) {
    const key = `${sample.playbook}::${sample.formation}`;
    if (!cache.has(key)) {
      const paths = PLAYBOOK_PATHS[sample.playbook];
      const reference = loadPlayArtReference(paths.reference);
      const extracted = await extractPlayArtDocx(paths.source, reference);
      const seed = await loadSeedForReference(reference);
      const formationTypes = formationTypesFromSeed(seed);
      const refFormation = reference.formations.find((f) => f.name === sample.formation)!;
      const formationType = formationTypes.get(sample.formation)!;
      const playNames = refFormation.plays.map((p) => normalizePlayName(p));
      const fetched = await fetchReferenceImagesForFormation(
        reference,
        sample.formation,
        formationType,
        playNames,
      );
      cache.set(key, { extracted, reference, formationType, playNames, fetched });
    }
    const ctx = cache.get(key)!;
    const crops = collectFormationCrops(ctx.reference, ctx.extracted).get(sample.formation) ?? [];
    const crop = crops.find((c) => c.cropId === sample.cropId);
    if (!crop) continue;
    const ownedBuf = ctx.extracted.mediaFiles.get(crop.mediaPath);
    if (!ownedBuf) continue;

    const ownedHist = await hueHistogram(ownedBuf);
    results.push({
      ...sample,
      source: "owned",
      ...ownedHist,
    });
    for (let i = 0; i < HUE_BINS; i += 1) aggregateBins[i] += ownedHist.bins[i];
    warmSum += ownedHist.warmFrac;
    coolSum += ownedHist.coolFrac;
    otherSum += ownedHist.otherFrac;
    n += 1;

    // Pair with first reference image from same formation
    if (ctx.fetched.images[0]) {
      const refHist = await hueHistogram(ctx.fetched.images[0].buffer);
      results.push({
        playbook: sample.playbook,
        formation: sample.formation,
        cropId: sample.cropId,
        source: "reference",
        playName: ctx.playNames[0],
        ...refHist,
      });
      for (let i = 0; i < HUE_BINS; i += 1) aggregateBins[i] += refHist.bins[i];
      warmSum += refHist.warmFrac;
      coolSum += refHist.coolFrac;
      otherSum += refHist.otherFrac;
      n += 1;
    }
  }

  const aggTotal = aggregateBins.reduce((a, b) => a + b, 0) || 1;
  const aggregatePeaks = aggregateBins
    .map((count, bin) => ({
      bin,
      hueCenter: bin * 10 + 5,
      count,
      fraction: count / aggTotal,
    }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    sampleCount: n,
    averageBucketFractions: {
      warm: warmSum / Math.max(1, n),
      cool: coolSum / Math.max(1, n),
      other: otherSum / Math.max(1, n),
    },
    aggregatePeaks: aggregatePeaks.slice(0, 10),
    aggregateBins,
    samples: results,
    recommendation:
      aggregatePeaks[0] &&
      // Check if peaks fall in warm/cool/other ranges
      "warm(hue<70|>=320) / cool(140-260) / other covers observed peaks; keep buckets unless peaks cluster in other",
  };
}

async function main(): Promise<void> {
  mkdirSync(OUT_ROOT, { recursive: true });

  console.log("=== Hue distribution sampling ===");
  const hueDist = await sampleHueDistribution();
  writeFileSync(join(OUT_ROOT, "hue-distribution.json"), `${JSON.stringify(hueDist, null, 2)}\n`);
  console.log(
    `Samples=${hueDist.sampleCount} avg warm/cool/other=`,
    (hueDist.averageBucketFractions as { warm: number; cool: number; other: number }),
  );
  console.log(
    "Top peaks:",
    (hueDist.aggregatePeaks as Array<{ hueCenter: number; fraction: number }>)
      .slice(0, 5)
      .map((p) => `${p.hueCenter}°=${(p.fraction * 100).toFixed(1)}%`)
      .join(", "),
  );

  console.log("\n=== Per-hue hard-case separation ===");
  const hardCases = GEOMETRY_CALIBRATION_ALL.filter(
    (s) =>
      s.family === "option" ||
      s.family === "mirrored" ||
      (s.playbook === "air-force" && s.kind !== "pass"),
  ).slice(0, 10);

  const hardResults = [];
  for (const sample of hardCases) {
    try {
      console.log(`  ${sample.formation} / ${sample.cropId} (${sample.truthPlayName})...`);
      const result = await diagnoseHardCase(sample);
      hardResults.push(result);
      const m = result.margins as Record<string, number | null>;
      console.log(
        `    combined=${m.combined?.toFixed(3)} warm=${m.warm?.toFixed(3)} ` +
          `cool=${m.cool?.toFixed(3)} other=${m.other?.toFixed(3)} ` +
          `max=${result.maxPerHueChannel}@${(result.maxPerHueMargin as number).toFixed(3)} ` +
          `clear=${result.separationClear}`,
      );
    } catch (err) {
      console.error(`  FAILED ${sample.formation}/${sample.cropId}:`, err);
      hardResults.push({
        error: err instanceof Error ? err.message : String(err),
        sample,
      });
    }
  }

  const clearCount = hardResults.filter(
    (r) => "separationClear" in r && r.separationClear === true,
  ).length;
  const summary = {
    hardCaseCount: hardResults.length,
    clearSeparationCount: clearCount,
    proceedRecommendation:
      clearCount >= Math.ceil(hardResults.length * 0.5)
        ? "PROCEED: per-hue separation present on majority of hard cases"
        : "HOLD: per-hue separation weak/inconsistent — do not force approach",
    hardResults,
  };
  writeFileSync(join(OUT_ROOT, "hard-case-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`\n${summary.proceedRecommendation} (${clearCount}/${hardResults.length})`);
  console.log(`Wrote ${OUT_ROOT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
