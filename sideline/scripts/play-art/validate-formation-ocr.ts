#!/usr/bin/env node
/**
 * Validate crop-header formation OCR against a random sample.
 *
 * Usage (from sideline/):
 *   npm run play-art:validate-formation-ocr -- \
 *     --reference scripts/play-art/references/cfb27-offense-air-force.json \
 *     --source "scripts/play-art/source/Option & Spread Option/Air Force.docx" \
 *     --sample 30 --seed 42
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { extractPlayArtDocx } from "./extract-docx";
import { FORMATION_HEADER_REGION, normalizeFormationOcrText } from "./formation-ocr";
import { loadPlayArtReference, referenceSlug } from "./reference";

const __dirname = dirname(fileURLToPath(import.meta.url));

type Args = {
  referencePath: string;
  sourcePath: string;
  sample: number;
  seed: number;
  reportDir: string;
};

function parseArgs(argv: string[]): Args {
  let referencePath = "";
  let sourcePath = "";
  let sample = 30;
  let seed = 42;
  let reportDir = join(__dirname, "reports");

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--reference" && argv[i + 1]) {
      referencePath = argv[++i];
    } else if ((arg === "--source" || arg === "--docx") && argv[i + 1]) {
      sourcePath = argv[++i];
    } else if (arg === "--sample" && argv[i + 1]) {
      sample = Number(argv[++i]);
    } else if (arg === "--seed" && argv[i + 1]) {
      seed = Number(argv[++i]);
    } else if (arg === "--report-dir" && argv[i + 1]) {
      reportDir = argv[++i];
    }
  }

  if (!referencePath || !sourcePath) {
    console.error("Required: --reference and --source");
    process.exit(1);
  }
  return { referencePath, sourcePath, sample, seed, reportDir };
}

/** Mulberry32 — deterministic sample picks. */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleIndices(n: number, k: number, seed: number): number[] {
  const rng = mulberry32(seed);
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, Math.min(k, n)).sort((a, b) => a - b);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const reference = loadPlayArtReference(args.referencePath);
  const slug = referenceSlug(reference);

  console.log(`Formation OCR validation — ${reference.playbook}`);
  const extracted = await extractPlayArtDocx(args.sourcePath, reference);
  const assignments = extracted.formationOcrAssignments ?? [];
  if (assignments.length === 0) {
    console.error("No OCR assignments returned (was PLAY_ART_SKIP_FORMATION_OCR set?)");
    process.exit(1);
  }

  const stats = extracted.structure.formationOcr;
  console.log(
    `OCR assigned ${stats?.ocrAssigned ?? "?"}/${assignments.length} ` +
      `(fallback ${(100 * (stats?.fallbackRate ?? 0)).toFixed(1)}%)`,
  );

  const picks = sampleIndices(assignments.length, args.sample, args.seed);
  const sampleDir = join(args.reportDir, `formation-ocr-sample-${slug}`);
  mkdirSync(sampleDir, { recursive: true });

  type SampleRow = {
    index: number;
    cropId: string;
    positionalFormation: string;
    assignedFormation: string;
    ocrRawText: string;
    ocrFormationText: string;
    ocrPlayNameText: string | null;
    matchedFormation: string | null;
    matchConfidence: string;
    formationAssignmentSource: string;
    perCropOcrMatchesAssignment: boolean;
    ocrTextAgreesWithAssignment: boolean;
    headerImage: string;
  };

  const rows: SampleRow[] = [];
  let perCropExact = 0;

  for (const index of picks) {
    const row = assignments[index];
    const buffer = extracted.mediaFiles.get(row.mediaPath);
    if (!buffer) continue;
    const headerName = `${String(index).padStart(4, "0")}-${row.cropId.replace(":", "-")}-header.png`;
    const headerPath = join(sampleDir, headerName);
    await sharp(buffer)
      .extract({ ...FORMATION_HEADER_REGION })
      .png()
      .toFile(headerPath);

    const ocrNorm = normalizeFormationOcrText(row.ocrFormationText);
    const assignedNorm = normalizeFormationOcrText(row.assignedFormation);
    const matchedNorm = row.matchedFormation
      ? normalizeFormationOcrText(row.matchedFormation)
      : "";
    /** Per-crop OCR label agrees with the (section-remapped) assignment. */
    const perCropOcrMatchesAssignment =
      matchedNorm.length > 0 && matchedNorm === assignedNorm;
    /**
     * Soft text agreement (legacy). Do NOT use as the ship gate — section remap
     * can make this circular. Prefer operatorVisualCorrect + perCropExactMatchRate.
     */
    const ocrTextAgreesWithAssignment =
      ocrNorm.length > 0 &&
      (ocrNorm === assignedNorm ||
        ocrNorm.includes(assignedNorm) ||
        assignedNorm.includes(ocrNorm));
    if (perCropOcrMatchesAssignment) perCropExact += 1;

    rows.push({
      index,
      cropId: row.cropId,
      positionalFormation: row.positionalFormation,
      assignedFormation: row.assignedFormation,
      ocrRawText: row.ocrRawText,
      ocrFormationText: row.ocrFormationText,
      ocrPlayNameText: row.ocrPlayNameText,
      matchedFormation: row.matchedFormation,
      matchConfidence: row.matchConfidence,
      formationAssignmentSource: row.formationAssignmentSource,
      perCropOcrMatchesAssignment,
      ocrTextAgreesWithAssignment,
      headerImage: headerName,
    });
  }

  const perCropExactMatchRate = rows.length === 0 ? 0 : perCropExact / rows.length;
  // Ship gate requires operator visual check of sample headers vs assignedFormation.
  // Automated per-crop exact match is a supporting signal (not sufficient alone).
  const report = {
    playbook: reference.playbook,
    sampleSize: rows.length,
    seed: args.seed,
    ocrStats: stats,
    perCropExactMatchCount: perCropExact,
    perCropExactMatchRate,
    /**
     * Operator must set true after inspecting sample header PNGs against
     * assignedFormation. Automated agreement alone is not the ship gate.
     */
    operatorVisualVerified: false,
    operatorVisualCorrect: null as number | null,
    operatorVisualAccuracy: null as number | null,
    shipGate:
      perCropExactMatchRate >= 0.9 &&
      (stats?.fallbackRate ?? 1) <= 0.2,
    shipGateNote:
      "Automated gate: ≥90% per-crop OCR match to assigned formation AND ≤20% fallback. " +
      "Also visually confirm sample headers (set operatorVisualVerified in report).",
    movedFromPositional: assignments.filter((a) => a.assignedFormation !== a.positionalFormation)
      .length,
    samples: rows,
  };

  const reportPath = join(args.reportDir, `${slug}-formation-ocr-validation.json`);
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const fullAssignmentsPath = join(args.reportDir, `${slug}-formation-ocr-assignments.json`);
  writeFileSync(
    fullAssignmentsPath,
    `${JSON.stringify({ playbook: reference.playbook, stats, assignments }, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `Per-crop OCR↔assignment exact: ${perCropExact}/${rows.length} = ${(100 * perCropExactMatchRate).toFixed(1)}%`,
  );
  console.log(`Automated ship signals: ${report.shipGate ? "PASS" : "FAIL"} (still visually confirm headers)`);
  console.log(`Crops moved vs positional labels: ${report.movedFromPositional}`);
  console.log(`Sample headers: ${sampleDir}`);
  console.log(`Report: ${reportPath}`);

  if (!report.shipGate) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
