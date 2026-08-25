#!/usr/bin/env node
/**
 * Geometry V3.2 operator diagnostics — ink masks, per-hue channels, components, occupancy.
 *
 * Usage (from sideline/):
 *   npm run play-art:debug-geometry -- --playbook usc --formation "Gun Trips" --crop source-138:left
 *   npm run play-art:debug-geometry -- --sample-set
 *
 * Artifacts → scripts/play-art/reports/matcher-v3-debug/geometry/ (never public/).
 * Per-hue views also under .../geometry/per-hue/.
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
  extractReferenceGeometryFeatures,
  GEOMETRY_GRID_COLS,
  GEOMETRY_GRID_ROWS,
  inferGeometryFamily,
  resolveGeometryReview,
  scoreGeometryPair,
  topCandidateIndices,
  type GeometryFeatures,
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
  formationPlayTypesFromSeed,
  formationTypesFromSeed,
  loadSeedForReference,
} from "./match-play-art";
import { PLAYBOOK_PATHS } from "./matcher-v3-sample-set";
import { loadPlayArtReference } from "./reference";
import { fetchReferenceImagesForFormation } from "./reference-image";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEBUG_ROOT = join(__dirname, "reports", "matcher-v3-debug", "geometry");

type CliArgs = {
  playbook?: "air-force" | "usc";
  formation?: string;
  cropId?: string;
  sampleSet: boolean;
  outDir: string;
};

function parseArgs(argv: string[]): CliArgs {
  let playbook: CliArgs["playbook"];
  let formation: string | undefined;
  let cropId: string | undefined;
  let sampleSet = false;
  let outDir = DEBUG_ROOT;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--playbook" && argv[i + 1]) {
      const v = argv[i + 1].toLowerCase();
      if (v !== "air-force" && v !== "usc") {
        throw new Error(`--playbook must be air-force or usc`);
      }
      playbook = v;
      i += 1;
    } else if (arg === "--formation" && argv[i + 1]) {
      formation = argv[i + 1];
      i += 1;
    } else if (arg === "--crop" && argv[i + 1]) {
      cropId = argv[i + 1];
      i += 1;
    } else if (arg === "--sample-set") {
      sampleSet = true;
    } else if (arg === "--out" && argv[i + 1]) {
      outDir = argv[i + 1];
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`Geometry V3.2 diagnostics

  npm run play-art:debug-geometry -- --playbook usc --formation "Gun Trips" --crop source-138:left
  npm run play-art:debug-geometry -- --sample-set
`);
      process.exit(0);
    }
  }

  if (!sampleSet && (!playbook || !formation || !cropId)) {
    throw new Error("Provide --playbook/--formation/--crop or --sample-set");
  }
  return { playbook, formation, cropId, sampleSet, outDir };
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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

async function componentsOverlayPng(
  ink: NormalizedRaster,
  features: GeometryFeatures,
  path: string,
): Promise<void> {
  const { width, height } = ink;
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < ink.pixels.length; i += 1) {
    const v = Math.max(0, Math.min(255, Math.round(ink.pixels[i])));
    const o = i * 4;
    rgba[o] = v;
    rgba[o + 1] = v;
    rgba[o + 2] = v;
    rgba[o + 3] = 255;
  }

  // Draw component boxes in color.
  const colors = [
    [255, 64, 64],
    [64, 255, 64],
    [64, 128, 255],
    [255, 220, 64],
    [255, 64, 255],
    [64, 255, 220],
  ];
  for (let ci = 0; ci < Math.min(features.components.length, 12); ci += 1) {
    const c = features.components[ci];
    const [r, g, b] = colors[ci % colors.length];
    for (let x = c.minX; x <= c.maxX; x += 1) {
      plot(rgba, width, x, c.minY, r, g, b);
      plot(rgba, width, x, c.maxY, r, g, b);
    }
    for (let y = c.minY; y <= c.maxY; y += 1) {
      plot(rgba, width, c.minX, y, r, g, b);
      plot(rgba, width, c.maxX, y, r, g, b);
    }
    plot(rgba, width, Math.round(c.centroidX), Math.round(c.centroidY), 255, 255, 255);
    plot(rgba, width, c.endpointA.x, c.endpointA.y, r, g, b);
    plot(rgba, width, c.endpointB.x, c.endpointB.y, r, g, b);
  }

  // Grid lines.
  for (let col = 1; col < GEOMETRY_GRID_COLS; col += 1) {
    const x = Math.round((col * width) / GEOMETRY_GRID_COLS);
    for (let y = 0; y < height; y += 1) plot(rgba, width, x, y, 80, 80, 80);
  }
  for (let row = 1; row < GEOMETRY_GRID_ROWS; row += 1) {
    const y = Math.round((row * height) / GEOMETRY_GRID_ROWS);
    for (let x = 0; x < width; x += 1) plot(rgba, width, x, y, 80, 80, 80);
  }

  await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toFile(path);
}

function plot(
  rgba: Buffer,
  width: number,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
): void {
  if (x < 0 || y < 0 || x >= width) return;
  const height = rgba.length / (width * 4);
  if (y >= height) return;
  const o = (y * width + x) * 4;
  rgba[o] = r;
  rgba[o + 1] = g;
  rgba[o + 2] = b;
  rgba[o + 3] = 255;
}

async function debugOne(
  sample: {
    playbook: "air-force" | "usc";
    formation: string;
    cropId: string;
    playName?: string;
  },
  outDir: string,
): Promise<Record<string, unknown>> {
  const paths = PLAYBOOK_PATHS[sample.playbook];
  const reference = loadPlayArtReference(paths.reference);
  const extracted = await extractPlayArtDocx(paths.source, reference);
  const seed = await loadSeedForReference(reference);
  const formationTypes = formationTypesFromSeed(seed);
  const playTypesByFormation = formationPlayTypesFromSeed(seed);
  const cropsByFormation = collectFormationCrops(reference, extracted);
  const crops = cropsByFormation.get(sample.formation) ?? [];
  const crop = crops.find((c) => c.cropId === sample.cropId);
  if (!crop) {
    throw new Error(`Crop ${sample.cropId} not found in ${sample.formation}`);
  }

  const refFormation = reference.formations.find((f) => f.name === sample.formation);
  if (!refFormation) throw new Error(`Formation ${sample.formation} missing from reference`);
  const formationType = formationTypes.get(sample.formation);
  if (!formationType) throw new Error(`Missing formationType for ${sample.formation}`);

  const playNames = refFormation.plays.map((p) => normalizePlayName(p));
  const fetched = await fetchReferenceImagesForFormation(
    reference,
    sample.formation,
    formationType,
    playNames,
  );
  if (fetched.failures.length > 0) {
    throw new Error(`Reference fetch failures: ${fetched.failures.map((f) => f.playName).join(", ")}`);
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
  if (!ownedBuffer) throw new Error(`Missing buffer for ${crop.cropId}`);
  const ownedRaster = await normalizeDiagramRaster(ownedBuffer);
  const ownedColor = await extractColorInkMask(ownedBuffer);
  const ownedClassesRaw = await extractColorClassMasks(ownedBuffer);
  const { aligned, registration } = registerRasterV3(ownedRaster, baseline);
  const alignMask = (mask: NormalizedRaster): NormalizedRaster =>
    translateRaster(
      registration.scale === 1 ? mask : scaleRaster(mask, registration.scale),
      registration.translationX,
      registration.translationY,
    );
  const colorAligned = alignMask(ownedColor);
  const ownedColorClasses = {
    warm: alignMask(ownedClassesRaw.warm),
    cool: alignMask(ownedClassesRaw.cool),
    other: alignMask(ownedClassesRaw.other),
  };

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

  let assignedPlayIndex = 0;
  for (let j = 1; j < matrix.length; j += 1) {
    if (matrix[j] > matrix[assignedPlayIndex]) assignedPlayIndex = j;
  }
  if (sample.playName) {
    const idx = playNames.findIndex((p) => p === normalizePlayName(sample.playName!));
    if (idx >= 0) assignedPlayIndex = idx;
  }

  const ownedSig = playSignature(aligned, baseline);
  const ownedEdges = playEdgeMap(ownedSig);
  const ink = buildPlayInkMask({
    signature: ownedSig,
    colorInk: colorAligned,
    varianceWeight,
    edges: ownedEdges,
  });
  const ownedFeatures = extractGeometryFeatures({
    alignedRaster: aligned,
    colorInk: colorAligned,
    baseline,
    varianceWeight,
    colorClasses: ownedColorClasses,
  });

  const candidateIndices = topCandidateIndices(matrix, assignedPlayIndex, 3);
  const refFeatures: Array<GeometryFeatures | null> = prepared.map(() => null);
  const candidateScores: Array<Record<string, unknown>> = [];

  for (const playIndex of candidateIndices) {
    const refClasses = await extractColorClassMasks(referenceBuffers[playIndex]);
    refFeatures[playIndex] = extractReferenceGeometryFeatures(
      prepared[playIndex],
      baseline,
      varianceWeight,
      refClasses,
    );
    const playType =
      playTypesByFormation.get(sample.formation)?.get(playNames[playIndex]) ?? null;
    const pair = scoreGeometryPair(
      ownedFeatures,
      refFeatures[playIndex]!,
      inferGeometryFamily(playType),
    );
    candidateScores.push({
      playName: playNames[playIndex],
      v3Score: matrix[playIndex],
      geometryScore: pair.composite,
      signals: pair.signals,
      perHueByChannel: pair.signals.perHueByChannel,
    });
  }

  const playTypes = playNames.map(
    (name) => playTypesByFormation.get(sample.formation)?.get(name) ?? null,
  );
  let runnerUpMargin: number | null = null;
  let bestOther = Number.NEGATIVE_INFINITY;
  for (let j = 0; j < matrix.length; j += 1) {
    if (j === assignedPlayIndex) continue;
    if (matrix[j] > bestOther) bestOther = matrix[j];
  }
  if (Number.isFinite(bestOther)) {
    runnerUpMargin = matrix[assignedPlayIndex] - bestOther;
  }

  const resolved = resolveGeometryReview({
    assignedPlayIndex,
    playNames,
    v3Scores: matrix,
    v3Margin: runnerUpMargin,
    v3IsLocalBest: assignedPlayIndex === matrix.indexOf(Math.max(...matrix)),
    v3Signals: null,
    registration,
    candidateIndices,
    ownedFeatures,
    referenceFeatures: refFeatures,
    playTypes,
  });

  const dir = join(
    outDir,
    slugify(sample.playbook),
    slugify(sample.formation),
    slugify(sample.cropId),
  );
  mkdirSync(dir, { recursive: true });
  const perHueDir = join(
    outDir.includes("geometry") ? outDir : DEBUG_ROOT,
    "per-hue",
    slugify(sample.playbook),
    slugify(sample.formation),
    slugify(sample.cropId),
  );
  mkdirSync(perHueDir, { recursive: true });

  await rasterToPng(ink, join(dir, "ink-mask.png"));
  await rasterToPng(ownedColor, join(dir, "color-ink.png"));
  await rasterToPng(ownedEdges, join(dir, "edges.png"));
  await componentsOverlayPng(ink, ownedFeatures, join(dir, "components.png"));

  await rasterToPng(ownedColorClasses.warm, join(perHueDir, "warm-mask.png"));
  await rasterToPng(ownedColorClasses.cool, join(perHueDir, "cool-mask.png"));
  await rasterToPng(ownedColorClasses.other, join(perHueDir, "other-mask.png"));
  await rasterToPng(ink, join(perHueDir, "combined-ink.png"));

  const perHueSummary = {
    colorClassMass: ownedFeatures.colorClassMass,
    perHue: {
      warm: {
        density: ownedFeatures.perHue.warm.density,
        spatialGrid: [...ownedFeatures.perHue.warm.spatialGrid],
        occupancy: ownedFeatures.perHue.warm.occupancy,
      },
      cool: {
        density: ownedFeatures.perHue.cool.density,
        spatialGrid: [...ownedFeatures.perHue.cool.spatialGrid],
        occupancy: ownedFeatures.perHue.cool.occupancy,
      },
      other: {
        density: ownedFeatures.perHue.other.density,
        spatialGrid: [...ownedFeatures.perHue.other.spatialGrid],
        occupancy: ownedFeatures.perHue.other.occupancy,
      },
    },
    candidates: candidateScores,
    geometryResolve: {
      status: resolved.status,
      playName: resolved.playName,
      score: resolved.geometryScore,
      margin: resolved.geometryMargin,
      perHueMargins: resolved.perHueMargins,
      maxPerHueMargin: resolved.maxPerHueMargin,
      maxPerHueChannel: resolved.maxPerHueChannel,
      perHuePromoted: resolved.perHuePromoted,
      reason: resolved.reason,
    },
  };
  writeFileSync(join(perHueDir, "per-hue-summary.json"), `${JSON.stringify(perHueSummary, null, 2)}\n`);

  const summary = {
    playbook: sample.playbook,
    formation: sample.formation,
    cropId: sample.cropId,
    assignedPlay: playNames[assignedPlayIndex],
    v3Score: matrix[assignedPlayIndex],
    v3Margin: runnerUpMargin,
    registration,
    owned: {
      inkDensity: ownedFeatures.inkDensity,
      colorInkDensity: ownedFeatures.colorInkDensity,
      majorComponents: ownedFeatures.majorComponentCount,
      occupancy: ownedFeatures.occupancy,
      orientationHist: [...ownedFeatures.orientationHist],
      leftward: ownedFeatures.leftwardEnergy,
      rightward: ownedFeatures.rightwardEnergy,
      vertical: ownedFeatures.verticalEnergy,
      horizontal: ownedFeatures.horizontalEnergy,
      colorClassMass: ownedFeatures.colorClassMass,
      spatialGrid: [...ownedFeatures.spatialGrid],
      perHueDensities: {
        warm: ownedFeatures.perHue.warm.density,
        cool: ownedFeatures.perHue.cool.density,
        other: ownedFeatures.perHue.other.density,
      },
    },
    candidates: candidateScores,
    geometryResolve: resolved,
    perHueArtifacts: perHueDir,
  };
  writeFileSync(join(dir, "geometry-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(
    `${sample.formation} / ${sample.cropId}: V3=${playNames[assignedPlayIndex]} ` +
      `geo=${resolved.status} → ${resolved.playName} ` +
      `(score=${resolved.geometryScore.toFixed(3)} margin=${resolved.geometryMargin?.toFixed(3) ?? "—"} ` +
      `maxPerHue=${resolved.maxPerHueChannel}@${resolved.maxPerHueMargin?.toFixed(3) ?? "—"})`,
  );
  return summary;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(args.outDir, { recursive: true });

  const samples: GeometryCalibrationSample[] = args.sampleSet
    ? GEOMETRY_CALIBRATION_ALL
    : [
        {
          playbook: args.playbook!,
          formation: args.formation!,
          cropId: args.cropId!,
          kind: "usc",
          family: "other",
          truthPlayName: "",
          calibrationClass: "verified-correct",
        },
      ];

  const results = [];
  for (const sample of samples) {
    try {
      results.push(await debugOne(sample, args.outDir));
    } catch (err) {
      console.error(`FAILED ${sample.formation}/${sample.cropId}:`, err);
      results.push({
        error: err instanceof Error ? err.message : String(err),
        sample,
      });
    }
  }

  writeFileSync(join(args.outDir, "batch-summary.json"), `${JSON.stringify(results, null, 2)}\n`);
  console.log(`\nWrote artifacts under ${args.outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
