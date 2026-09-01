/**
 * Batch discover + process first-class screenshot playbooks.
 *
 *   npm run play-art:screenshot-batch
 *   npm run play-art:screenshot-batch -- --force
 *
 * Discovers source-screenshots/{game}/{side}/{slug}/ directories.
 * Continues after individual failures. Does not publish.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { importSeedModule, referenceFromSeed } from "../build-reference";
import {
  printScreenshotPlaybookReport,
  processScreenshotPlaybook,
  shouldSkipScreenshotPlaybook,
  type ScreenshotPlaybookReport,
  type ScreenshotPlaybookStatus,
} from "./process-screenshot-playbook";
import { listScreenshotImages } from "./process-screenshot-screens";
import {
  resolveScreenshotNamespace,
  screenshotStagingRoot,
} from "./resolve-screenshot-namespace";
import type { VideoSideOfBall } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLAY_ART_ROOT = join(__dirname, "..");
const SOURCE_ROOT = join(PLAY_ART_ROOT, "source-screenshots");

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name);
}

type DiscoveredBook = {
  folderPath: string;
  gameVersion: string;
  side: VideoSideOfBall;
  playbookSlug: string;
};

function discoverPlaybookFolders(root: string): DiscoveredBook[] {
  if (!existsSync(root)) return [];
  const out: DiscoveredBook[] = [];
  for (const game of readdirSync(root)) {
    if (game.startsWith(".")) continue;
    const gamePath = join(root, game);
    if (!statSync(gamePath).isDirectory()) continue;
    if (!/^cfb\d+$/i.test(game)) continue;
    for (const side of readdirSync(gamePath)) {
      if (side !== "offense" && side !== "defense") continue;
      const sidePath = join(gamePath, side);
      if (!statSync(sidePath).isDirectory()) continue;
      for (const slug of readdirSync(sidePath)) {
        if (slug.startsWith(".")) continue;
        const folderPath = join(sidePath, slug);
        if (!statSync(folderPath).isDirectory()) continue;
        out.push({
          folderPath,
          gameVersion: game.toLowerCase(),
          side: side as VideoSideOfBall,
          playbookSlug: slug.toLowerCase(),
        });
      }
    }
  }
  return out.sort((a, b) =>
    `${a.gameVersion}/${a.side}/${a.playbookSlug}`.localeCompare(
      `${b.gameVersion}/${b.side}/${b.playbookSlug}`,
    ),
  );
}

type BatchRow = {
  playbook: string;
  side: string;
  expected: number | null;
  captured: number | null;
  coverage: string;
  missing: number | null;
  unresolved: number | null;
  status: ScreenshotPlaybookStatus | "SKIPPED";
  reason?: string;
  checklistPath?: string | null;
};

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (hasFlag(argv, "--help") || hasFlag(argv, "-h")) {
    console.log(`Usage:
  npm run play-art:screenshot-batch [--force] [--dry-run]

Discovers playbook folders under scripts/play-art/source-screenshots/
and processes each independently. Continues after failures.
Does not publish.
`);
    return;
  }

  const force = hasFlag(argv, "--force");
  const dryRun = hasFlag(argv, "--dry-run");
  const discovered = discoverPlaybookFolders(SOURCE_ROOT);

  console.log("SCREENSHOT BATCH");
  console.log(`Source root: ${SOURCE_ROOT}`);
  console.log(`Playbooks discovered: ${discovered.length}`);
  console.log(`Force: ${force ? "yes" : "no"}`);
  console.log("");

  if (discovered.length === 0) {
    console.log("No playbook folders found. Create e.g.");
    console.log("  scripts/play-art/source-screenshots/cfb27/offense/texas/");
    return;
  }

  const rows: BatchRow[] = [];

  for (const book of discovered) {
    const label = `${book.gameVersion}/${book.side}/${book.playbookSlug}`;
    console.log("─".repeat(64));
    console.log(`Processing ${label}`);

    try {
      const ns = resolveScreenshotNamespace(book.folderPath);
      const imageCount = listScreenshotImages(ns.folderPath).length;

      if (dryRun) {
        console.log(
          `  Dry-run OK — ${ns.playbookDisplayName} (${imageCount} screenshots)`,
        );
        rows.push({
          playbook: ns.playbookDisplayName,
          side: ns.side === "offense" ? "Offense" : "Defense",
          expected: null,
          captured: null,
          coverage: "—",
          missing: null,
          unresolved: null,
          status: "SKIPPED",
          reason: "dry-run",
        });
        continue;
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
        console.log(`  SKIPPED: ${skip.reason}`);
        const prior = existsSync(join(stagingRoot, "report.json"))
          ? (JSON.parse(
              readFileSync(join(stagingRoot, "report.json"), "utf8"),
            ) as ScreenshotPlaybookReport)
          : null;
        rows.push({
          playbook: ns.playbookDisplayName,
          side: ns.side === "offense" ? "Offense" : "Defense",
          expected: prior?.expectedCatalogPlays ?? null,
          captured: prior?.uniqueCanonicalPlays ?? null,
          coverage: prior
            ? `${prior.uniqueCanonicalPlays}/${prior.expectedCatalogPlays}`
            : "—",
          missing: prior?.missingPlays ?? null,
          unresolved: prior
            ? prior.unresolvedFormationOcr + prior.unresolvedPlayOcr
            : null,
          status: "SKIPPED",
          reason: skip.reason,
          checklistPath: prior?.checklistPath,
        });
        continue;
      }

      if (imageCount === 0) {
        console.log("  SKIPPED: empty folder (no screenshots yet)");
        rows.push({
          playbook: ns.playbookDisplayName,
          side: ns.side === "offense" ? "Offense" : "Defense",
          expected: null,
          captured: 0,
          coverage: "—",
          missing: null,
          unresolved: null,
          status: "SKIPPED",
          reason: "Empty folder — drop screenshots to process",
        });
        continue;
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
      rows.push({
        playbook: ns.playbookDisplayName,
        side: ns.side === "offense" ? "Offense" : "Defense",
        expected: report.expectedCatalogPlays,
        captured: report.uniqueCanonicalPlays,
        coverage: `${report.uniqueCanonicalPlays}/${report.expectedCatalogPlays}`,
        missing: report.missingPlays,
        unresolved:
          report.unresolvedFormationOcr + report.unresolvedPlayOcr,
        status: report.status,
        reason: report.failureReason ?? undefined,
        checklistPath: report.checklistPath,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  FAILED: ${message}`);
      rows.push({
        playbook: book.playbookSlug,
        side: book.side === "offense" ? "Offense" : "Defense",
        expected: null,
        captured: null,
        coverage: "—",
        missing: null,
        unresolved: null,
        status: "FAILED",
        reason: message,
      });
    }
  }

  console.log("");
  console.log("═".repeat(72));
  console.log("SCREENSHOT BATCH SUMMARY");
  console.log("═".repeat(72));
  console.log(
    `${"Playbook".padEnd(22)} ${"Side".padEnd(9)} ${"Coverage".padEnd(14)} ${"Missing".padEnd(9)} ${"Status"}`,
  );
  for (const row of rows) {
    console.log(
      `${row.playbook.slice(0, 21).padEnd(22)} ${row.side.padEnd(9)} ${row.coverage.padEnd(14)} ${String(row.missing ?? "—").padEnd(9)} ${row.status}`,
    );
  }
  console.log("");
  const counts = {
    ready: rows.filter((r) => r.status === "READY_TO_PUBLISH").length,
    needs: rows.filter((r) => r.status === "NEEDS_SUPPLEMENTS").length,
    failed: rows.filter((r) => r.status === "FAILED").length,
    skipped: rows.filter((r) => r.status === "SKIPPED").length,
  };
  console.log(
    `Ready: ${counts.ready}  Needs supplements: ${counts.needs}  Failed: ${counts.failed}  Skipped: ${counts.skipped}`,
  );
  console.log("No production assets published.");

  const summaryPath = join(
    PLAY_ART_ROOT,
    "screenshot-staging",
    "_batch-summary.json",
  );
  mkdirSync(dirname(summaryPath), { recursive: true });
  writeFileSync(
    summaryPath,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), rows, counts }, null, 2)}\n`,
    "utf8",
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
