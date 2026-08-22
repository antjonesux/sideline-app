#!/usr/bin/env node
/**
 * Owned play-art ingestion pipeline (offline operator workflow).
 *
 * Usage (from sideline/):
 *   npm run ingest:play-art -- \
 *     --reference scripts/play-art/references/cfb27-offense-usc.json \
 *     --source scripts/play-art/source/cfb27-offense-USC.docx
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { extractPlayArtDocx, summarizeDocxStructure } from "./extract-docx";
import { mapPlayArtPositionally } from "./map-positional";
import {
  manifestRecordsFromMapped,
  mergeManifestForPlaybook,
  writeValidationReport,
} from "./output";
import { loadPlayArtReference, referenceSlug, totalExpectedPlays } from "./reference";
import {
  clearStaging,
  publishStaging,
  writeManifestToStaging,
  writeMappedAssetsToStaging,
} from "./staging";
import { printValidationSummary, validatePlayArtMapping } from "./validate";

const __dirname = dirname(fileURLToPath(import.meta.url));

type CliArgs = {
  referencePath: string;
  sourcePath: string;
  structureReport: boolean;
  validateOnly: boolean;
  reportDir: string;
};

function parseArgs(argv: string[]): CliArgs {
  let referencePath = "";
  let sourcePath = "";
  let structureReport = false;
  let validateOnly = false;
  let reportDir = join(__dirname, "reports");

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--reference" && argv[i + 1]) {
      referencePath = argv[i + 1];
      i += 1;
    } else if ((arg === "--source" || arg === "--docx") && argv[i + 1]) {
      sourcePath = argv[i + 1];
      i += 1;
    } else if (arg === "--structure-report") {
      structureReport = true;
    } else if (arg === "--validate-only") {
      validateOnly = true;
    } else if (arg === "--report-dir" && argv[i + 1]) {
      reportDir = argv[i + 1];
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg.startsWith("-")) {
      console.error(`Unknown flag: ${arg}`);
      process.exit(1);
    }
  }

  if (!referencePath || !sourcePath) {
    console.error("Missing required --reference and --source paths.\n");
    printHelp();
    process.exit(1);
  }

  if (!existsSync(sourcePath)) {
    console.error(`Source DOCX not found: ${sourcePath}`);
    process.exit(1);
  }

  return { referencePath, sourcePath, structureReport, validateOnly, reportDir };
}

function printHelp(): void {
  console.log(`Owned play-art ingestion pipeline

Required:
  --reference <path>   Canonical ordered reference JSON
  --source <path>        Purchased source DOCX (alias: --docx)

Optional:
  --structure-report     Print DOCX block counts and exit
  --validate-only        Map + validate; do not publish assets or manifest
  --report-dir <path>    Validation report output (default: scripts/play-art/reports)
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
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

  clearStaging(slug);

  const extracted = await extractPlayArtDocx(args.sourcePath, reference);
  console.log(
    `  Source strips: ${extracted.structure.embeddedImages} embedded ` +
      `(${extracted.structure.formationHeaders} headers, ${extracted.structure.playStrips} play strips) → ` +
      `${extracted.structure.generatedPlayCards} play cards`,
  );
  const { mapped, formationHeaders, playCards } = mapPlayArtPositionally(reference, extracted);
  const report = validatePlayArtMapping(reference, mapped, formationHeaders, playCards);

  mkdirSync(args.reportDir, { recursive: true });
  const reportFileName = `${reference.playbook.trim().toLowerCase().replace(/\s+/g, "-")}-validation.json`;
  const reportPath = join(args.reportDir, reportFileName);
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  printValidationSummary(report);
  console.log(`Validation report: ${reportPath}`);

  if (report.status === "fail") {
    clearStaging(slug);
    console.error("Pipeline aborted: validation failed. Published assets and manifest were not modified.");
    process.exit(1);
  }

  if (args.validateOnly) {
    console.log("Validate-only mode: skipping asset publish and manifest update.");
    process.exit(0);
  }

  const assetCount = writeMappedAssetsToStaging(slug, mapped, extracted.mediaFiles);
  const records = manifestRecordsFromMapped(reference, mapped);
  const manifest = mergeManifestForPlaybook(reference, records);
  writeManifestToStaging(slug, manifest);

  const published = publishStaging(slug, reference, manifest);

  console.log(`Published ${published.assetCount} assets under ${published.publicRoot}`);
  console.log(`Manifest: ${published.manifestPath} (${records.length} entries for ${reference.playbook})`);
  console.log("Done.");
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exit(1);
});
