/**
 * First-class screenshot playbook processing (game-capture source of truth).
 *
 * Directory namespace + formation OCR + play OCR + exact catalog resolution.
 * Does NOT publish / review-tool / external visual matching.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PlayArtReference } from "../types";
import {
  buildFormationCoverage,
  buildRecaptureQueue,
} from "./formation-coverage";
import { compareToCatalog } from "./ocr-and-catalog";
import {
  fingerprintScreenshotFolder,
  fingerprintsEqual,
  listScreenshotImages,
  processScreenshotScreens,
  type ScreenshotSourceFingerprintEntry,
} from "./process-screenshot-screens";
import {
  resolveScreenshotNamespace,
  screenshotStagingRoot,
  type ResolvedScreenshotNamespace,
} from "./resolve-screenshot-namespace";
import type {
  ExtractedVideoCard,
  FormationCoverageRow,
  RecaptureQueue,
  VideoSideOfBall,
} from "./types";

export type ScreenshotPlaybookStatus =
  | "READY_TO_PUBLISH"
  | "NEEDS_SUPPLEMENTS"
  | "FAILED";

export type ScreenshotPlaybookReport = {
  status: ScreenshotPlaybookStatus;
  failureReason: string | null;
  namespace: {
    gameVersion: string;
    side: VideoSideOfBall;
    playbookSlug: string;
    playbookDisplayName: string;
    seedSlug: string;
  };
  folder: string;
  stagingRoot: string;
  sourceFingerprint: ScreenshotSourceFingerprintEntry[];
  screenshotsFound: number;
  screenshotsAccepted: number;
  screenshotsInvalid: number;
  cardsExtracted: number;
  expectedCatalogPlays: number;
  uniqueCanonicalPlays: number;
  coveragePct: number;
  missingPlays: number;
  duplicateCardsCollapsed: number;
  unresolvedFormationOcr: number;
  unresolvedPlayOcr: number;
  catalogMismatches: number;
  invalidCards: number;
  emptySlots: number;
  invalidCropGeometry: number;
  missingArtCrops: number;
  formationsExpected: number;
  formationsRepresented: number;
  completeFormations: number;
  incompleteFormations: number;
  structuralValidation: "PASS" | "FAIL";
  formationCoverage: FormationCoverageRow[];
  recaptureQueue: RecaptureQueue;
  cards: ExtractedVideoCard[];
  uniqueCards: ExtractedVideoCard[];
  checklistPath: string | null;
  reportPath: string;
  coveragePath: string;
  recaptureQueuePath: string;
  notes: string[];
};

function writeChecklist(input: {
  displayName: string;
  detected: number;
  expected: number;
  formationCoverage: FormationCoverageRow[];
  outPath: string;
}): void {
  const incomplete = input.formationCoverage
    .filter((r) => r.missingPlays.length > 0)
    .sort(
      (a, b) =>
        b.missingPlays.length - a.missingPlays.length ||
        a.formation.localeCompare(b.formation),
    );
  const missing = incomplete.reduce((n, r) => n + r.missingPlays.length, 0);
  const lines: string[] = [];
  lines.push(`# ${input.displayName} — Screenshot Capture Queue`);
  lines.push("");
  lines.push(`Coverage: ${input.detected} / ${input.expected}`);
  lines.push(`Missing: ${missing}`);
  lines.push("");
  if (incomplete.length === 0) {
    lines.push("_No missing plays._");
    lines.push("");
  } else {
    for (const row of incomplete) {
      lines.push(`## ${row.formation}`);
      lines.push("");
      lines.push(`Expected: ${row.expectedPlays}`);
      lines.push(`Captured: ${row.catalogValidUniquePlays}`);
      lines.push(`Missing: ${row.missingPlays.length}`);
      lines.push("");
      for (const play of row.missingPlays) {
        lines.push(`- [ ] ${play}`);
      }
      lines.push("");
    }
  }
  writeFileSync(input.outPath, `${lines.join("\n").trimEnd()}\n`, "utf8");
}

function classifyStatus(input: {
  expected: number;
  detected: number;
  unresolvedFormationOcr: number;
  unresolvedPlayOcr: number;
  catalogMismatches: number;
  missingArtCrops: number;
  invalidCropGeometry: number;
  screenshotsFound: number;
  screenshotsAccepted: number;
  structuralOk: boolean;
}): { status: ScreenshotPlaybookStatus; failureReason: string | null } {
  if (input.screenshotsFound === 0) {
    return {
      status: "FAILED",
      failureReason: "No screenshots found in playbook source folder",
    };
  }
  if (input.screenshotsAccepted === 0 && input.screenshotsFound > 0) {
    return {
      status: "FAILED",
      failureReason:
        "No screenshots accepted (unsupported geometry, unreadable, or no play cards)",
    };
  }
  if (!input.structuralOk) {
    return {
      status: "FAILED",
      failureReason: "Structural validation failed (missing art crops or invalid crop geometry)",
    };
  }

  const ready =
    input.expected > 0 &&
    input.detected === input.expected &&
    input.unresolvedFormationOcr === 0 &&
    input.unresolvedPlayOcr === 0 &&
    input.catalogMismatches === 0 &&
    input.missingArtCrops === 0 &&
    input.invalidCropGeometry === 0;

  if (ready) {
    return { status: "READY_TO_PUBLISH", failureReason: null };
  }
  return { status: "NEEDS_SUPPLEMENTS", failureReason: null };
}

export function loadScreenshotReport(
  stagingRoot: string,
): ScreenshotPlaybookReport | null {
  const path = join(stagingRoot, "report.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as ScreenshotPlaybookReport;
}

export function shouldSkipScreenshotPlaybook(input: {
  stagingRoot: string;
  sourceFolder: string;
  force: boolean;
}): { skip: boolean; reason: string } {
  if (input.force) return { skip: false, reason: "" };
  const prior = loadScreenshotReport(input.stagingRoot);
  if (!prior) return { skip: false, reason: "" };
  const fp = fingerprintScreenshotFolder(input.sourceFolder);
  const unchanged = fingerprintsEqual(prior.sourceFingerprint ?? [], fp);
  if (!unchanged) return { skip: false, reason: "" };
  if (prior.status === "READY_TO_PUBLISH") {
    return {
      skip: true,
      reason: "Already READY_TO_PUBLISH with unchanged screenshots (use --force to re-run)",
    };
  }
  if (prior.status === "NEEDS_SUPPLEMENTS" || prior.status === "FAILED") {
    return {
      skip: true,
      reason: `Unchanged sources (${prior.status}); add screenshots or use --force to re-run`,
    };
  }
  return { skip: false, reason: "" };
}

export async function processScreenshotPlaybook(input: {
  folderPath: string;
  playArtRoot: string;
  reference: PlayArtReference;
  namespace?: ResolvedScreenshotNamespace;
}): Promise<ScreenshotPlaybookReport> {
  const ns = input.namespace ?? resolveScreenshotNamespace(input.folderPath);
  if (
    input.reference.gameVersion !== ns.gameVersion ||
    input.reference.sideOfBall !== ns.side
  ) {
    throw new Error(
      `Reference namespace mismatch: seed produced ${input.reference.gameVersion}/${input.reference.sideOfBall} ` +
        `but folder requires ${ns.gameVersion}/${ns.side}`,
    );
  }

  const stagingRoot = screenshotStagingRoot({
    playArtRoot: input.playArtRoot,
    gameVersion: ns.gameVersion,
    side: ns.side,
    playbookSlug: ns.playbookSlug,
  });
  mkdirSync(stagingRoot, { recursive: true });

  const sourceFingerprint = fingerprintScreenshotFolder(ns.folderPath);
  const imagePaths = listScreenshotImages(ns.folderPath);
  const ownedKeys = new Set<string>();

  const screenStats = await processScreenshotScreens({
    imagePaths,
    namespace: {
      gameVersion: ns.gameVersion,
      side: ns.side,
      playbookSlug: ns.playbookSlug,
    },
    reference: input.reference,
    alreadyHave: ownedKeys,
    screensDir: join(stagingRoot, "screens"),
    sourceCardsDir: join(stagingRoot, "source-cards"),
    artCropsDir: join(stagingRoot, "art-crops"),
    sourceType: "screenshot",
    stemPrefix: "ss",
  });

  const uniqueCards = screenStats.cards.filter(
    (c) => c.supplementClass === "NEW_MISSING_PLAY" && c.catalogValid,
  );
  const catalog = compareToCatalog(input.reference, uniqueCards);
  const formationCoverage = buildFormationCoverage(
    input.reference,
    uniqueCards,
  );
  const recaptureQueue = buildRecaptureQueue({
    playbook: ns.playbookSlug,
    gameVersion: ns.gameVersion,
    side: ns.side,
    formationCoverage,
  });

  const completeFormations = formationCoverage.filter(
    (r) => r.status === "COMPLETE",
  ).length;
  const incompleteFormations = formationCoverage.filter(
    (r) => r.status !== "COMPLETE",
  ).length;
  const formationsRepresented = formationCoverage.filter(
    (r) => r.catalogValidUniquePlays > 0,
  ).length;

  const structuralOk =
    screenStats.invalidCropGeometry === 0 &&
    screenStats.missingArtCrops === 0 &&
    uniqueCards.every((c) => existsSync(c.artCropPath));

  const { status, failureReason } = classifyStatus({
    expected: catalog.expectedPlayCount,
    detected: catalog.detectedUniquePlays,
    unresolvedFormationOcr: screenStats.unresolvedFormationOcr,
    unresolvedPlayOcr: screenStats.unresolvedPlayOcr,
    catalogMismatches: screenStats.catalogMismatches,
    missingArtCrops: screenStats.missingArtCrops,
    invalidCropGeometry: screenStats.invalidCropGeometry,
    screenshotsFound: screenStats.screenshotsFound,
    screenshotsAccepted: screenStats.screenshotsAccepted,
    structuralOk,
  });

  const reportPath = join(stagingRoot, "report.json");
  const coveragePath = join(stagingRoot, "coverage.json");
  const recaptureQueuePath = join(stagingRoot, "recapture-queue.json");
  const checklistPath =
    status === "NEEDS_SUPPLEMENTS" || catalog.missingCatalogPlays.length > 0
      ? join(stagingRoot, "RECAPTURE_CHECKLIST.md")
      : null;

  if (checklistPath) {
    writeChecklist({
      displayName: ns.playbookDisplayName,
      detected: catalog.detectedUniquePlays,
      expected: catalog.expectedPlayCount,
      formationCoverage,
      outPath: checklistPath,
    });
  }

  const report: ScreenshotPlaybookReport = {
    status,
    failureReason,
    namespace: {
      gameVersion: ns.gameVersion,
      side: ns.side,
      playbookSlug: ns.playbookSlug,
      playbookDisplayName: ns.playbookDisplayName,
      seedSlug: ns.seedSlug,
    },
    folder: ns.folderPath,
    stagingRoot,
    sourceFingerprint,
    screenshotsFound: screenStats.screenshotsFound,
    screenshotsAccepted: screenStats.screenshotsAccepted,
    screenshotsInvalid: screenStats.screenshotsInvalid,
    cardsExtracted: screenStats.cardsProcessed,
    expectedCatalogPlays: catalog.expectedPlayCount,
    uniqueCanonicalPlays: catalog.detectedUniquePlays,
    coveragePct:
      catalog.expectedPlayCount > 0
        ? (catalog.detectedUniquePlays / catalog.expectedPlayCount) * 100
        : 0,
    missingPlays: catalog.missingCatalogPlays.length,
    duplicateCardsCollapsed: screenStats.duplicates,
    unresolvedFormationOcr: screenStats.unresolvedFormationOcr,
    unresolvedPlayOcr: screenStats.unresolvedPlayOcr,
    catalogMismatches: screenStats.catalogMismatches,
    invalidCards: screenStats.invalidScreenCards,
    emptySlots: screenStats.emptySlots,
    invalidCropGeometry: screenStats.invalidCropGeometry,
    missingArtCrops: screenStats.missingArtCrops,
    formationsExpected: formationCoverage.length,
    formationsRepresented,
    completeFormations,
    incompleteFormations,
    structuralValidation: structuralOk ? "PASS" : "FAIL",
    formationCoverage,
    recaptureQueue,
    cards: screenStats.cards,
    uniqueCards,
    checklistPath,
    reportPath,
    coveragePath,
    recaptureQueuePath,
    notes: [
      "Screenshot source is diagnostic/prep only in this task — nothing published.",
      "Identity = directory namespace + formation OCR + play OCR + exact catalog resolution.",
      "cardPosition / sourceFile are provenance only — not play identity.",
      "No play-art:review / overrides / omits / external visual authority.",
      `Crop profile: ${screenStats.cropProfileId}`,
    ],
  };

  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(
    coveragePath,
    `${JSON.stringify(
      {
        expected: report.expectedCatalogPlays,
        captured: report.uniqueCanonicalPlays,
        coveragePct: report.coveragePct,
        missing: report.missingPlays,
        completeFormations: report.completeFormations,
        incompleteFormations: report.incompleteFormations,
        status: report.status,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  writeFileSync(
    recaptureQueuePath,
    `${JSON.stringify(recaptureQueue, null, 2)}\n`,
    "utf8",
  );

  return report;
}

export function printScreenshotPlaybookReport(
  report: ScreenshotPlaybookReport,
): void {
  const ns = report.namespace;
  console.log("");
  console.log("═".repeat(64));
  console.log("SCREENSHOT PLAYBOOK REPORT");
  console.log("═".repeat(64));
  console.log("");
  console.log(`Status: ${report.status}`);
  if (report.failureReason) console.log(`Failure: ${report.failureReason}`);
  console.log(
    `Namespace: ${ns.gameVersion.toUpperCase()} / ${ns.side === "offense" ? "Offense" : "Defense"} / ${ns.playbookDisplayName}`,
  );
  console.log(`Folder: ${report.folder}`);
  console.log(`Screenshots: ${report.screenshotsAccepted} / ${report.screenshotsFound} accepted`);
  console.log(`Cards extracted: ${report.cardsExtracted}`);
  console.log(
    `Coverage: ${report.uniqueCanonicalPlays} / ${report.expectedCatalogPlays} (${report.coveragePct.toFixed(1)}%)`,
  );
  console.log(`Missing: ${report.missingPlays}`);
  console.log(`Duplicates collapsed: ${report.duplicateCardsCollapsed}`);
  console.log(`Unresolved formation OCR: ${report.unresolvedFormationOcr}`);
  console.log(`Unresolved play OCR: ${report.unresolvedPlayOcr}`);
  console.log(`Catalog mismatches: ${report.catalogMismatches}`);
  console.log(`Invalid cards: ${report.invalidCards}`);
  console.log(`Structural validation: ${report.structuralValidation}`);
  console.log(
    `Formations: ${report.completeFormations} complete / ${report.incompleteFormations} incomplete (of ${report.formationsExpected})`,
  );
  if (report.checklistPath) {
    console.log(`Recapture checklist: ${report.checklistPath}`);
  }
  console.log(`Report: ${report.reportPath}`);
  console.log("");
  console.log("No production assets published.");
}
