/**
 * Manual screenshot supplements for OBS video gaps (diagnostic only).
 *
 * Reuses shared screenshot screen processing (`process-screenshot-screens.ts`).
 * Merges with video staging for combined coverage — does not publish.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { PlayArtReference } from "../types";
import {
  buildFormationCoverage,
  buildRecaptureQueue,
} from "./formation-coverage";
import { compareToCatalog, rematchCardsToCatalog } from "./ocr-and-catalog";
import {
  cardIdentityKey,
  listScreenshotImages,
  processScreenshotScreens,
  type InvalidScreenshotReason,
} from "./process-screenshot-screens";
import {
  defaultSupplementFolder,
  resolveSupplementNamespace,
  supplementNamespaceToResolved,
  type ResolvedSupplementNamespace,
} from "./resolve-supplement-namespace";
import type {
  ExtractedVideoCard,
  FormationCoverageRow,
  RecaptureQueue,
  VideoPrepareReport,
  VideoSideOfBall,
} from "./types";
import {
  applyDefensiveCrossPlaybookReuse,
  buildDefensiveValidatedArtCorpus,
  computeDefensiveReuseCoverage,
  isDefensiveReuseEligible,
  type DefensiveArtCorpus,
  type DefensiveReuseCoverage,
} from "./defensive-art-reuse";

export type { InvalidScreenshotReason };

export type FormationDeltaRow = {
  formation: string;
  beforeDetected: number;
  beforeExpected: number;
  recovered: number;
  afterDetected: number;
  afterExpected: number;
  stillMissing: string[];
  status: FormationCoverageRow["status"];
};

export type ManualSupplementReport = {
  namespace: {
    gameVersion: string;
    side: VideoSideOfBall;
    playbookSlug: string;
    playbookDisplayName: string;
  };
  folder: string;
  screenshotsFound: number;
  screenshotsAccepted: number;
  screenshotsInvalid: number;
  invalidScreenshots: Array<{
    file: string;
    reason: InvalidScreenshotReason;
    notes?: string;
  }>;
  cardsProcessed: number;
  newMissingPlaysRecovered: number;
  duplicates: number;
  ocrUnresolved: number;
  catalogMismatches: number;
  emptySlots: number;
  invalidScreenCards: number;
  videoOnlyCoverage: {
    detected: number;
    expected: number;
    pct: number;
  };
  combinedCoverage: {
    detected: number;
    expected: number;
    pct: number;
  };
  remainingMissing: number;
  completeFormations: number;
  incompleteFormations: number;
  formationDeltas: FormationDeltaRow[];
  recaptureQueuePath: string;
  supplementReportPath: string;
  cards: ExtractedVideoCard[];
  videoOnlyCards: ExtractedVideoCard[];
  combinedCards: ExtractedVideoCard[];
  videoOnlyFormationCoverage: FormationCoverageRow[];
  combinedFormationCoverage: FormationCoverageRow[];
  recaptureQueue: RecaptureQueue;
  notes: string[];
  reuseCards: ExtractedVideoCard[];
  reuseCoverage: DefensiveReuseCoverage | null;
};

/** @deprecated Prefer listScreenshotImages — kept for callers. */
export const listSupplementScreenshots = listScreenshotImages;

function loadVideoReport(stagingRoot: string): VideoPrepareReport | null {
  const reportPath = join(stagingRoot, "report.json");
  if (!existsSync(reportPath)) return null;
  return JSON.parse(readFileSync(reportPath, "utf8")) as VideoPrepareReport;
}

function annotateVideoCards(cards: ExtractedVideoCard[]): ExtractedVideoCard[] {
  return cards.map((c) => ({
    ...c,
    sourceType: c.sourceType ?? "video",
    sourceFile: c.sourceFile ?? c.videoFile,
  }));
}

/**
 * Process manual screenshots for one playbook namespace and merge with video staging.
 * Diagnostic only — does not publish.
 */
export async function processManualSupplements(input: {
  folderPath: string;
  playArtRoot: string;
  reference: PlayArtReference;
  /** Optional pre-resolved namespace (skips re-resolve). */
  namespace?: ResolvedSupplementNamespace;
  /** Optional pre-built corpus (avoids rebuilding for batch runs). */
  defensiveReuseCorpus?: DefensiveArtCorpus;
}): Promise<ManualSupplementReport> {
  const ns = input.namespace ?? resolveSupplementNamespace(input.folderPath);
  const resolved = supplementNamespaceToResolved(ns);

  const stagingRoot = join(
    input.playArtRoot,
    "video-staging",
    ns.gameVersion,
    ns.side,
    ns.playbookSlug,
  );
  mkdirSync(stagingRoot, { recursive: true });

  const videoReport = loadVideoReport(stagingRoot);
  const videoOnlyCards = rematchCardsToCatalog(
    annotateVideoCards(videoReport?.cards ?? []),
    input.reference,
  );
  const videoCatalog = compareToCatalog(input.reference, videoOnlyCards);
  const videoFormationCoverage = buildFormationCoverage(
    input.reference,
    videoOnlyCards,
  );

  const ownedKeys = new Set<string>();
  for (const card of videoOnlyCards) {
    const key = cardIdentityKey(card);
    if (key) ownedKeys.add(key);
  }

  const screenshots = listScreenshotImages(ns.folderPath);
  const screenStats = await processScreenshotScreens({
    imagePaths: screenshots,
    namespace: {
      gameVersion: ns.gameVersion,
      side: ns.side,
      playbookSlug: ns.playbookSlug,
    },
    reference: input.reference,
    alreadyHave: ownedKeys,
    screensDir: join(stagingRoot, "supplement-screens"),
    sourceCardsDir: join(stagingRoot, "supplement-source-cards"),
    artCropsDir: join(stagingRoot, "supplement-art-crops"),
    sourceType: "manual-supplement",
    stemPrefix: "supp",
  });

  const supplementCards = screenStats.cards;
  const recoveredCards = supplementCards.filter(
    (c) => c.supplementClass === "NEW_MISSING_PLAY" && c.catalogValid,
  );
  const directCombinedCards = [...videoOnlyCards, ...recoveredCards];

  let reuseCards: ExtractedVideoCard[] = [];
  let combinedCards = directCombinedCards;
  let reuseCoverage: DefensiveReuseCoverage | null = null;

  if (isDefensiveReuseEligible(ns.gameVersion, ns.side)) {
    const corpus =
      input.defensiveReuseCorpus ??
      buildDefensiveValidatedArtCorpus(input.playArtRoot);
    const reuseResult = applyDefensiveCrossPlaybookReuse({
      targetPlaybookSlug: ns.playbookSlug,
      targetDisplayName: ns.playbookDisplayName,
      reference: input.reference,
      directCards: directCombinedCards,
      corpus,
    });
    reuseCards = reuseResult.reuseCards;
    combinedCards = reuseResult.combinedCards;
    reuseCoverage = computeDefensiveReuseCoverage({
      reference: input.reference,
      directCards: directCombinedCards,
      combinedCards,
    });
  }

  const combinedCatalog = compareToCatalog(input.reference, combinedCards);
  const combinedFormationCoverage = buildFormationCoverage(
    input.reference,
    combinedCards,
  );
  const recaptureQueue = buildRecaptureQueue({
    playbook: ns.playbookSlug,
    gameVersion: ns.gameVersion,
    side: ns.side,
    formationCoverage: combinedFormationCoverage,
  });

  const videoBeforeByFormation = new Map(
    videoFormationCoverage.map((r) => [r.formation, r] as const),
  );
  const formationDeltas: FormationDeltaRow[] = combinedFormationCoverage.map(
    (after) => {
      const before = videoBeforeByFormation.get(after.formation);
      const beforeDetected = before?.catalogValidUniquePlays ?? 0;
      const recovered = Math.max(0, after.catalogValidUniquePlays - beforeDetected);
      return {
        formation: after.formation,
        beforeDetected,
        beforeExpected: before?.expectedPlays ?? after.expectedPlays,
        recovered,
        afterDetected: after.catalogValidUniquePlays,
        afterExpected: after.expectedPlays,
        stillMissing: after.missingPlays,
        status: after.status,
      };
    },
  );

  const expected = combinedCatalog.expectedPlayCount;
  const videoDetected = videoCatalog.detectedUniquePlays;
  const combinedDetected = combinedCatalog.detectedUniquePlays;
  const completeFormations = combinedFormationCoverage.filter(
    (r) => r.status === "COMPLETE",
  ).length;
  const incompleteFormations = combinedFormationCoverage.filter(
    (r) => r.status !== "COMPLETE",
  ).length;

  const supplementReportPath = join(stagingRoot, "supplement-report.json");
  const recaptureQueuePath = join(stagingRoot, "recapture-queue.json");

  if (videoReport && !existsSync(join(stagingRoot, "recapture-queue.video-only.json"))) {
    const videoOnlyQueue = join(stagingRoot, "recapture-queue.video-only.json");
    if (existsSync(recaptureQueuePath)) {
      copyFileSync(recaptureQueuePath, videoOnlyQueue);
    } else if (videoReport.recaptureQueue) {
      writeFileSync(
        videoOnlyQueue,
        `${JSON.stringify(videoReport.recaptureQueue, null, 2)}\n`,
        "utf8",
      );
    }
  }

  const report: ManualSupplementReport = {
    namespace: {
      gameVersion: ns.gameVersion,
      side: ns.side,
      playbookSlug: ns.playbookSlug,
      playbookDisplayName: ns.playbookDisplayName,
    },
    folder: ns.folderPath,
    screenshotsFound: screenStats.screenshotsFound,
    screenshotsAccepted: screenStats.screenshotsAccepted,
    screenshotsInvalid: screenStats.screenshotsInvalid,
    invalidScreenshots: screenStats.invalidScreenshots,
    cardsProcessed: screenStats.cardsProcessed,
    newMissingPlaysRecovered: screenStats.newIdentities,
    duplicates: screenStats.duplicates,
    ocrUnresolved: screenStats.ocrUnresolved,
    catalogMismatches: screenStats.catalogMismatches,
    emptySlots: screenStats.emptySlots,
    invalidScreenCards: screenStats.invalidScreenCards,
    videoOnlyCoverage: {
      detected: videoDetected,
      expected,
      pct: expected > 0 ? (videoDetected / expected) * 100 : 0,
    },
    combinedCoverage: {
      detected: combinedDetected,
      expected,
      pct: expected > 0 ? (combinedDetected / expected) * 100 : 0,
    },
    remainingMissing: combinedCatalog.missingCatalogPlays.length,
    completeFormations,
    incompleteFormations,
    formationDeltas,
    recaptureQueuePath,
    supplementReportPath,
    cards: supplementCards,
    videoOnlyCards,
    combinedCards,
    videoOnlyFormationCoverage: videoFormationCoverage,
    combinedFormationCoverage,
    recaptureQueue,
    notes: [
      "Manual supplements are diagnostic only — nothing published.",
      "cardPosition / sourceFile are provenance only — not play identity.",
      "Combined coverage = video catalog-valid identities ∪ NEW_MISSING_PLAY supplements ∪ exact cross-playbook reuse.",
      "Duplicates never overwrite or weaken existing validated results.",
      `Crop profile: ${screenStats.cropProfileId}`,
      ...(reuseCoverage
        ? [
            `Exact cross-playbook reuse: ${reuseCoverage.exactReused} identities (${reuseCoverage.directCaptured} direct + ${reuseCoverage.exactReused} reused = ${reuseCoverage.totalCoverage} total).`,
          ]
        : []),
    ],
    reuseCards,
    reuseCoverage,
  };

  writeFileSync(supplementReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(
    recaptureQueuePath,
    `${JSON.stringify(recaptureQueue, null, 2)}\n`,
    "utf8",
  );

  writeFileSync(
    join(stagingRoot, "combined-coverage.json"),
    `${JSON.stringify(
      {
        videoOnly: report.videoOnlyCoverage,
        combined: report.combinedCoverage,
        remainingMissing: report.remainingMissing,
        newMissingPlaysRecovered: report.newMissingPlaysRecovered,
        formationDeltas: report.formationDeltas,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  void resolved;
  return report;
}

export function printManualSupplementReport(report: ManualSupplementReport): void {
  const ns = report.namespace;
  console.log("");
  console.log("═".repeat(64));
  console.log("MANUAL SUPPLEMENT REPORT");
  console.log("═".repeat(64));
  console.log("");
  console.log("Namespace:");
  console.log(
    `${ns.gameVersion.toUpperCase()} / ${ns.side === "offense" ? "Offense" : "Defense"} / ${ns.playbookDisplayName}`,
  );
  console.log("Folder:");
  console.log(report.folder);
  console.log(`Screenshots found: ${report.screenshotsFound}`);
  console.log(`Screenshots accepted: ${report.screenshotsAccepted}`);
  console.log(`Screenshots invalid: ${report.screenshotsInvalid}`);
  if (report.invalidScreenshots.length > 0) {
    for (const inv of report.invalidScreenshots) {
      console.log(`  - ${inv.file}: ${inv.reason}${inv.notes ? ` (${inv.notes})` : ""}`);
    }
  }
  console.log(`Cards processed: ${report.cardsProcessed}`);
  console.log(`New missing plays recovered: ${report.newMissingPlaysRecovered}`);
  console.log(`Duplicates: ${report.duplicates}`);
  console.log(`OCR unresolved: ${report.ocrUnresolved}`);
  console.log(`Catalog mismatches: ${report.catalogMismatches}`);
  console.log("");
  console.log("VIDEO ONLY");
  console.log(
    `${report.videoOnlyCoverage.detected} / ${report.videoOnlyCoverage.expected}`,
  );
  console.log(`${report.videoOnlyCoverage.pct.toFixed(1)}%`);
  console.log("MANUAL SUPPLEMENTS");
  console.log(`Screenshots: ${report.screenshotsFound}`);
  console.log(`Cards processed: ${report.cardsProcessed}`);
  console.log(`New missing plays recovered: ${report.newMissingPlaysRecovered}`);
  console.log(`Duplicates: ${report.duplicates}`);
  console.log(`Unresolved: ${report.ocrUnresolved}`);
  console.log("COMBINED");
  console.log(
    `${report.combinedCoverage.detected} / ${report.combinedCoverage.expected}`,
  );
  console.log(`${report.combinedCoverage.pct.toFixed(1)}%`);
  console.log(`REMAINING MISSING: ${report.remainingMissing}`);
  console.log("");

  const deltasToShow = report.formationDeltas.filter((d) => d.recovered > 0);
  if (deltasToShow.length > 0) {
    console.log("FORMATION-LEVEL DELTA");
    for (const d of deltasToShow) {
      console.log(d.formation);
      console.log(`  Before: ${d.beforeDetected} / ${d.beforeExpected}`);
      console.log(`  After: ${d.afterDetected} / ${d.afterExpected}`);
      console.log(`  Recovered: ${d.recovered}`);
      console.log("");
    }
  }

  console.log(`Updated recapture queue: ${report.recaptureQueuePath}`);
  console.log(`Supplement report: ${report.supplementReportPath}`);
}

export { defaultSupplementFolder, resolveSupplementNamespace };
