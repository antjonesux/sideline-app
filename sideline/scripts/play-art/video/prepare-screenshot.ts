/**
 * First-class screenshot play-art source preparation (no publish).
 *
 *   npm run play-art:screenshot -- --source=scripts/play-art/source-screenshots/cfb27/offense/texas
 *
 * Directory path is namespace authority: {game}/{side}/{playbook-slug}/
 */
import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { importSeedModule, referenceFromSeed } from "../build-reference";
import {
  printScreenshotPlaybookReport,
  processScreenshotPlaybook,
  shouldSkipScreenshotPlaybook,
} from "./process-screenshot-playbook";
import {
  resolveScreenshotNamespace,
  screenshotStagingRoot,
} from "./resolve-screenshot-namespace";

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
  const fromPlayArt = resolve(
    PLAY_ART_ROOT,
    raw.replace(/^scripts\/play-art\//, ""),
  );
  if (existsSync(fromPlayArt)) return fromPlayArt;
  return fromCwd;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (hasFlag(argv, "--help") || hasFlag(argv, "-h")) {
    console.log(`Usage:
  npm run play-art:screenshot -- --source=<source-screenshots/{game}/{side}/{slug}> [--force] [--dry-run]

Example:
  npm run play-art:screenshot -- --source=scripts/play-art/source-screenshots/cfb27/offense/texas

Folder path is the sole namespace authority (fail-closed).
Does not publish or modify production play-art artifacts.
`);
    return;
  }

  const sourceRaw = readFlag(argv, "--source");
  if (!sourceRaw) {
    throw new Error(
      `Missing --source=<folder>. Example:\n` +
        `  npm run play-art:screenshot -- --source=${join(
          "scripts/play-art/source-screenshots/cfb27/offense",
          "texas",
        )}`,
    );
  }

  const folderPath = resolveSourcePath(sourceRaw);
  const ns = resolveScreenshotNamespace(folderPath);
  const force = hasFlag(argv, "--force");

  console.log("Resolved screenshot namespace");
  console.log(`  Folder: ${ns.folderPath}`);
  console.log(`  Game: ${ns.gameVersion}`);
  console.log(`  Side: ${ns.side}`);
  console.log(`  Playbook: ${ns.playbookDisplayName} (${ns.playbookSlug})`);
  console.log(`  Seed: ${ns.seedSlug}`);
  console.log("");

  if (!existsSync(ns.folderPath)) {
    throw new Error(
      `Screenshot folder not found: ${ns.folderPath}\n` +
        `Create it and drop PNG/JPG play-selection screenshots (1920×1080 OBS layout).`,
    );
  }

  if (hasFlag(argv, "--dry-run")) {
    console.log("Dry-run: namespace validated. Stopping before OCR.");
    return;
  }

  const stagingRoot = screenshotStagingRoot({
    playArtRoot: PLAY_ART_ROOT,
    gameVersion: ns.gameVersion,
    side: ns.side,
    playbookSlug: ns.playbookSlug,
  });
  const skip = shouldSkipScreenshotPlaybook({
    stagingRoot,
    sourceFolder: ns.folderPath,
    force,
  });
  if (skip.skip) {
    console.log(`SKIPPED: ${skip.reason}`);
    return;
  }

  const seed = await importSeedModule(ns.seedSlug);
  const reference = referenceFromSeed(seed);
  const report = await processScreenshotPlaybook({
    folderPath: ns.folderPath,
    playArtRoot: PLAY_ART_ROOT,
    reference,
    namespace: ns,
  });
  printScreenshotPlaybookReport(report);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
