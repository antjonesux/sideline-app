/**
 * SVG auto-trace prototype — VTracer on verified USC Vault play-art crops.
 *
 * Usage (from sideline/):
 *   NODE_PATH=./node_modules npx tsx ./scripts/play-art/svg-prototype/trace-sample.ts
 *   NODE_PATH=./node_modules npx tsx ./scripts/play-art/svg-prototype/trace-sample.ts --calibrate
 *
 * Does not modify matcher/ingest/manifest. Output is operator-only under output/.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { convertBuffer, type Options as VTracerOptions } from "@visioncortex/vtracer";
import { normalizePlayName } from "../../../lib/utils";
import type { PlayArtManifestRecord } from "../types";
import { TRUSTED_PLAYBOOKS } from "../trusted-hash";
import { preprocessPlayArt, type PreprocessMode } from "./preprocess";
import { renderComparisonHtml, type ComparisonRow } from "./render-comparison";
import { TRACE_SAMPLES } from "./sample-set";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SIDELINE_ROOT = join(__dirname, "..", "..", "..");
const MANIFEST_PATH = join(SIDELINE_ROOT, "lib", "generated", "play-art-manifest.json");
const PUBLIC_ROOT = join(SIDELINE_ROOT, "public");
const OUTPUT_DIR = join(__dirname, "output");

const VTRACER_PKG = "@visioncortex/vtracer@1.0.0-alpha.3";

/**
 * Final config after calibration (see README / output/calibration/).
 * Winner: E-spline-speckle8-simp2 — full-color background kept, 2× Lanczos input,
 * higher filterSpeckle + simplify cut path noise vs A without collapsing routes.
 */
export const FINAL_VTRACER_OPTIONS: VTracerOptions = {
  clustering: "color-cluster",
  hierarchical: "stacked",
  mode: "spline",
  filterSpeckle: 8,
  colorPrecision: 6,
  layerDifference: 16,
  cornerThreshold: 60,
  lengthThreshold: 4,
  spliceThreshold: 45,
  simplify: 2,
  pathPrecision: 2,
  maxColors: 12,
  optimize: 2,
};

export const FINAL_PREPROCESS = {
  mode: "full" as PreprocessMode,
  colors: 12,
  scale: 2,
};

type ResolvedSample = {
  category: string;
  formation: string;
  playName: string;
  note: string;
  assetId: string;
  assetPath: string;
  diskPath: string;
  slug: string;
};

type TraceMeta = {
  slug: string;
  formation: string;
  playName: string;
  category: string;
  note: string;
  assetId: string;
  originalBytes: number;
  inputBytes: number;
  svgBytes: number;
  pathCount: number;
  traceMs: number;
  width: number;
  height: number;
  preprocessMode: string;
  scale: number;
  colors: number;
};

function slugify(formation: string, playName: string): string {
  return `${formation}__${playName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function countPaths(svg: string): number {
  return (svg.match(/<path\b/gi) ?? []).length;
}

function loadUscTrustedIndex(): Map<string, PlayArtManifestRecord> {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as {
    entries: PlayArtManifestRecord[];
  };
  const byKey = new Map<string, PlayArtManifestRecord>();
  for (const entry of manifest.entries) {
    if (!TRUSTED_PLAYBOOKS.has(entry.playbook.trim())) continue;
    if (entry.playbook.trim() !== "USC") continue;
    const key = `${entry.formation.trim().toLowerCase()}\0${normalizePlayName(entry.play_name)}`;
    byKey.set(key, entry);
  }
  return byKey;
}

function resolveSamples(): ResolvedSample[] {
  const index = loadUscTrustedIndex();
  const resolved: ResolvedSample[] = [];

  for (const sample of TRACE_SAMPLES) {
    const key = `${sample.formation.trim().toLowerCase()}\0${normalizePlayName(sample.playName)}`;
    const entry = index.get(key);
    if (!entry) {
      throw new Error(
        `Trusted USC mapping missing: ${sample.formation} / ${sample.playName}`,
      );
    }
    const relativePublic = entry.asset_path.replace(/^\//, "");
    const diskPath = join(PUBLIC_ROOT, relativePublic);
    if (!existsSync(diskPath)) {
      throw new Error(`Asset missing on disk: ${diskPath}`);
    }
    resolved.push({
      category: sample.category,
      formation: sample.formation,
      playName: sample.playName,
      note: sample.note,
      assetId: entry.asset_id,
      assetPath: entry.asset_path,
      diskPath,
      slug: slugify(sample.formation, sample.playName),
    });
  }

  return resolved;
}

async function traceOne(
  sample: ResolvedSample,
  preprocess: typeof FINAL_PREPROCESS,
  tracerOptions: VTracerOptions,
): Promise<{ meta: TraceMeta; svg: string; inputPng: Buffer }> {
  const originalBytes = readFileSync(sample.diskPath).byteLength;
  const pre = await preprocessPlayArt(sample.diskPath, preprocess);

  const t0 = performance.now();
  const svg = convertBuffer(new Uint8Array(pre.buffer), tracerOptions);
  const traceMs = Math.round(performance.now() - t0);

  return {
    svg,
    inputPng: pre.buffer,
    meta: {
      slug: sample.slug,
      formation: sample.formation,
      playName: sample.playName,
      category: sample.category,
      note: sample.note,
      assetId: sample.assetId,
      originalBytes,
      inputBytes: pre.buffer.byteLength,
      svgBytes: Buffer.byteLength(svg, "utf8"),
      pathCount: countPaths(svg),
      traceMs,
      width: pre.width,
      height: pre.height,
      preprocessMode: pre.mode,
      scale: pre.scale,
      colors: pre.colors,
    },
  };
}

type CalibCandidate = {
  id: string;
  preprocess: typeof FINAL_PREPROCESS;
  tracer: VTracerOptions;
};

const CALIBRATION_CANDIDATES: CalibCandidate[] = [
  {
    id: "A-full-spline-2x-12c",
    preprocess: { mode: "full", colors: 12, scale: 2 },
    tracer: {
      clustering: "color-cluster",
      hierarchical: "stacked",
      mode: "spline",
      filterSpeckle: 4,
      colorPrecision: 6,
      layerDifference: 16,
      cornerThreshold: 60,
      lengthThreshold: 4,
      spliceThreshold: 45,
      pathPrecision: 2,
      maxColors: 12,
      optimize: 1,
    },
  },
  {
    id: "E-spline-speckle8-simp2",
    preprocess: { mode: "full", colors: 12, scale: 2 },
    tracer: { ...FINAL_VTRACER_OPTIONS },
  },
  {
    id: "B-ink-spline-2x-12c",
    preprocess: { mode: "ink", colors: 12, scale: 2 },
    tracer: { ...FINAL_VTRACER_OPTIONS },
  },
  {
    id: "C-full-polygon-2x-8c",
    preprocess: { mode: "full", colors: 8, scale: 2 },
    tracer: {
      ...FINAL_VTRACER_OPTIONS,
      mode: "polygon",
      colorPrecision: 8,
      maxColors: 8,
    },
  },
  {
    id: "D-full-spline-1x-16c",
    preprocess: { mode: "full", colors: 16, scale: 1 },
    tracer: {
      ...FINAL_VTRACER_OPTIONS,
      colorPrecision: 8,
      maxColors: 16,
    },
  },
];

async function runCalibration(samples: ResolvedSample[]): Promise<void> {
  const calibDir = join(OUTPUT_DIR, "calibration");
  mkdirSync(calibDir, { recursive: true });
  const probe = samples.slice(0, 3);
  const lines: string[] = [
    "# VTracer calibration (first 3 sample plays)",
    "",
    "Metrics: pathCount (lower often cleaner for line art), svgBytes, visual check of routes/arrows.",
    "",
  ];

  for (const sample of probe) {
    lines.push(`## ${sample.formation} — ${sample.playName}`);
    lines.push("");
    for (const cand of CALIBRATION_CANDIDATES) {
      const { meta, svg, inputPng } = await traceOne(sample, cand.preprocess, cand.tracer);
      const prefix = `${sample.slug}__${cand.id}`;
      writeFileSync(join(calibDir, `${prefix}.svg`), svg, "utf8");
      writeFileSync(join(calibDir, `${prefix}__input.png`), inputPng);
      lines.push(
        `- **${cand.id}**: paths=${meta.pathCount}, svg=${meta.svgBytes} B, ` +
          `input=${meta.inputBytes} B, ${meta.traceMs} ms, ${meta.width}×${meta.height}`,
      );
      console.log(
        `[calib] ${sample.playName} / ${cand.id}: ${meta.pathCount} paths, ${meta.svgBytes} B, ${meta.traceMs} ms`,
      );
    }
    lines.push("");
  }

  lines.push("## Selection notes");
  lines.push("");
  lines.push(
    "Operator picks the candidate with cleanest route/arrow fidelity at ~400px and zoom.",
  );
  lines.push(
    "Selected for full run: **E-spline-speckle8-simp2** (full BG, 2× Lanczos, 12 colors, spline, filterSpeckle 8, simplify 2). Ink/white-BG (B) discarded — Vault cards are dark-field.",
  );
  lines.push("");

  writeFileSync(join(calibDir, "calibration-report.md"), lines.join("\n"), "utf8");
  console.log(`Wrote ${join(calibDir, "calibration-report.md")}`);
}

async function runFullTrace(samples: ResolvedSample[]): Promise<void> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const originalsDir = join(OUTPUT_DIR, "originals");
  mkdirSync(originalsDir, { recursive: true });

  const metas: TraceMeta[] = [];
  const rows: ComparisonRow[] = [];

  for (const sample of samples) {
    console.log(`Tracing ${sample.category}: ${sample.formation} / ${sample.playName}`);
    const { meta, svg, inputPng } = await traceOne(
      sample,
      FINAL_PREPROCESS,
      FINAL_VTRACER_OPTIONS,
    );

    const originalName = `${sample.slug}__original.jpg`;
    const inputName = `${sample.slug}__input.png`;
    const svgName = `${sample.slug}.svg`;

    copyFileSync(sample.diskPath, join(originalsDir, originalName));
    writeFileSync(join(OUTPUT_DIR, inputName), inputPng);
    writeFileSync(join(OUTPUT_DIR, svgName), svg, "utf8");

    metas.push(meta);
    rows.push({
      slug: sample.slug,
      category: sample.category,
      formation: sample.formation,
      playName: sample.playName,
      note: sample.note,
      originalRel: `originals/${originalName}`,
      inputRel: inputName,
      svgRel: svgName,
      originalBytes: meta.originalBytes,
      inputBytes: meta.inputBytes,
      svgBytes: meta.svgBytes,
      pathCount: meta.pathCount,
      traceMs: meta.traceMs,
      width: meta.width,
      height: meta.height,
    });
  }

  // Merge assessments if present
  const assessmentPath = join(__dirname, "assessment.json");
  if (existsSync(assessmentPath)) {
    const assessments = JSON.parse(readFileSync(assessmentPath, "utf8")) as Record<
      string,
      { assessment: string; notes?: string }
    >;
    for (const row of rows) {
      const a = assessments[row.slug];
      if (a) {
        row.assessment = a.assessment;
        row.assessmentNotes = a.notes;
      }
    }
  }

  const html = renderComparisonHtml({
    title: "SVG Auto-Trace Prototype — USC sample (20)",
    generatedAt: new Date().toISOString(),
    tool: VTRACER_PKG,
    preprocessSummary:
      `mode=${FINAL_PREPROCESS.mode}, crop=${"40,72,546x250"}, colors=${FINAL_PREPROCESS.colors}, scale=${FINAL_PREPROCESS.scale}× Lanczos3`,
    tracerConfigSummary: JSON.stringify(FINAL_VTRACER_OPTIONS),
    rows,
  });
  writeFileSync(join(OUTPUT_DIR, "comparison.html"), html, "utf8");

  const summary = {
    tool: VTRACER_PKG,
    preprocess: FINAL_PREPROCESS,
    tracer: FINAL_VTRACER_OPTIONS,
    sampleCount: metas.length,
    plays: metas,
    aggregates: {
      avgTraceMs: Math.round(metas.reduce((s, m) => s + m.traceMs, 0) / metas.length),
      avgSvgBytes: Math.round(metas.reduce((s, m) => s + m.svgBytes, 0) / metas.length),
      avgOriginalBytes: Math.round(
        metas.reduce((s, m) => s + m.originalBytes, 0) / metas.length,
      ),
      avgPathCount: Math.round(metas.reduce((s, m) => s + m.pathCount, 0) / metas.length),
      minPaths: Math.min(...metas.map((m) => m.pathCount)),
      maxPaths: Math.max(...metas.map((m) => m.pathCount)),
    },
  };
  writeFileSync(join(OUTPUT_DIR, "trace-metadata.json"), JSON.stringify(summary, null, 2), "utf8");

  const sampleList = samples
    .map(
      (s, i) =>
        `${i + 1}. [${s.category}] ${s.formation} — ${s.playName}\n` +
        `   asset: ${s.assetPath}\n` +
        `   disk: ${relative(SIDELINE_ROOT, s.diskPath)}\n` +
        `   note: ${s.note}`,
    )
    .join("\n");
  writeFileSync(join(OUTPUT_DIR, "sample-list.txt"), sampleList + "\n", "utf8");

  console.log(`\nWrote comparison → ${join(OUTPUT_DIR, "comparison.html")}`);
  console.log(
    `Avg: ${summary.aggregates.avgTraceMs} ms, ${summary.aggregates.avgPathCount} paths, ` +
      `SVG ${summary.aggregates.avgSvgBytes} B vs PNG ${summary.aggregates.avgOriginalBytes} B`,
  );
}

async function main(): Promise<void> {
  const calibrate = process.argv.includes("--calibrate");
  const samples = resolveSamples();
  console.log(`Resolved ${samples.length} trusted USC samples`);
  mkdirSync(OUTPUT_DIR, { recursive: true });

  if (calibrate) {
    await runCalibration(samples);
    return;
  }

  await runFullTrace(samples);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
