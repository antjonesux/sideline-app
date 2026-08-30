/**
 * Manual screenshot supplements for OBS video gaps (diagnostic only).
 *
 *   npm run play-art:supplement -- --source=scripts/play-art/manual-supplements/cfb27/offense/go-go
 *
 * Path is namespace authority: {game}/{side}/{playbook-slug}/
 * Merges with existing video-staging report; does not overwrite video artifacts.
 * Does NOT publish / modify manifest / overrides / omits / trusted hashes.
 */
import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { importSeedModule, referenceFromSeed } from "../build-reference";
import {
  printManualSupplementReport,
  processManualSupplements,
  resolveSupplementNamespace,
} from "./process-supplements";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLAY_ART_ROOT = join(__dirname, "..");

function readFlag(argv: string[], name: string): string | undefined {
  const eqPrefix = `${name}=`;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === name && argv[i + 1] && !argv[i + 1].startsWith("-")) {
      return argv[i + 1];
    }
    if (arg.startsWith(eqPrefix)) return arg.slice(eqPrefix.length);
  }
  return undefined;
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name);
}

function resolveSourcePath(raw: string): string {
  if (isAbsolute(raw)) return raw;
  const fromCwd = resolve(process.cwd(), raw);
  if (existsSync(fromCwd)) return fromCwd;
  const fromSideline = resolve(join(PLAY_ART_ROOT, "..", ".."), raw);
  if (existsSync(fromSideline)) return fromSideline;
  // Allow creating/validating path even if folder empty — resolve relative to play-art
  const fromPlayArt = resolve(PLAY_ART_ROOT, raw.replace(/^scripts\/play-art\//, ""));
  if (existsSync(fromPlayArt)) return fromPlayArt;
  return fromCwd;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (hasFlag(argv, "--help") || hasFlag(argv, "-h")) {
    console.log(`Usage:
  npm run play-art:supplement -- --source=<manual-supplements/{game}/{side}/{slug}>

Example:
  npm run play-art:supplement -- --source=scripts/play-art/manual-supplements/cfb27/offense/go-go

Folder path is the sole namespace authority (fail-closed).
Diagnostic only — does not publish or modify production play-art artifacts.
`);
    return;
  }

  const sourceRaw = readFlag(argv, "--source");
  if (!sourceRaw) {
    throw new Error(
      `Missing --source=<folder>. Example:\n` +
        `  npm run play-art:supplement -- --source=${join(
          "scripts/play-art/manual-supplements/cfb27/offense/go-go",
        )}`,
    );
  }

  const folderPath = resolveSourcePath(sourceRaw);
  const ns = resolveSupplementNamespace(folderPath);

  console.log("Resolved manual supplement namespace");
  console.log(`  Folder: ${ns.folderPath}`);
  console.log(`  Game: ${ns.gameVersion}`);
  console.log(`  Side: ${ns.side}`);
  console.log(`  Playbook: ${ns.playbookDisplayName} (${ns.playbookSlug})`);
  console.log(`  Seed: ${ns.seedSlug}`);
  console.log("");

  if (!existsSync(ns.folderPath)) {
    throw new Error(
      `Supplement folder not found: ${ns.folderPath}\n` +
        `Create it and drop PNG screenshots (preferred) using the OBS crop layout.`,
    );
  }

  if (hasFlag(argv, "--dry-run")) {
    console.log("Dry-run: namespace validated. Stopping before OCR.");
    return;
  }

  const seed = await importSeedModule(ns.seedSlug);
  const reference = referenceFromSeed(seed);
  if (
    reference.gameVersion !== ns.gameVersion ||
    reference.sideOfBall !== ns.side
  ) {
    throw new Error(
      `Reference namespace mismatch: seed produced ${reference.gameVersion}/${reference.sideOfBall} ` +
        `but folder requires ${ns.gameVersion}/${ns.side}`,
    );
  }

  const report = await processManualSupplements({
    folderPath: ns.folderPath,
    playArtRoot: PLAY_ART_ROOT,
    reference,
    namespace: ns,
  });

  printManualSupplementReport(report);

  console.log("");
  console.log("═".repeat(64));
  console.log("MANUAL SUPPLEMENT WORKFLOW");
  const verdict =
    report.screenshotsFound === 0 ||
    report.screenshotsAccepted > 0 ||
    report.newMissingPlaysRecovered > 0
      ? "PASS"
      : report.screenshotsInvalid > 0 && report.screenshotsAccepted === 0
        ? "NEEDS TUNING"
        : "PASS";
  console.log(verdict);
  console.log("═".repeat(64));
  console.log(`Namespace: ${ns.gameVersion} / ${ns.side} / ${ns.playbookSlug}`);
  console.log(`Supplement folder: ${ns.folderPath}`);
  console.log(`Screenshots processed: ${report.screenshotsAccepted}`);
  console.log(`Cards processed: ${report.cardsProcessed}`);
  console.log(`New missing plays recovered: ${report.newMissingPlaysRecovered}`);
  console.log(`Duplicates ignored: ${report.duplicates}`);
  console.log(`OCR unresolved: ${report.ocrUnresolved}`);
  console.log(`Catalog mismatches: ${report.catalogMismatches}`);
  console.log(
    `Video-only coverage: ${report.videoOnlyCoverage.detected} / ${report.videoOnlyCoverage.expected} (${report.videoOnlyCoverage.pct.toFixed(1)}%)`,
  );
  console.log(
    `Combined coverage: ${report.combinedCoverage.detected} / ${report.combinedCoverage.expected} (${report.combinedCoverage.pct.toFixed(1)}%)`,
  );
  console.log(`Remaining missing: ${report.remainingMissing}`);
  console.log(`Complete formations: ${report.completeFormations}`);
  console.log(`Incomplete formations: ${report.incompleteFormations}`);
  console.log(`Updated recapture queue: ${report.recaptureQueuePath}`);
  console.log("");
  console.log("No production assets published.");
  console.log("No manifest changes.");
  console.log("No override changes.");
  console.log("No omit changes.");
  console.log("No trusted-hash changes.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
