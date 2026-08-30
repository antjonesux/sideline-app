/**
 * OBS video → play-art source preparation (diagnostic only).
 *
 * Stage A: broad short-hold candidate recovery (three-card fingerprints)
 * Stage B: strict transition rejection + OCR identity candidates
 *
 * Does NOT publish / modify manifest / overrides / omits / trusted hashes.
 * Does NOT use screen/card/seed order as play identity.
 *
 *   npm run play-art:video -- --source=scripts/play-art/source-video/offense/cfb27-offense-go-go.mp4
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { importSeedModule, referenceFromSeed } from "../build-reference";
import { hashPlayArtBytes } from "../content-hash";
import { resolveCropProfile } from "./crop-profile";
import { detectStableScreens, probeVideo } from "./detect-stable-screens";
import {
  buildFormationCoverage,
  buildMissBreakdown,
  buildRecaptureQueue,
} from "./formation-coverage";
import { compareToCatalog } from "./ocr-and-catalog";
import {
  defaultSupplementFolder,
  listSupplementScreenshots,
  printManualSupplementReport,
  processManualSupplements,
} from "./process-supplements";
import {
  printResolvedVideoSource,
  resolveVideoPlaybook,
} from "./resolve-video-playbook";
import type { VideoPrepareReport } from "./types";
import { validateScreenCandidates } from "./validate-screen-candidates";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLAY_ART_ROOT = join(__dirname, "..");
const SOURCE_VIDEO_ROOT = join(PLAY_ART_ROOT, "source-video");
const VIDEO_STAGING_ROOT = join(PLAY_ART_ROOT, "video-staging");

/** First diagnostic baseline for cfb27-offense-go-go.mp4 (required comparison). */
const GO_GO_BASELINE = {
  stableScreens: 111,
  catalogValidPlays: 311,
  expectedPlays: 405,
  coveragePct: 76.8,
  missing: 94,
};

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
  return fromCwd;
}

function pickRecommendation(report: Omit<VideoPrepareReport, "recommendation">): {
  recommendation: VideoPrepareReport["recommendation"];
  notes: string[];
} {
  const notes = [...report.notes];
  const expected = report.catalog.expectedPlayCount;
  const detected = report.catalog.detectedUniquePlays;
  const coverage = expected > 0 ? detected / expected : 0;
  const formationOk =
    report.catalog.expectedFormations.length > 0 &&
    report.catalog.detectedFormations.length ===
      report.catalog.expectedFormations.length;
  const incomplete = report.incompleteFormations;
  const acceptedTransitions = report.rejectedCandidates.filter(
    (r) => false,
  ).length;
  void acceptedTransitions;

  if (!formationOk) {
    notes.push("Formation coverage incomplete.");
    return { recommendation: "NEEDS EXTRACTION TUNING", notes };
  }
  if (coverage >= 0.98 && incomplete === 0) {
    notes.push(
      "Diagnostic only: do not publish until visual matcher integration is explicitly approved.",
    );
    return { recommendation: "READY FOR PIPELINE INTEGRATION", notes };
  }
  if (report.missBreakdown.notCaptured > report.missBreakdown.capturedButOcrUnresolved) {
    notes.push(
      `Dominant miss mode: not captured (${report.missBreakdown.notCaptured} play slots).`,
    );
    return { recommendation: "NEEDS EXTRACTION TUNING", notes };
  }
  if (report.missBreakdown.capturedButOcrUnresolved > 0 && coverage >= 0.9) {
    notes.push("Coverage high; remaining gaps look OCR-heavy.");
    return { recommendation: "NEEDS OCR TUNING", notes };
  }
  notes.push(
    `Coverage ${(coverage * 100).toFixed(1)}% with ${incomplete} incomplete formation(s).`,
  );
  return { recommendation: "NEEDS EXTRACTION TUNING", notes };
}

function printFinalReport(report: VideoPrepareReport): void {
  console.log("");
  console.log("═".repeat(64));
  console.log("FINAL OPERATOR REPORT");
  console.log("═".repeat(64));
  console.log("");
  console.log("VERDICT");
  console.log(report.recommendation);
  console.log("");

  if (report.beforeAfter) {
    const b = report.beforeAfter;
    console.log("Before vs after");
    console.log(
      `BEFORE  screens=${b.before.stableScreens}  plays=${b.before.catalogValidPlays}/${b.before.expectedPlays}  ` +
        `coverage=${b.before.coveragePct.toFixed(1)}%  missing=${b.before.missing}`,
    );
    console.log(
      `AFTER   screens=${b.after.stableScreens}  plays=${b.after.catalogValidPlays}/${b.after.expectedPlays}  ` +
        `coverage=${b.after.coveragePct.toFixed(1)}%  missing=${b.after.missing}`,
    );
    console.log(
      `DELTA   screens ${b.delta.screensRecovered >= 0 ? "+" : ""}${b.delta.screensRecovered}  ` +
        `plays ${b.delta.playsRecovered >= 0 ? "+" : ""}${b.delta.playsRecovered}  ` +
        `missing ${b.delta.missingReduced <= 0 ? "" : "-"}${Math.abs(b.delta.missingReduced)}`,
    );
    console.log("");
  }

  console.log("Source");
  console.log(`Video: ${report.videoFile}`);
  console.log(`Game: ${report.gameVersion.toUpperCase()}`);
  console.log(`Side: ${report.side === "offense" ? "Offense" : "Defense"}`);
  console.log(`Playbook: ${report.playbook}`);
  console.log(`Seed: ${report.seedSlug}`);
  console.log(`Duration: ${report.durationSec.toFixed(1)}s`);
  console.log(`Frame: ${report.frameWidth}×${report.frameHeight}`);
  console.log(`Crop profile: ${report.cropProfileId}`);
  console.log("");

  console.log("Screen extraction");
  console.log(`Frames sampled: ${report.framesSampled}`);
  console.log(`Candidate screens: ${report.candidateScreens}`);
  console.log(`Accepted play screens: ${report.acceptedPlayScreens}`);
  console.log(`Rejected transition screens: ${report.rejectedTransitionScreens}`);
  console.log(`Short-hold screens recovered: ${report.shortHoldScreensRecovered}`);
  console.log(`Duplicate screens removed: ${report.duplicateScreensRemoved}`);
  console.log("");

  console.log("Card extraction");
  console.log(`Cards extracted: ${report.playCardsExtracted}`);
  console.log(`Valid card candidates: ${report.validCardCandidates}`);
  console.log(`Empty slots: ${report.emptySlots}`);
  console.log(`Duplicate cards: ${report.duplicateCards}`);
  console.log("");

  console.log("Formation coverage");
  console.log(`Expected formations: ${report.catalog.expectedFormations.length}`);
  console.log(`Detected formations: ${report.catalog.detectedFormations.length}`);
  console.log(`Complete formations: ${report.completeFormations}`);
  console.log(`Incomplete formations: ${report.incompleteFormations}`);
  console.log(`Formation coverage: ${report.formationCoveragePct.toFixed(1)}%`);
  console.log("");
  console.log("FORMATION COVERAGE");
  for (const row of report.formationCoverage) {
    console.log(`${row.formation}`);
    console.log(`  Expected plays: ${row.expectedPlays}`);
    console.log(`  Detected unique plays: ${row.catalogValidUniquePlays}`);
    console.log(`  Missing: ${row.missingCatalogPlayCount}`);
    console.log(`  Unexpected: ${row.unexpectedOcrCount}`);
    console.log(`  Status: ${row.status}`);
    if (row.missingPlays.length > 0 && row.missingPlays.length <= 12) {
      console.log(`  Missing plays: ${row.missingPlays.join(", ")}`);
    } else if (row.missingPlays.length > 12) {
      console.log(
        `  Missing plays (${row.missingPlays.length}): ${row.missingPlays.slice(0, 8).join(", ")}…`,
      );
    }
  }
  console.log("");

  console.log("Play coverage");
  console.log(`Expected plays: ${report.catalog.expectedPlayCount}`);
  console.log(`Catalog-valid plays: ${report.catalog.detectedUniquePlays}`);
  console.log(`Unresolved cards: ${report.unresolvedIdentities}`);
  console.log(`Missing catalog plays: ${report.catalog.missingCatalogPlays.length}`);
  console.log(
    `Overall coverage: ${(
      (report.catalog.detectedUniquePlays / Math.max(1, report.catalog.expectedPlayCount)) *
      100
    ).toFixed(1)}%`,
  );
  console.log("");
  console.log("Miss breakdown");
  console.log(`  not captured: ${report.missBreakdown.notCaptured}`);
  console.log(
    `  captured but OCR unresolved: ${report.missBreakdown.capturedButOcrUnresolved}`,
  );
  console.log(`  captured but rejected: ${report.missBreakdown.capturedButRejected}`);
  console.log(`  catalog mismatch: ${report.missBreakdown.catalogMismatch}`);
  console.log("");

  console.log("RE-RECORD REQUIRED");
  if (report.recaptureQueue.formationsToRecapture.length === 0) {
    console.log("(none)");
  } else {
    for (const f of report.recaptureQueue.formationsToRecapture) {
      console.log(
        `${f.formation}  Missing ${f.expected - f.detected} / ${f.expected}  [${f.status}]`,
      );
    }
  }
  console.log("");

  if (report.notes.length) {
    console.log("Notes");
    for (const n of report.notes) console.log(`- ${n}`);
    console.log("");
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (hasFlag(argv, "--help") || hasFlag(argv, "-h")) {
    console.log(`Usage:
  npm run play-art:video -- --source=<path-to-mp4> [--dry-run] [--skip-supplements]

Filename contract:
  {game-version}-{side}-{playbook-slug}.mp4
  Example: cfb27-offense-go-go.mp4

After video diagnostics, auto-discovers matching manual supplements under:
  scripts/play-art/manual-supplements/{game}/{side}/{slug}/
(Use --skip-supplements to leave that pass off. Or run play-art:supplement alone.)

Diagnostic only — does not publish or modify production play-art artifacts.
`);
    return;
  }

  const sourceRaw = readFlag(argv, "--source");
  if (!sourceRaw) {
    throw new Error(
      `Missing --source=<mp4>. Example:\n` +
        `  npm run play-art:video -- --source=${join("scripts/play-art/source-video/offense", "cfb27-offense-go-go.mp4")}`,
    );
  }

  const videoPath = resolveSourcePath(sourceRaw);
  const resolved = resolveVideoPlaybook(videoPath);
  if (!existsSync(videoPath)) {
    throw new Error(
      `VIDEO not found: ${videoPath}\n` +
        `Place recordings under ${SOURCE_VIDEO_ROOT}/offense|defense/`,
    );
  }

  const dryRun = hasFlag(argv, "--dry-run");
  printResolvedVideoSource(resolved);
  console.log("");

  if (dryRun) {
    console.log("Dry-run: metadata validation only. Stopping before frame extraction.");
    return;
  }

  const probe = probeVideo(videoPath);
  const profile = resolveCropProfile(probe.width, probe.height);
  console.log(
    `Video probe: ${probe.width}×${probe.height}, ${probe.durationSec.toFixed(1)}s @ ~${probe.fps.toFixed(1)}fps`,
  );
  console.log(`Crop profile: ${profile.id}`);
  console.log("");

  const seed = await importSeedModule(resolved.seedSlug);
  const reference = referenceFromSeed(seed);
  if (
    reference.gameVersion !== resolved.gameVersion ||
    reference.sideOfBall !== resolved.side
  ) {
    throw new Error(
      `Reference namespace mismatch: seed produced ${reference.gameVersion}/${reference.sideOfBall} ` +
        `but filename requires ${resolved.gameVersion}/${resolved.side}`,
    );
  }

  const outRoot = join(
    VIDEO_STAGING_ROOT,
    resolved.gameVersion,
    resolved.side,
    resolved.playbookSlug,
  );
  const samplesDir = join(outRoot, "samples");
  const framesDir = join(outRoot, "frames");
  const sourceCardsDir = join(outRoot, "source-cards");
  const artCropsDir = join(outRoot, "art-crops");
  const rejectedDir = join(outRoot, "rejected");
  mkdirSync(outRoot, { recursive: true });

  console.log("Stage A — broad candidate recovery…");
  const detected = await detectStableScreens({
    videoPath,
    profile,
    samplesDir,
    framesDir,
  });
  console.log(
    `  samples=${detected.sampleCount} candidates=${detected.candidates.length} ` +
      `shortHold=${detected.shortHoldCandidates} dupRemoved=${detected.duplicateScreensRemoved}`,
  );

  console.log("Stage B — strict validation + OCR…");
  const validated = await validateScreenCandidates({
    candidates: detected.candidates,
    profile,
    reference,
    resolved,
    sourceCardsDir,
    artCropsDir,
    rejectedDir,
  });
  console.log(
    `  accepted=${validated.acceptedScreens.length} rejected=${validated.rejected.length} ` +
      `shortHoldAccepted=${validated.shortHoldAccepted}`,
  );

  const cards = validated.cards.map((c) => ({
    ...c,
    sourceType: c.sourceType ?? ("video" as const),
    sourceFile: c.sourceFile ?? resolved.basename,
  }));
  const catalog = compareToCatalog(reference, cards);
  const formationCoverage = buildFormationCoverage(reference, cards);
  const recaptureQueue = buildRecaptureQueue({
    playbook: resolved.playbookSlug,
    gameVersion: resolved.gameVersion,
    side: resolved.side,
    formationCoverage,
  });
  const missBreakdown = buildMissBreakdown({
    formationCoverage,
    cards,
    rejected: validated.rejected,
  });

  const nonEmpty = cards.filter((c) => !c.emptySlot && !c.screenRejected);
  const ocrFormationMatches = nonEmpty.filter(
    (c) => c.formationMatchConfidence === "exact" || c.formationMatchConfidence === "fuzzy",
  ).length;
  const ocrPlayNameMatches = nonEmpty.filter(
    (c) => c.playMatchConfidence === "exact" || c.playMatchConfidence === "fuzzy",
  ).length;
  const catalogValidIdentities = nonEmpty.filter((c) => c.catalogValid).length;
  const unresolvedIdentities = nonEmpty.filter((c) => !c.catalogValid).length;

  const artHashes = new Map<string, number>();
  for (const card of nonEmpty) {
    const hash = hashPlayArtBytes(readFileSync(card.artCropPath));
    artHashes.set(hash, (artHashes.get(hash) ?? 0) + 1);
  }
  let duplicateCards = 0;
  for (const count of artHashes.values()) {
    if (count > 1) duplicateCards += count - 1;
  }

  const completeFormations = formationCoverage.filter((r) => r.status === "COMPLETE").length;
  const incompleteFormations = formationCoverage.filter((r) => r.status !== "COMPLETE").length;
  const formationCoveragePct =
    formationCoverage.length > 0
      ? (completeFormations / formationCoverage.length) * 100
      : 0;

  const coveragePct =
    (catalog.detectedUniquePlays / Math.max(1, catalog.expectedPlayCount)) * 100;

  let beforeAfter: VideoPrepareReport["beforeAfter"];
  if (resolved.playbookSlug === "go-go" && resolved.gameVersion === "cfb27") {
    beforeAfter = {
      before: GO_GO_BASELINE,
      after: {
        stableScreens: validated.acceptedScreens.length,
        catalogValidPlays: catalog.detectedUniquePlays,
        expectedPlays: catalog.expectedPlayCount,
        coveragePct,
        missing: catalog.missingCatalogPlays.length,
      },
      delta: {
        screensRecovered:
          validated.acceptedScreens.length - GO_GO_BASELINE.stableScreens,
        playsRecovered: catalog.detectedUniquePlays - GO_GO_BASELINE.catalogValidPlays,
        missingReduced: GO_GO_BASELINE.missing - catalog.missingCatalogPlays.length,
      },
    };
  }

  const baseReport = {
    videoFile: resolved.basename,
    videoPath,
    gameVersion: resolved.gameVersion,
    side: resolved.side,
    playbook: resolved.playbookDisplayName,
    playbookSlug: resolved.playbookSlug,
    seedSlug: resolved.seedSlug,
    durationSec: probe.durationSec,
    frameWidth: probe.width,
    frameHeight: probe.height,
    cropProfileId: profile.id,
    framesSampled: detected.sampleCount,
    candidateScreens: detected.candidates.length,
    acceptedPlayScreens: validated.acceptedScreens.length,
    rejectedTransitionScreens: validated.rejected.length,
    shortHoldScreensRecovered: validated.shortHoldAccepted,
    duplicateScreensRemoved: detected.duplicateScreensRemoved,
    playCardsExtracted: cards.length,
    validCardCandidates: nonEmpty.length,
    emptySlots: cards.filter((c) => c.emptySlot).length,
    duplicateCards,
    uniqueFormationsDetected: catalog.detectedFormations.length,
    completeFormations,
    incompleteFormations,
    formationCoveragePct,
    ocrFormationMatches,
    ocrPlayNameMatches,
    catalogValidIdentities,
    unresolvedIdentities,
    catalog,
    formationCoverage,
    recaptureQueue,
    missBreakdown,
    rejectedCandidates: validated.rejected,
    cards,
    beforeAfter,
    notes: [
      "cardPosition is provenance only — not play identity.",
      "Missing catalog plays are for recapture guidance only — never positional identity assignment.",
      "Visual matcher / publish path not invoked.",
    ] as string[],
  };

  const { recommendation, notes } = pickRecommendation(baseReport);
  const report: VideoPrepareReport = {
    ...baseReport,
    recommendation,
    notes,
  };

  const reportPath = join(outRoot, "report.json");
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(
    join(outRoot, "recapture-queue.json"),
    `${JSON.stringify(recaptureQueue, null, 2)}\n`,
    "utf8",
  );
  // Preserve video-only queue before any supplement merge.
  writeFileSync(
    join(outRoot, "recapture-queue.video-only.json"),
    `${JSON.stringify(recaptureQueue, null, 2)}\n`,
    "utf8",
  );
  console.log(`Report: ${reportPath}`);
  console.log(`Recapture queue: ${join(outRoot, "recapture-queue.json")}`);
  printFinalReport(report);

  // Optional auto-discovery of manual supplements (never fails if folder missing).
  if (!hasFlag(argv, "--skip-supplements")) {
    const supplementDir = defaultSupplementFolder({
      gameVersion: resolved.gameVersion,
      side: resolved.side,
      playbookSlug: resolved.playbookSlug,
      playArtRoot: PLAY_ART_ROOT,
    });
    const found = listSupplementScreenshots(supplementDir);
    console.log("");
    console.log(
      `Manual supplements found: ${found.length} screenshot${found.length === 1 ? "" : "s"}`,
    );
    if (found.length > 0) {
      console.log(`Folder: ${supplementDir}`);
      console.log("Processing manual supplements…");
      const supplementReport = await processManualSupplements({
        folderPath: supplementDir,
        playArtRoot: PLAY_ART_ROOT,
        reference,
      });
      printManualSupplementReport(supplementReport);
    } else if (existsSync(supplementDir)) {
      console.log(`Folder exists but empty: ${supplementDir}`);
    } else {
      console.log(
        `(no folder at ${supplementDir} — drop PNG screenshots there to fill gaps)`,
      );
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
