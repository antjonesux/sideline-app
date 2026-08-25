#!/usr/bin/env node
/**
 * Owned play-art ingestion pipeline (offline operator workflow).
 *
 * Usage (from sideline/):
 *   npm run play-art:ingest -- --source="scripts/play-art/source/Multiple & Pro Style/California.docx"
 *
 * Backward-compatible:
 *   npm run play-art:ingest -- \
 *     --reference scripts/play-art/references/cfb27-offense-air-force.json \
 *     --source "scripts/play-art/source/Option & Spread Option/Air Force.docx"
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePlayName } from "../../lib/utils";
import { buildReferenceFromSeedSlug, resolveSeedSlugFromArgs } from "./build-reference";
import { assignContentHashedAssets } from "./content-hash";
import { extractPlayArtDocx, summarizeDocxStructure } from "./extract-docx";
import { seedSlugToReferencePath } from "./lib/slug-utils";
import { mapPlayArtPositionally } from "./map-positional";
import {
  loadSeedForReference,
  matchPlayArtVisually,
} from "./match-play-art";
import {
  mergeMatchingIntoValidationReport,
  printFormationMatchingReport,
  printMatchingSummary,
  writeMatchingReport,
} from "./matching-report";
import { logReferenceDownloadSummary } from "./reference-image";
import {
  manifestRecordsFromMapped,
  mergeManifestForPlaybook,
} from "./output";
import {
  loadPlayArtReference,
  referenceSlug,
  referencesDir,
  totalExpectedPlays,
} from "./reference";
import {
  clearStaging,
  publishStaging,
  writeManifestToStaging,
  writeMappedAssetsToStaging,
} from "./staging";
import { printValidationSummary, validatePlayArtMapping } from "./validate";
import type { MappedPlayArt, PlayArtManifestRecord } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GENERATED_MANIFEST_PATH = join(__dirname, "..", "..", "lib", "generated", "play-art-manifest.json");

type CliArgs = {
  referencePath: string;
  sourcePath: string;
  structureReport: boolean;
  validateOnly: boolean;
  regression: boolean;
  positional: boolean;
  approveReview: boolean;
  skipTrustedHash: boolean;
  noAutoReference: boolean;
  reportDir: string;
  overridesPath?: string;
  seedSlug?: string;
};

function readFlag(argv: string[], name: string): string | undefined {
  const eqPrefix = `${name}=`;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === name && argv[i + 1] && !argv[i + 1].startsWith("-")) {
      return argv[i + 1];
    }
    if (arg.startsWith(eqPrefix)) {
      return arg.slice(eqPrefix.length);
    }
  }
  return undefined;
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name);
}

function suggestNearbyDocx(sourcePath: string): string | null {
  const dir = dirname(sourcePath);
  if (!existsSync(dir)) return null;
  const wanted = basename(sourcePath).toLowerCase();
  const stem = wanted.replace(/\.docx?$/i, "");
  try {
    const candidates = readdirSync(dir).filter((name) => name.toLowerCase().endsWith(".docx"));
    const hit = candidates.find(
      (name) =>
        name.toLowerCase() === `${stem}.docx` ||
        name.toLowerCase().replace(/\.docx$/i, "") === stem,
    );
    return hit ?? null;
  } catch {
    return null;
  }
}

async function parseArgs(argv: string[]): Promise<CliArgs> {
  if (hasFlag(argv, "--help") || hasFlag(argv, "-h")) {
    printHelp();
    process.exit(0);
  }

  let referencePath = readFlag(argv, "--reference")?.trim() ?? "";
  let sourcePath = (readFlag(argv, "--source") ?? readFlag(argv, "--docx"))?.trim() ?? "";
  const structureReport = hasFlag(argv, "--structure-report");
  const validateOnly = hasFlag(argv, "--validate-only");
  const regression = hasFlag(argv, "--regression");
  const positional = hasFlag(argv, "--positional");
  const approveReview = hasFlag(argv, "--approve-review");
  const skipTrustedHash = hasFlag(argv, "--skip-trusted-hash");
  const noAutoReference = hasFlag(argv, "--no-auto-reference");
  const reportDir = readFlag(argv, "--report-dir")?.trim() || join(__dirname, "reports");
  const overridesPath = readFlag(argv, "--overrides")?.trim();

  const knownFlags = new Set([
    "--reference",
    "--source",
    "--docx",
    "--structure-report",
    "--validate-only",
    "--regression",
    "--positional",
    "--approve-review",
    "--skip-trusted-hash",
    "--no-auto-reference",
    "--report-dir",
    "--overrides",
    "--seed",
    "--team",
    "--game",
    "--help",
    "-h",
  ]);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("-")) continue;
    const name = arg.includes("=") ? arg.slice(0, arg.indexOf("=")) : arg;
    if (!knownFlags.has(name)) {
      console.error(`Unknown flag: ${arg}`);
      process.exit(1);
    }
    if (
      !arg.includes("=") &&
      (name === "--reference" ||
        name === "--source" ||
        name === "--docx" ||
        name === "--report-dir" ||
        name === "--overrides" ||
        name === "--seed" ||
        name === "--team" ||
        name === "--game")
    ) {
      i += 1;
    }
  }

  if (!sourcePath && !referencePath) {
    console.error(
      "Error: Must provide either --source=<docx> or --seed=<slug> (or --reference=<path> for ingest).\n",
    );
    printHelp();
    process.exit(1);
  }

  let seedSlug: string | undefined;

  if (!sourcePath) {
    console.error("Error: --source=<docx> is required for ingest.\n");
    printHelp();
    process.exit(1);
  }

  if (!existsSync(sourcePath)) {
    const suggestion = suggestNearbyDocx(sourcePath);
    let message = `Error: DOCX not found: ${sourcePath}`;
    if (suggestion) {
      message += `\nDid you mean: ${suggestion}?`;
    }
    console.error(message);
    process.exit(1);
  }

  if (!referencePath) {
    try {
      const resolved = resolveSeedSlugFromArgs(argv);
      seedSlug = resolved.seedSlug;
      referencePath = seedSlugToReferencePath(seedSlug, referencesDir());
      console.log(`Derived seed: ${seedSlug}`);
      console.log(`Derived reference path: ${referencePath}`);
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }

    if (!existsSync(referencePath)) {
      if (noAutoReference) {
        console.error(
          `Error: Reference not found at ${referencePath}.\n` +
            `Pass --reference=<path>, run play-art:reference first, or omit --no-auto-reference to auto-build.`,
        );
        process.exit(1);
      }
      console.log(
        `Reference not found at ${referencePath}. Auto-building from seed ${seedSlug}...`,
      );
      try {
        const built = await buildReferenceFromSeedSlug(seedSlug);
        referencePath = built.path;
        console.log(`Auto-built reference: ${referencePath}`);
      } catch (err) {
        const underlying = err instanceof Error ? err.message : String(err);
        console.error(`Error: Failed to build reference for ${seedSlug}.`);
        console.error(`Underlying error: ${underlying}`);
        console.error("Possible causes:");
        console.error(
          "  - Team slug not recognized (may need source-aliases.json or seed module)",
        );
        console.error("  - Missing lib/seed/playbooks/{seed}.ts");
        console.error("  - Seed export shape invalid");
        process.exit(1);
      }
    }
  }

  return {
    referencePath,
    sourcePath,
    structureReport,
    validateOnly,
    regression,
    positional,
    reportDir,
    overridesPath,
    approveReview,
    skipTrustedHash,
    noAutoReference,
    seedSlug,
  };
}

function printHelp(): void {
  console.log(`Owned play-art ingestion pipeline

Primary (recommended):
  --source <path>      Purchased source DOCX (alias: --docx)
                       Derives seed + reference path; auto-builds reference if missing

Backward-compatible:
  --reference <path>   Canonical ordered reference JSON (skips auto-derive)

Optional:
  --seed=<slug>        Override seed when deriving reference
  --team=<slug>        Team/scheme slug (with --game) when deriving
  --game=cfb27         Game version for seed derivation (default: cfb27)
  --no-auto-reference  Fail if derived reference is missing (do not auto-build)
  --structure-report   Print DOCX block counts and exit
  --validate-only      Map + validate; do not publish assets or manifest
  --regression         Visual-match benchmark vs published manifest (no publish)
  --positional         Use legacy positional mapping (debug / USC comparison)
  --approve-review     Allow publish when REVIEW items remain (operator reviewed report)
  --skip-trusted-hash  Force pure visual path (ignore trusted owned-asset hashes)
  --overrides <path>   Formation-scoped REVIEW override JSON
  --report-dir <path>  Validation report output (default: scripts/play-art/reports)
`);
}

function loadManifestEntriesForPlaybook(
  reference: ReturnType<typeof loadPlayArtReference>,
): PlayArtManifestRecord[] {
  if (!existsSync(GENERATED_MANIFEST_PATH)) {
    return [];
  }
  const manifest = JSON.parse(readFileSync(GENERATED_MANIFEST_PATH, "utf8")) as {
    entries: PlayArtManifestRecord[];
  };
  return manifest.entries.filter(
    (entry) =>
      entry.playbook.trim() === reference.playbook.trim() &&
      entry.game_version.trim().toLowerCase() === reference.gameVersion.toLowerCase() &&
      entry.side_of_ball.trim().toLowerCase() === reference.sideOfBall.toLowerCase(),
  );
}

function printRegressionSummary(
  reference: ReturnType<typeof loadPlayArtReference>,
  mapped: MappedPlayArt[],
  matchingReport: Awaited<ReturnType<typeof matchPlayArtVisually>>["matchingReport"] | null,
): void {
  const published = loadManifestEntriesForPlaybook(reference);
  const publishedKey = (formation: string, play: string) =>
    `${formation}\0${normalizePlayName(play)}`;
  const publishedMap = new Map<string, string>();
  const publishedByAsset = new Map<string, { formation: string; play: string }>();
  for (const entry of published) {
    publishedMap.set(
      publishedKey(entry.formation, entry.play_name),
      entry.asset_path,
    );
    publishedByAsset.set(entry.asset_id.toLowerCase(), {
      formation: entry.formation,
      play: normalizePlayName(entry.play_name),
    });
  }

  let recovered = 0;
  let mismatches = 0;
  let missingPublished = 0;

  for (const row of mapped) {
    const key = publishedKey(row.formation, row.playName);
    const publishedPath = publishedMap.get(key);
    if (!publishedPath) {
      missingPublished += 1;
      continue;
    }
    if (publishedPath === row.assetPath) {
      recovered += 1;
    } else {
      mismatches += 1;
    }
  }

  let wrongAutomaticPass = 0;
  let passRecovered = 0;
  if (matchingReport) {
    for (const formation of matchingReport.formations) {
      for (const a of formation.assignments) {
        if (a.status !== "PASS") continue;
        const mappedRow = mapped.find((m) => m.blockIndex === a.blockIndex);
        if (!mappedRow) continue;
        const publishedIdentity = publishedByAsset.get(mappedRow.assetId.toLowerCase());
        if (!publishedIdentity) {
          wrongAutomaticPass += 1;
          continue;
        }
        const playOk =
          publishedIdentity.play === normalizePlayName(a.playName) &&
          publishedIdentity.formation.trim() === a.formation.trim();
        if (playOk) passRecovered += 1;
        else wrongAutomaticPass += 1;
      }
    }
  }

  const rate = published.length === 0 ? 0 : recovered / published.length;
  console.log("");
  console.log(`${reference.playbook.toUpperCase()} REGRESSION (visual vs published manifest)`);
  console.log(`Published entries: ${published.length}`);
  console.log(`Visual mappings: ${mapped.length}`);
  console.log(`Same asset_path at same formation/play: ${recovered}`);
  console.log(`Asset path mismatches: ${mismatches}`);
  console.log(`Published entries without visual mapping: ${missingPublished}`);
  console.log(`Recovery rate: ${(rate * 100).toFixed(1)}%`);
  if (matchingReport) {
    console.log(`PASS recovered vs published identity: ${passRecovered}`);
    console.log(`WRONG automatic PASS: ${wrongAutomaticPass}`);
    console.log(`PASS/REVIEW/FAIL: ${matchingReport.passCount}/${matchingReport.reviewCount}/${matchingReport.failCount}`);
  }
  console.log("");
}

async function main(): Promise<void> {
  const args = await parseArgs(process.argv.slice(2));
  const reference = loadPlayArtReference(args.referencePath);
  const slug = referenceSlug(reference);

  if (args.structureReport) {
    const summary = await summarizeDocxStructure(args.sourcePath, reference);
    console.log(JSON.stringify({ playbook: reference.playbook, ...summary }, null, 2));
    process.exit(0);
  }

  console.log(`Processing ${reference.playbook} (${reference.gameVersion}, ${reference.sideOfBall})`);
  console.log(`  Reference: ${args.referencePath}`);
  console.log(`  Source: ${args.sourcePath}`);
  console.log(`  Expected: ${reference.formations.length} formations, ${totalExpectedPlays(reference)} plays`);
  console.log(
    `  Mapping: ${args.positional ? "positional (legacy)" : "visual-v3.1 (V3 + geometry REVIEW resolver)"}`,
  );

  if (!args.regression) {
    clearStaging(slug);
  }

  const extracted = await extractPlayArtDocx(args.sourcePath, reference);
  const effectiveReference = extracted.effectiveReference ?? reference;
  if (
    extracted.structure.omittedFormations &&
    extracted.structure.omittedFormations.length > 0
  ) {
    console.log(
      `  Omitted ${extracted.structure.omittedFormations.length} optional formation(s) absent from DOCX`,
    );
  }
  console.log(
    `  Source strips: ${extracted.structure.embeddedImages} embedded ` +
      `(${extracted.structure.formationHeaders} headers, ${extracted.structure.playStrips} play strips) → ` +
      `${extracted.structure.generatedPlayCards} play cards`,
  );
  if (extracted.formationOcrAssignments) {
    mkdirSync(args.reportDir, { recursive: true });
    const ocrPath = join(args.reportDir, `${slug}-formation-ocr-assignments.json`);
    writeFileSync(
      ocrPath,
      `${JSON.stringify(
        {
          playbook: reference.playbook,
          stats: extracted.structure.formationOcr,
          assignments: extracted.formationOcrAssignments,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    console.log(`  Formation OCR assignments: ${ocrPath}`);
  }

  let mapped: MappedPlayArt[];
  let formationHeaders: number;
  let playCards: number;
  let matchingReportPath: string | null = null;
  let matchingReport: Awaited<ReturnType<typeof matchPlayArtVisually>>["matchingReport"] | null =
    null;

  if (args.positional) {
    const positional = mapPlayArtPositionally(effectiveReference, extracted);
    mapped = positional.mapped;
    formationHeaders = positional.formationHeaders;
    playCards = positional.playCards;
  } else {
    const seed = await loadSeedForReference(reference);
    const visual = await matchPlayArtVisually(effectiveReference, extracted, seed, {
      overridesPath: args.overridesPath,
      approveReview: args.approveReview,
      // Regression / explicit flag: measure pure visual path (trusted-hash would circularize USC).
      skipTrustedHash: args.skipTrustedHash || args.regression,
    });
    mapped = visual.mapped;
    formationHeaders = visual.formationHeaders;
    playCards = visual.playCards;
    matchingReport = visual.matchingReport;

    printMatchingSummary(matchingReport);
    printFormationMatchingReport(matchingReport);
    logReferenceDownloadSummary(visual.referenceDownloadStats);
    matchingReportPath = writeMatchingReport(matchingReport, args.reportDir, slug);
    console.log(`Matching report: ${matchingReportPath}`);

    if (matchingReport.status !== "pass" && !args.regression && !args.approveReview) {
      clearStaging(slug);
      console.error(
        "Pipeline aborted: visual matching not ready to publish. " +
          "Resolve REVIEW items via matching-overrides or fix FAIL matches.",
      );
      process.exit(1);
    }
  }

  const hashed = assignContentHashedAssets(effectiveReference, mapped, extracted.mediaFiles);
  mapped = hashed.mapped;
  const uniqueAssetCount = hashed.uniqueAssetCount;

  if (args.regression) {
    printRegressionSummary(effectiveReference, mapped, matchingReport);
    process.exit(0);
  }

  const report = validatePlayArtMapping(
    effectiveReference,
    mapped,
    formationHeaders,
    playCards,
  );

  mkdirSync(args.reportDir, { recursive: true });
  const reportFileName = `${reference.playbook.trim().toLowerCase().replace(/\s+/g, "-")}-validation.json`;
  const reportPath = join(args.reportDir, reportFileName);
  const mergedReport = matchingReport
    ? mergeMatchingIntoValidationReport(report, matchingReport)
    : report;
  writeFileSync(reportPath, `${JSON.stringify(mergedReport, null, 2)}\n`, "utf8");

  printValidationSummary(report);
  console.log(`Validation report: ${reportPath}`);

  if (report.status === "fail") {
    clearStaging(slug);
    console.error("Pipeline aborted: validation failed. Published assets and manifest were not modified.");
    process.exit(1);
  }

  if (args.validateOnly) {
    console.log(
      `Validate-only mode: ${mapped.length} logical mappings → ${uniqueAssetCount} unique physical assets ` +
        `(${mapped.length - uniqueAssetCount} duplicates eliminated). Skipping publish.`,
    );
    process.exit(0);
  }

  const staged = writeMappedAssetsToStaging(slug, mapped, extracted.mediaFiles);
  const records = manifestRecordsFromMapped(reference, mapped);
  const manifest = mergeManifestForPlaybook(reference, records);
  writeManifestToStaging(slug, manifest);

  const published = publishStaging(slug, reference, manifest);

  console.log(
    `Published ${published.uniqueAssetCount} unique assets ` +
      `(${records.length} logical mappings, ${records.length - published.uniqueAssetCount} duplicates eliminated)`,
  );
  console.log(`  Public root: ${published.publicRoot}`);
  if (published.removedLegacyRoot) {
    console.log(`  Removed legacy playbook tree: ${published.removedLegacyRoot}`);
  }
  console.log(`Manifest: ${published.manifestPath} (${records.length} entries for ${reference.playbook})`);
  console.log(`Staged unique writes: ${staged.uniqueAssetCount}`);
  console.log("Done.");
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exit(1);
});
