#!/usr/bin/env node
/**
 * Matcher V3 operator diagnostics — visual artifacts for owned vs cfb.fan pairs.
 *
 * Usage (from sideline/):
 *   npm run play-art:debug-match -- --playbook air-force --formation "Gun Split" --crop source-129:middle
 *   npm run play-art:debug-match -- --sample-set
 *   npm run play-art:debug-match -- --probe-only
 *
 * Artifacts land under scripts/play-art/reports/matcher-v3-debug/ (never public/).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { normalizePlayName } from "../../lib/utils";
import { extractPlayArtDocx } from "./extract-docx";
import {
  buildFormationBaseline,
  edgeMap,
  foregroundOverlap,
  normalizeDiagramRaster,
  playSignature,
  prepareReferenceSet,
  registerRaster,
  scoreAlignedOwnedAgainstReference,
  translateRaster,
  V2_COMPARE_SIZE,
  V2_DIAGRAM_REGION,
  V2_REGISTRATION_SEARCH,
  V2_RESIDUAL_FLOOR,
  type NormalizedRaster,
  type PairScoreV2,
} from "./image-similarity-v2";
import {
  collectFormationCrops,
  formationTypesFromSeed,
  loadSeedForReference,
} from "./match-play-art";
import {
  MATCHER_V3_DIAGNOSTIC_SAMPLES,
  PLAYBOOK_PATHS,
  type DiagnosticSample,
} from "./matcher-v3-sample-set";
import { loadPlayArtReference } from "./reference";
import { fetchReferenceImagesForFormation } from "./reference-image";
import type { ExtractedPlayArtDoc, PlayArtReference } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEBUG_ROOT = join(__dirname, "reports", "matcher-v3-debug");

type CliArgs = {
  playbook?: "air-force" | "usc";
  formation?: string;
  cropId?: string;
  sampleSet: boolean;
  probeOnly: boolean;
  outDir: string;
};

function parseArgs(argv: string[]): CliArgs {
  let playbook: CliArgs["playbook"];
  let formation: string | undefined;
  let cropId: string | undefined;
  let sampleSet = false;
  let probeOnly = false;
  let outDir = DEBUG_ROOT;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--playbook" && argv[i + 1]) {
      const v = argv[i + 1].toLowerCase();
      if (v !== "air-force" && v !== "usc") {
        throw new Error(`--playbook must be air-force or usc (got ${argv[i + 1]})`);
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
    } else if (arg === "--probe-only") {
      probeOnly = true;
    } else if (arg === "--out" && argv[i + 1]) {
      outDir = argv[i + 1];
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  if (!sampleSet && !probeOnly && (!playbook || !formation || !cropId)) {
    printHelp();
    throw new Error("Provide --playbook/--formation/--crop, or --sample-set / --probe-only");
  }

  return { playbook, formation, cropId, sampleSet, probeOnly, outDir };
}

function printHelp(): void {
  console.log(`Matcher V3 diagnostics

  npm run play-art:debug-match -- --playbook air-force --formation "Gun Split" --crop source-129:middle
  npm run play-art:debug-match -- --sample-set
  npm run play-art:debug-match -- --probe-only

Artifacts → scripts/play-art/reports/matcher-v3-debug/
`);
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

async function absDiffPng(
  a: NormalizedRaster,
  b: NormalizedRaster,
  path: string,
): Promise<number> {
  const pixels = new Float64Array(a.pixels.length);
  let sum = 0;
  for (let i = 0; i < a.pixels.length; i += 1) {
    const d = Math.abs(a.pixels[i] - b.pixels[i]);
    pixels[i] = Math.min(255, d * 2);
    sum += d * d;
  }
  await rasterToPng({ pixels, width: a.width, height: a.height }, path);
  return Math.sqrt(sum / a.pixels.length);
}

async function maskPng(raster: NormalizedRaster, path: string, threshold = V2_RESIDUAL_FLOOR): Promise<void> {
  const pixels = new Float64Array(raster.pixels.length);
  for (let i = 0; i < raster.pixels.length; i += 1) {
    pixels[i] = raster.pixels[i] >= threshold ? 255 : 0;
  }
  await rasterToPng({ pixels, width: raster.width, height: raster.height }, path);
}

async function overlayBlink(
  a: NormalizedRaster,
  b: NormalizedRaster,
  path: string,
): Promise<void> {
  const size = a.width * a.height;
  const frames: Buffer[] = [];
  for (const src of [a, b]) {
    const bytes = Buffer.alloc(size * 3);
    for (let i = 0; i < size; i += 1) {
      const v = Math.max(0, Math.min(255, Math.round(src.pixels[i])));
      bytes[i * 3] = v;
      bytes[i * 3 + 1] = v;
      bytes[i * 3 + 2] = v;
    }
    frames.push(
      await sharp(bytes, { raw: { width: a.width, height: a.height, channels: 3 } })
        .png()
        .toBuffer(),
    );
  }
  // Static side-by-side overlay (red=owned, cyan=ref) as a blink substitute.
  const overlay = Buffer.alloc(size * 3);
  for (let i = 0; i < size; i += 1) {
    const oa = Math.max(0, Math.min(255, Math.round(a.pixels[i])));
    const ob = Math.max(0, Math.min(255, Math.round(b.pixels[i])));
    overlay[i * 3] = Math.min(255, Math.round(oa * 0.85));
    overlay[i * 3 + 1] = Math.min(255, Math.round(ob * 0.7));
    overlay[i * 3 + 2] = Math.min(255, Math.round(ob * 0.85));
  }
  await sharp(overlay, { raw: { width: a.width, height: a.height, channels: 3 } })
    .png()
    .toFile(path);
  void frames;
}

function scaleRaster(source: NormalizedRaster, scale: number): NormalizedRaster {
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

function mse(a: Float64Array, b: Float64Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return sum / a.length;
}

/** Bounded scale+translation probe for diagnostics (not production registration). */
function registerWithScaleProbe(
  owned: NormalizedRaster,
  reference: NormalizedRaster,
): { dx: number; dy: number; scale: number; rmse: number; translationOnlyRmse: number } {
  let best = {
    dx: 0,
    dy: 0,
    scale: 1,
    rmse: Number.POSITIVE_INFINITY,
    translationOnlyRmse: Number.POSITIVE_INFINITY,
  };

  for (let dy = -V2_REGISTRATION_SEARCH; dy <= V2_REGISTRATION_SEARCH; dy += 1) {
    for (let dx = -V2_REGISTRATION_SEARCH; dx <= V2_REGISTRATION_SEARCH; dx += 1) {
      const shifted = translateRaster(owned, dx, dy);
      const err = Math.sqrt(mse(shifted.pixels, reference.pixels));
      if (err < best.translationOnlyRmse) {
        best.translationOnlyRmse = err;
      }
      if (err < best.rmse) {
        best = { ...best, dx, dy, scale: 1, rmse: err };
      }
    }
  }

  const scales = [0.96, 0.98, 1.0, 1.02, 1.04];
  for (const scale of scales) {
    const scaled = scale === 1 ? owned : scaleRaster(owned, scale);
    for (let dy = -V2_REGISTRATION_SEARCH; dy <= V2_REGISTRATION_SEARCH; dy += 1) {
      for (let dx = -V2_REGISTRATION_SEARCH; dx <= V2_REGISTRATION_SEARCH; dx += 1) {
        const shifted = translateRaster(scaled, dx, dy);
        const err = Math.sqrt(mse(shifted.pixels, reference.pixels));
        if (err < best.rmse) {
          best = { ...best, dx, dy, scale, rmse: err };
        }
      }
    }
  }

  return best;
}

function buildVarianceMap(references: NormalizedRaster[]): NormalizedRaster {
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
  for (let i = 0; i < n; i += 1) variance[i] /= Math.max(1, references.length - 1);

  let maxV = 0;
  for (let i = 0; i < n; i += 1) if (variance[i] > maxV) maxV = variance[i];
  const pixels = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    pixels[i] = maxV > 0 ? (Math.sqrt(variance[i]) / Math.sqrt(maxV)) * 255 : 0;
  }
  return { pixels, width, height };
}

function diagramRegionForBuffer(
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

async function extractColorInkMask(buffer: Buffer): Promise<NormalizedRaster> {
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) {
    throw new Error("color ink mask: missing dimensions");
  }
  const region = diagramRegionForBuffer(width, height);
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
    // Saturated non-gray ink (routes/arrows often colored).
    pixels[i] = sat > 0.18 && max > 40 ? Math.min(255, sat * 255) : 0;
  }
  return { pixels, width: info.width, height: info.height };
}

type CandidateDiag = {
  label: string;
  playName: string;
  role: "assigned" | "runner-up" | "wrong" | "correct";
  score: PairScoreV2;
};

async function diagnoseCrop(opts: {
  reference: PlayArtReference;
  extracted: ExtractedPlayArtDoc;
  formation: string;
  formationType: string;
  cropId: string;
  outDir: string;
  kind?: string;
  expectedPlay?: string;
}): Promise<{
  dir: string;
  summary: Record<string, unknown>;
}> {
  const { reference, extracted, formation, formationType, cropId, outDir } = opts;
  const crops = collectFormationCrops(reference, extracted).get(formation) ?? [];
  const crop = crops.find((c) => c.cropId === cropId);
  const refFormation = reference.formations.find((f) => f.name === formation);
  if (!crop || !refFormation) {
    throw new Error(`Missing crop ${cropId} or formation ${formation}`);
  }

  const playNames = refFormation.plays.map((p) => normalizePlayName(p));
  const fetched = await fetchReferenceImagesForFormation(
    reference,
    formation,
    formationType,
    playNames,
  );
  if (fetched.images.length !== playNames.length) {
    throw new Error(`Reference fetch incomplete for ${formation}`);
  }

  const ownedBuf = extracted.mediaFiles.get(crop.mediaPath);
  if (!ownedBuf) throw new Error(`Missing buffer for ${cropId}`);

  const dir = join(
    outDir,
    slugify(reference.playbook),
    slugify(formation),
    slugify(cropId),
  );
  mkdirSync(dir, { recursive: true });

  // 1–2 originals
  await sharp(ownedBuf).jpeg({ quality: 92 }).toFile(join(dir, "01-owned-original.jpg"));

  const ownedRaster = await normalizeDiagramRaster(ownedBuf);
  const referenceRasters: NormalizedRaster[] = [];
  for (const image of fetched.images) {
    referenceRasters.push(await normalizeDiagramRaster(image.buffer));
  }
  const baseline = buildFormationBaseline(referenceRasters);
  const varianceMap = buildVarianceMap(referenceRasters);
  const { prepared } = prepareReferenceSet(referenceRasters);

  const { aligned, registration } = registerRaster(ownedRaster, baseline);
  const ownedSig = playSignature(aligned, baseline);
  const ownedEdges = edgeMap(ownedSig);

  await rasterToPng(ownedRaster, join(dir, "03-owned-normalized.png"));
  await rasterToPng(aligned, join(dir, "05-owned-registered.png"));
  await rasterToPng(baseline, join(dir, "06-formation-baseline.png"));
  await rasterToPng(ownedSig, join(dir, "07-owned-residual.png"));
  await rasterToPng(ownedEdges, join(dir, "09-owned-edges.png"));
  await rasterToPng(varianceMap, join(dir, "13-formation-variance.png"));
  await maskPng(ownedSig, join(dir, "12-owned-foreground-mask.png"));

  const ownedColor = await extractColorInkMask(ownedBuf);
  await rasterToPng(ownedColor, join(dir, "14-owned-color-ink.png"));

  // Score all candidates
  const scores = prepared.map((p) =>
    scoreAlignedOwnedAgainstReference(aligned, p, baseline, registration),
  );
  const ranked = scores
    .map((score, idx) => ({ idx, score, playName: playNames[idx] }))
    .sort((a, b) => b.score.composite - a.score.composite);

  const assignedIdx = ranked[0].idx;
  const runnerUpIdx = ranked[1]?.idx ?? assignedIdx;
  let wrongIdx = ranked.find((r) => r.idx !== assignedIdx && r.idx !== runnerUpIdx)?.idx;
  if (wrongIdx === undefined) wrongIdx = Math.max(0, playNames.length - 1);

  const expectedIdx =
    opts.expectedPlay != null
      ? playNames.findIndex((p) => p === normalizePlayName(opts.expectedPlay!))
      : -1;

  const candidates: CandidateDiag[] = [
    {
      label: "A-assigned",
      playName: playNames[assignedIdx],
      role: expectedIdx === assignedIdx ? "correct" : "assigned",
      score: scores[assignedIdx],
    },
    {
      label: "B-runner-up",
      playName: playNames[runnerUpIdx],
      role: "runner-up",
      score: scores[runnerUpIdx],
    },
    {
      label: "C-wrong",
      playName: playNames[wrongIdx],
      role: "wrong",
      score: scores[wrongIdx],
    },
  ];

  if (expectedIdx >= 0 && expectedIdx !== assignedIdx && expectedIdx !== runnerUpIdx) {
    candidates.push({
      label: "D-expected",
      playName: playNames[expectedIdx],
      role: "correct",
      score: scores[expectedIdx],
    });
  }

  const candidateSummaries: Record<string, unknown>[] = [];

  for (const cand of candidates) {
    const playIdx = playNames.indexOf(cand.playName);
    const refBuf = fetched.images[playIdx].buffer;
    const prefix = cand.label;
    await sharp(refBuf).jpeg({ quality: 92 }).toFile(join(dir, `${prefix}-02-reference-original.jpg`));
    await rasterToPng(referenceRasters[playIdx], join(dir, `${prefix}-04-reference-normalized.png`));

    const refSig = prepared[playIdx].signature;
    const refEdges = prepared[playIdx].edges;
    await rasterToPng(refSig, join(dir, `${prefix}-08-reference-residual.png`));
    await rasterToPng(refEdges, join(dir, `${prefix}-10-reference-edges.png`));
    const rmse = await absDiffPng(ownedSig, refSig, join(dir, `${prefix}-11-residual-absdiff.png`));
    await maskPng(refSig, join(dir, `${prefix}-12-reference-foreground-mask.png`));
    await overlayBlink(aligned, referenceRasters[playIdx], join(dir, `${prefix}-15-overlay.png`));

    const refColor = await extractColorInkMask(refBuf);
    await rasterToPng(refColor, join(dir, `${prefix}-14-reference-color-ink.png`));
    const colorOverlap = foregroundOverlap(
      { pixels: ownedColor.pixels, width: ownedColor.width, height: ownedColor.height },
      refColor,
      20,
    );

    const scaleProbe = registerWithScaleProbe(ownedRaster, referenceRasters[playIdx]);
    const registeredRmse = Math.sqrt(mse(aligned.pixels, referenceRasters[playIdx].pixels));

    candidateSummaries.push({
      label: cand.label,
      role: cand.role,
      playName: cand.playName,
      composite: cand.score.composite,
      signals: cand.score.signals,
      registration: cand.score.registration,
      residualAbsDiffRmse: rmse,
      registeredPixelRmse: registeredRmse,
      colorInkOverlap: colorOverlap,
      scaleProbe,
      referenceUrl: fetched.images[playIdx].url,
    });
  }

  const summary = {
    playbook: reference.playbook,
    formation,
    cropId,
    kind: opts.kind ?? null,
    expectedPlay: opts.expectedPlay ?? null,
    registrationToBaseline: registration,
    topCandidates: ranked.slice(0, 5).map((r) => ({
      playName: r.playName,
      composite: r.score.composite,
      signals: r.score.signals,
    })),
    candidates: candidateSummaries,
    notes: {
      normalizedExactGate:
        "requires registered≥0.97 residual≥0.94 edges≥0.92 — see candidate registered/residual",
      compareSize: V2_COMPARE_SIZE,
      residualFloor: V2_RESIDUAL_FLOOR,
    },
  };

  writeFileSync(join(dir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  return { dir, summary };
}

async function loadPlaybook(playbook: "air-force" | "usc") {
  const paths = PLAYBOOK_PATHS[playbook];
  const reference = loadPlayArtReference(paths.reference);
  const extracted = await extractPlayArtDocx(paths.source, reference);
  const seed = await loadSeedForReference(reference);
  const types = formationTypesFromSeed(seed);
  return { reference, extracted, types };
}

async function runSampleSet(outDir: string): Promise<void> {
  const cache = new Map<string, Awaited<ReturnType<typeof loadPlaybook>>>();
  const index: Array<Record<string, unknown>> = [];

  for (const sample of MATCHER_V3_DIAGNOSTIC_SAMPLES) {
    if (!cache.has(sample.playbook)) {
      console.log(`Loading ${sample.playbook}…`);
      cache.set(sample.playbook, await loadPlaybook(sample.playbook));
    }
    const ctx = cache.get(sample.playbook)!;
    const formationType = ctx.types.get(sample.formation);
    if (!formationType) {
      console.warn(`SKIP ${sample.formation}: missing formationType`);
      continue;
    }
    console.log(`Diagnosing ${sample.kind}: ${sample.formation} / ${sample.cropId}`);
    try {
      const { dir, summary } = await diagnoseCrop({
        reference: ctx.reference,
        extracted: ctx.extracted,
        formation: sample.formation,
        formationType,
        cropId: sample.cropId,
        outDir,
        kind: sample.kind,
        expectedPlay: sample.playName,
      });
      index.push({
        ...sample,
        dir,
        topPlay: (summary.topCandidates as Array<{ playName: string }>)[0]?.playName,
        topScore: (summary.topCandidates as Array<{ composite: number }>)[0]?.composite,
      });
    } catch (err) {
      console.warn(`  FAILED: ${err instanceof Error ? err.message : String(err)}`);
      index.push({ ...sample, error: String(err) });
    }
  }

  writeFileSync(join(outDir, "sample-index.json"), `${JSON.stringify(index, null, 2)}\n`);
  console.log(`\nWrote ${index.length} samples → ${outDir}`);
}

async function runProbe(outDir: string): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  const af = await loadPlaybook("air-force");
  const probeFormations = [
    "Gun Split",
    "Gun Split Twins",
    "Gun Split Tight",
    "Power I Strong",
    "Flexbone Trio Right",
  ];

  const rows: Array<Record<string, unknown>> = [];

  for (const formation of probeFormations) {
    const formationType = af.types.get(formation);
    const refFormation = af.reference.formations.find((f) => f.name === formation);
    if (!formationType || !refFormation) continue;

    const playNames = refFormation.plays.map((p) => normalizePlayName(p));
    const crops = collectFormationCrops(af.reference, af.extracted).get(formation) ?? [];
    const fetched = await fetchReferenceImagesForFormation(
      af.reference,
      formation,
      formationType,
      playNames,
    );
    if (fetched.images.length !== playNames.length) continue;

    const refRasters: NormalizedRaster[] = [];
    for (const image of fetched.images) {
      refRasters.push(await normalizeDiagramRaster(image.buffer));
    }
    const baseline = buildFormationBaseline(refRasters);
    const variance = buildVarianceMap(refRasters);
    let varMean = 0;
    for (let i = 0; i < variance.pixels.length; i += 1) varMean += variance.pixels[i];
    varMean /= variance.pixels.length;

    // Sample up to 6 crops
    for (const crop of crops.slice(0, 6)) {
      const buf = af.extracted.mediaFiles.get(crop.mediaPath);
      if (!buf) continue;
      const owned = await normalizeDiagramRaster(buf);
      const { aligned, registration } = registerRaster(owned, baseline);

      // Pair against local-best and a mid-ranked wrong play
      const { prepared } = prepareReferenceSet(refRasters);
      const scores = prepared.map((p, idx) => ({
        idx,
        pair: scoreAlignedOwnedAgainstReference(aligned, p, baseline, registration),
      }));
      scores.sort((a, b) => b.pair.composite - a.pair.composite);
      const best = scores[0];
      const wrong = scores[Math.min(scores.length - 1, Math.floor(scores.length / 2))];

      const scaleBest = registerWithScaleProbe(owned, refRasters[best.idx]);
      const scaleWrong = registerWithScaleProbe(owned, refRasters[wrong.idx]);

      const ownedColor = await extractColorInkMask(buf);
      const bestColor = await extractColorInkMask(fetched.images[best.idx].buffer);
      const wrongColor = await extractColorInkMask(fetched.images[wrong.idx].buffer);

      const ownedSig = playSignature(aligned, baseline);
      const bestSig = prepared[best.idx].signature;
      const wrongSig = prepared[wrong.idx].signature;

      // Variance-weighted residual similarity (probe)
      const weightedSim = (a: NormalizedRaster, b: NormalizedRaster) => {
        let dot = 0;
        let na = 0;
        let nb = 0;
        for (let i = 0; i < a.pixels.length; i += 1) {
          const w = variance.pixels[i] / 255;
          const wa = a.pixels[i] * w;
          const wb = b.pixels[i] * w;
          dot += wa * wb;
          na += wa * wa;
          nb += wb * wb;
        }
        if (na === 0 || nb === 0) return 0;
        return Math.max(0, Math.min(1, (dot / Math.sqrt(na * nb) + 1) / 2));
      };

      rows.push({
        formation,
        cropId: crop.cropId,
        bestPlay: playNames[best.idx],
        wrongPlay: playNames[wrong.idx],
        v2Margin: best.pair.composite - wrong.pair.composite,
        bestComposite: best.pair.composite,
        wrongComposite: wrong.pair.composite,
        bestRegistered: best.pair.signals.registered,
        bestResidual: best.pair.signals.residual,
        bestEdges: best.pair.signals.edges,
        registration,
        scaleBest,
        scaleWrong,
        scaleHelpsBest: scaleBest.rmse < scaleBest.translationOnlyRmse - 0.5,
        colorOverlapBest: foregroundOverlap(ownedColor, bestColor, 20),
        colorOverlapWrong: foregroundOverlap(ownedColor, wrongColor, 20),
        varianceWeightedBest: weightedSim(ownedSig, bestSig),
        varianceWeightedWrong: weightedSim(ownedSig, wrongSig),
        varianceWeightedMargin:
          weightedSim(ownedSig, bestSig) - weightedSim(ownedSig, wrongSig),
        formationVarianceMean: varMean,
        registeredPixelRmseBest: Math.sqrt(mse(aligned.pixels, refRasters[best.idx].pixels)),
      });
    }
    console.log(`Probed ${formation}`);
  }

  const scaleHelpRate =
    rows.filter((r) => r.scaleHelpsBest).length / Math.max(1, rows.length);
  const avgRegRmse =
    rows.reduce((s, r) => s + (r.registeredPixelRmseBest as number), 0) / Math.max(1, rows.length);
  const colorSeparates =
    rows.filter(
      (r) => (r.colorOverlapBest as number) > (r.colorOverlapWrong as number) + 0.05,
    ).length / Math.max(1, rows.length);
  const varMarginAvg =
    rows.reduce((s, r) => s + (r.varianceWeightedMargin as number), 0) / Math.max(1, rows.length);
  const v2MarginAvg =
    rows.reduce((s, r) => s + (r.v2Margin as number), 0) / Math.max(1, rows.length);

  const findings = {
    sampleRows: rows.length,
    scaleHelpRate,
    avgRegisteredPixelRmse: avgRegRmse,
    normalizedExactPractical:
      avgRegRmse < 8
        ? "possibly — near-exact tier may be practical for some pairs"
        : "no — average registered RMSE too high for pixel-near-exact (DOCX vs cfb.fan differ)",
    colorSeparatesRate: colorSeparates,
    colorRecommendation:
      colorSeparates >= 0.55
        ? "add color-ink overlap signal"
        : "keep grayscale primary; color optional weak signal",
    varianceMarginAvg: varMarginAvg,
    v2MarginAvg,
    varianceRecommendation:
      varMarginAvg > v2MarginAvg * 0.8
        ? "variance weighting looks promising"
        : "variance weighting needs evaluation in full matcher",
    rows,
  };

  writeFileSync(join(outDir, "probe-findings.json"), `${JSON.stringify(findings, null, 2)}\n`);
  console.log("\nPROBE FINDINGS");
  console.log(JSON.stringify({ ...findings, rows: `[${rows.length} rows omitted]` }, null, 2));
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(args.outDir, { recursive: true });

  if (args.probeOnly) {
    await runProbe(args.outDir);
    return;
  }

  if (args.sampleSet) {
    await runSampleSet(args.outDir);
    await runProbe(join(args.outDir, "_probe"));
    return;
  }

  const ctx = await loadPlaybook(args.playbook!);
  const formationType = ctx.types.get(args.formation!);
  if (!formationType) throw new Error(`Unknown formation ${args.formation}`);
  const sample: DiagnosticSample | undefined = MATCHER_V3_DIAGNOSTIC_SAMPLES.find(
    (s) =>
      s.playbook === args.playbook &&
      s.formation === args.formation &&
      s.cropId === args.cropId,
  );
  const { dir } = await diagnoseCrop({
    reference: ctx.reference,
    extracted: ctx.extracted,
    formation: args.formation!,
    formationType,
    cropId: args.cropId!,
    outDir: args.outDir,
    kind: sample?.kind,
    expectedPlay: sample?.playName,
  });
  console.log(`Wrote diagnostics → ${dir}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
