/**
 * Global offensive source recovery pass + coverage rebuild.
 *
 *   npm run play-art:offense-global-recovery
 *
 * Does NOT publish. Does NOT modify production assets/manifests.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePlayName } from "../../../lib/utils";
import { importSeedModule, referenceFromSeed } from "../build-reference";
import {
  applyOffensiveCrossPlaybookReuse,
  applyRecoveredExistingSource,
  buildOffensiveValidatedArtCorpus,
  buildRecaptureArtifacts,
  computeOffensiveReuseCoverage,
  globalRecoveredRegistryPath,
  loadDirectValidatedCards,
  listOffensivePlaybookSlugs,
  offensiveReusableArtKey,
  type OffensiveArtCorpus,
} from "./offensive-art-reuse";
import { buildGlobalOffensiveFormationCatalog } from "./offensive-global-formation-catalog";
import { buildGlobalOffensiveSourceIndex, discoverUnprocessedOffensiveSourceScreenshots } from "./offensive-global-source-index";
import {
  runGlobalOffensiveRecovery,
  type IdentityRecoveryResult,
} from "./offensive-source-recovery";
import type { ManualSupplementReport } from "./process-supplements";
import type { ExtractedVideoCard, VideoPrepareReport } from "./types";
import { compareToCatalog, rematchCardsToCatalog } from "./ocr-and-catalog";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLAY_ART_ROOT = join(__dirname, "..");
const SIDELINE_ROOT = join(PLAY_ART_ROOT, "..", "..");
const VIDEO_STAGING = join(PLAY_ART_ROOT, "video-staging", "cfb27", "offense");

const DISPLAY: Record<string, string> = {
  "san-diego-state": "San Diego State",
  tcu: "TCU",
  texas: "Texas",
  toledo: "Toledo",
  unlv: "UNLV",
  utsa: "UTSA",
  "wake-forest": "Wake Forest",
  "western-michigan": "Western Michigan",
};

type QueueItem = {
  playbookSlug: string;
  formation: string;
  play: string;
};

async function collectMissingQueueItems(): Promise<QueueItem[]> {
  const items: QueueItem[] = [];
  for (const slug of listOffensivePlaybookSlugs(PLAY_ART_ROOT)) {
    const stagingRoot = join(VIDEO_STAGING, slug);
    const seed = await importSeedModule(resolveSeedSlug(slug));
    const reference = referenceFromSeed(seed);
    const directCards = rematchCardsToCatalog(
      loadDirectValidatedCards(stagingRoot),
      reference,
    );
    const catalog = compareToCatalog(reference, directCards);
    for (const miss of catalog.missingCatalogPlays) {
      items.push({
        playbookSlug: slug,
        formation: miss.formation,
        play: miss.play,
      });
    }
  }
  return items.sort((a, b) =>
    `${a.playbookSlug}|${a.formation}|${a.play}`.localeCompare(
      `${b.playbookSlug}|${b.formation}|${b.play}`,
    ),
  );
}

type BookResult = {
  playbook: string;
  playbookSlug: string;
  expected: number;
  directCaptured: number;
  recoveredExistingSource: number;
  exactReused: number;
  totalCoverage: number;
  missing: number;
  coveragePct: number;
};

type FinalResult =
  | "RESOLVED_FROM_EXISTING_LOCAL_SOURCE"
  | "RESOLVED_FROM_CROSS_PLAYBOOK_REUSE"
  | "RESOLVED_THROUGH_OCR_CATALOG"
  | "SOURCE_FOUND_RESOLUTION_REQUIRED"
  | "GENUINELY_NOT_CAPTURED"
  | "INVALID_EXISTING_SOURCE"
  | "AMBIGUOUS_SOURCE";

function mapFinalResult(classification: IdentityRecoveryResult["classification"]): FinalResult {
  switch (classification) {
    case "RECOVERED_EXISTING_SOURCE":
      return "RESOLVED_FROM_EXISTING_LOCAL_SOURCE";
    case "EXACT_VALIDATED_REUSE":
      return "RESOLVED_FROM_CROSS_PLAYBOOK_REUSE";
    case "SOURCE_FOUND_RESOLUTION_REQUIRED":
      return "SOURCE_FOUND_RESOLUTION_REQUIRED";
    case "GENUINELY_NOT_CAPTURED":
      return "GENUINELY_NOT_CAPTURED";
    case "INVALID_EXISTING_CAPTURE":
      return "INVALID_EXISTING_SOURCE";
    case "AMBIGUOUS_SOURCE":
      return "AMBIGUOUS_SOURCE";
    case "SOURCE_DISCOVERY_DEFECT":
      return "SOURCE_FOUND_RESOLUTION_REQUIRED";
    case "CATALOG_DATA_ERROR":
      return "SOURCE_FOUND_RESOLUTION_REQUIRED";
    default:
      return "GENUINELY_NOT_CAPTURED";
  }
}

function loadSupplementReport(stagingRoot: string): ManualSupplementReport | null {
  const path = join(stagingRoot, "supplement-report.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as ManualSupplementReport;
}

function loadVideoReport(stagingRoot: string): VideoPrepareReport | null {
  const path = join(stagingRoot, "report.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as VideoPrepareReport;
}

function resolveSeedSlug(playbookSlug: string): string {
  const report = loadVideoReport(join(VIDEO_STAGING, playbookSlug));
  return report?.seedSlug ?? playbookSlug;
}

function structuralOkFromCards(cards: ExtractedVideoCard[]): boolean {
  for (const card of cards) {
    if (!card.catalogValid || card.emptySlot || card.screenRejected) continue;
    if (!card.artCropPath || !existsSync(card.artCropPath)) return false;
  }
  return true;
}

async function reapplyBook(input: {
  playbookSlug: string;
  corpus: OffensiveArtCorpus;
  globalRecovered: ExtractedVideoCard[];
}): Promise<BookResult> {
  const stagingRoot = join(VIDEO_STAGING, input.playbookSlug);
  const prior = loadSupplementReport(stagingRoot);
  const videoReport = loadVideoReport(stagingRoot);
  const seed = await importSeedModule(resolveSeedSlug(input.playbookSlug));
  const reference = referenceFromSeed(seed);
  const displayName =
    prior?.namespace.playbookDisplayName ?? videoReport?.playbook ?? input.playbookSlug;

  const directCards = rematchCardsToCatalog(
    loadDirectValidatedCards(stagingRoot),
    reference,
  );
  const recoveredResult = applyRecoveredExistingSource({
    targetPlaybookSlug: input.playbookSlug,
    reference,
    directCards,
    globalRecovered: input.globalRecovered,
  });
  const reuseResult = applyOffensiveCrossPlaybookReuse({
    targetPlaybookSlug: input.playbookSlug,
    targetDisplayName: displayName,
    reference,
    directCards: recoveredResult.combinedCards,
    corpus: input.corpus,
  });
  const combinedCards = reuseResult.combinedCards;
  const coverage = computeOffensiveReuseCoverage({
    reference,
    directCards,
    combinedCards,
  });
  const { combinedFormationCoverage, recaptureQueue } = buildRecaptureArtifacts({
    playbookSlug: input.playbookSlug,
    gameVersion: "cfb27",
    side: "offense",
    reference,
    combinedCards,
  });

  const enriched: ManualSupplementReport & Record<string, unknown> = {
    ...(prior ?? {
      namespace: {
        gameVersion: "cfb27",
        side: "offense",
        playbookSlug: input.playbookSlug,
        playbookDisplayName: displayName,
      },
      folder: "",
      screenshotsFound: 0,
      screenshotsAccepted: 0,
      screenshotsInvalid: 0,
      invalidScreenshots: [],
      cardsProcessed: 0,
      newMissingPlaysRecovered: 0,
      duplicates: 0,
      ocrUnresolved: 0,
      catalogMismatches: 0,
      emptySlots: 0,
      invalidScreenCards: 0,
      videoOnlyCoverage: {
        detected: coverage.directCaptured,
        expected: coverage.expected,
        pct: coverage.expected ? (coverage.directCaptured / coverage.expected) * 100 : 0,
      },
      formationDeltas: [],
      recaptureQueuePath: join(stagingRoot, "recapture-queue.json"),
      supplementReportPath: join(stagingRoot, "supplement-report.json"),
      cards: [],
      videoOnlyCards: videoReport?.cards ?? [],
      videoOnlyFormationCoverage: [],
      notes: [],
    }),
    combinedCoverage: {
      detected: coverage.totalCoverage,
      expected: coverage.expected,
      pct: coverage.coveragePct,
    },
    remainingMissing: coverage.missing,
    completeFormations: combinedFormationCoverage.filter((r) => r.status === "COMPLETE")
      .length,
    incompleteFormations: combinedFormationCoverage.filter((r) => r.status !== "COMPLETE")
      .length,
    combinedFormationCoverage,
    combinedCards,
    recoveredCards: recoveredResult.recoveredCards,
    reuseCards: reuseResult.reuseCards,
    reuseCoverage: coverage,
    recaptureQueue,
    notes: [
      ...(prior?.notes ?? []),
      `Global recovery: ${recoveredResult.mappingsSatisfied} recovered + ${reuseResult.mappingsSatisfied} reused = ${coverage.totalCoverage}/${coverage.expected}.`,
    ],
  };

  writeFileSync(
    join(stagingRoot, "recapture-queue.json"),
    `${JSON.stringify(recaptureQueue, null, 2)}\n`,
    "utf8",
  );

  writeFileSync(
    join(stagingRoot, "supplement-report.json"),
    `${JSON.stringify(enriched, null, 2)}\n`,
    "utf8",
  );

  return {
    playbook: displayName,
    playbookSlug: input.playbookSlug,
    expected: coverage.expected,
    directCaptured: coverage.directCaptured,
    recoveredExistingSource: coverage.recoveredExistingSource,
    exactReused: coverage.exactReused,
    totalCoverage: coverage.totalCoverage,
    missing: coverage.missing,
    coveragePct: coverage.coveragePct,
  };
}

function formatCandidate(result: IdentityRecoveryResult): string {
  const c = result.winningCandidate;
  if (c) {
    return [
      c.indexed.sourcePlaybookDisplayName,
      c.indexed.sourceFile,
      `play OCR: ${c.playNameOcr ?? c.playNameOcrRaw ?? ""}`,
      relative(SIDELINE_ROOT, c.indexed.artCropPath),
    ].join(" | ");
  }
  if (result.notes[0]) return result.notes[0]!;
  return "_none_";
}

function findRecoveryResult(
  results: IdentityRecoveryResult[],
  item: QueueItem,
  index: number,
): IdentityRecoveryResult | undefined {
  const byIndex = results[index];
  if (
    byIndex &&
    byIndex.target.formation === item.formation &&
    byIndex.target.play === item.play
  ) {
    return byIndex;
  }
  return results.find(
    (r) =>
      r.target.formation === item.formation &&
      r.target.play === item.play &&
      normalizePlayName(r.target.play) === normalizePlayName(item.play),
  );
}

function writeOperatorQueues(input: {
  recoveryResults: IdentityRecoveryResult[];
  queueItems: QueueItem[];
}): { captureCount: number; processingCount: number } {
  const now = new Date().toISOString().slice(0, 16).replace("T", " ");
  const captureItems: Array<{ playbook: string; formation: string; play: string; reason: string }> =
    [];
  const processingItems: Array<{
    playbook: string;
    formation: string;
    play: string;
    reason: string;
    notes: string;
  }> = [];

  for (const [i, item] of input.queueItems.entries()) {
    const result = findRecoveryResult(input.recoveryResults, item, i);
    const classification = result?.classification ?? "GENUINELY_NOT_CAPTURED";
    const playbook = DISPLAY[item.playbookSlug] ?? item.playbookSlug;
    const finalResult = mapFinalResult(classification);

    if (
      finalResult === "GENUINELY_NOT_CAPTURED" ||
      finalResult === "INVALID_EXISTING_SOURCE"
    ) {
      captureItems.push({
        playbook,
        formation: item.formation,
        play: item.play,
        reason: finalResult,
      });
    } else if (
      finalResult === "SOURCE_FOUND_RESOLUTION_REQUIRED" ||
      result?.classification === "SOURCE_DISCOVERY_DEFECT" ||
      result?.classification === "CATALOG_DATA_ERROR"
    ) {
      processingItems.push({
        playbook,
        formation: item.formation,
        play: item.play,
        reason:
          result?.classification === "SOURCE_DISCOVERY_DEFECT"
            ? "SOURCE_DISCOVERY_DEFECT"
            : result?.classification === "CATALOG_DATA_ERROR"
              ? "CATALOG_DATA_ERROR"
              : "OCR_UNRESOLVED",
        notes: result?.notes.join(" ") ?? "",
      });
    } else if (finalResult === "AMBIGUOUS_SOURCE") {
      processingItems.push({
        playbook,
        formation: item.formation,
        play: item.play,
        reason: "AMBIGUOUS_SOURCE",
        notes: result?.notes.join(" ") ?? "",
      });
    }
  }

  const captureMd = [
    "# Offensive Capture Required",
    "",
    `Generated: ${now}`,
    "",
    "Only genuinely absent or unusable captures after global offensive corpus search.",
    "",
    captureItems.length === 0
      ? "**NO ADDITIONAL OFFENSIVE CAPTURES REQUIRED**"
      : `**Total capture items: ${captureItems.length}**`,
    "",
  ];
  if (captureItems.length > 0) {
    captureMd.push("| Playbook | Formation | Play | Reason |", "|---|---|---|---|");
    for (const ex of captureItems) {
      captureMd.push(`| ${ex.playbook} | ${ex.formation} | ${ex.play} | ${ex.reason} |`);
    }
    captureMd.push("", "## Checklist", "");
    for (const ex of captureItems) {
      captureMd.push(
        `- [ ] **${ex.playbook}** — ${ex.formation} — \`${ex.play}\` (${ex.reason})`,
      );
    }
  }
  writeFileSync(join(VIDEO_STAGING, "CAPTURE_REQUIRED.md"), `${captureMd.join("\n").trimEnd()}\n`);

  const procMd = [
    "# Offensive Processing Resolution Required",
    "",
    `Generated: ${now}`,
    "",
    "Existing-source items requiring OCR/catalog processing resolution.",
    "",
    `**Total processing items: ${processingItems.length}**`,
    "",
  ];
  for (const ex of processingItems) {
    procMd.push(
      `## ${ex.playbook} — ${ex.formation} — \`${ex.play}\``,
      "",
      `**Reason:** ${ex.reason}`,
      `**Notes:** ${ex.notes || "(none)"}`,
      "",
    );
  }
  writeFileSync(
    join(VIDEO_STAGING, "PROCESSING_RESOLUTION_REQUIRED.md"),
    `${procMd.join("\n").trimEnd()}\n`,
  );

  return { captureCount: captureItems.length, processingCount: processingItems.length };
}

function writeRecoveryReport(input: {
  recoveryResults: IdentityRecoveryResult[];
  books: BookResult[];
  queueItems: QueueItem[];
  unprocessedCount: number;
}): void {
  const summary = {
    startingUnresolved: input.queueItems.length,
    resolvedLocal: input.recoveryResults.filter(
      (r) => r.classification === "RECOVERED_EXISTING_SOURCE",
    ).length,
    resolvedCrossPlaybookReuse: input.recoveryResults.filter(
      (r) => r.classification === "EXACT_VALIDATED_REUSE",
    ).length,
    recoveredViaOcrCatalog: 0,
    genuinelyNotCaptured: input.recoveryResults.filter(
      (r) => r.classification === "GENUINELY_NOT_CAPTURED",
    ).length,
    invalidCapture: input.recoveryResults.filter(
      (r) => r.classification === "INVALID_EXISTING_CAPTURE",
    ).length,
    sourceDiscoveryDefect: input.recoveryResults.filter(
      (r) => r.classification === "SOURCE_DISCOVERY_DEFECT",
    ).length,
    catalogDataError: input.recoveryResults.filter(
      (r) => r.classification === "CATALOG_DATA_ERROR",
    ).length,
    stillProcessingUnresolved: input.recoveryResults.filter(
      (r) =>
        r.classification === "SOURCE_FOUND_RESOLUTION_REQUIRED" ||
        r.classification === "AMBIGUOUS_SOURCE",
    ).length,
    unprocessedSourceScreenshots: input.unprocessedCount,
  };

  const lines: string[] = [];
  lines.push("# Offensive Global Source Recovery");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`Starting unresolved: **${summary.startingUnresolved}**`);
  lines.push(`Resolved local: **${summary.resolvedLocal}**`);
  lines.push(`Resolved cross-playbook reuse: **${summary.resolvedCrossPlaybookReuse}**`);
  lines.push(`Recovered via OCR/catalog: **${summary.recoveredViaOcrCatalog}**`);
  lines.push(`Genuinely not captured: **${summary.genuinelyNotCaptured}**`);
  lines.push(`Invalid capture: **${summary.invalidCapture}**`);
  lines.push(`Source discovery defect: **${summary.sourceDiscoveryDefect}**`);
  lines.push(`Catalog data error: **${summary.catalogDataError}**`);
  lines.push(`Unprocessed source-screenshots: **${summary.unprocessedSourceScreenshots}**`);
  lines.push(`Still processing unresolved: **${summary.stillProcessingUnresolved}**`);
  lines.push("");
  lines.push("## Results");
  lines.push("");
  lines.push(
    "| Playbook | Formation | Play | Previous Evidence | Global Source Found | Result | Source |",
  );
  lines.push("|---|---|---|---|---|---|---|");

  for (const [i, item] of input.queueItems.entries()) {
    const result = findRecoveryResult(input.recoveryResults, item, i)!;
    const playbook = DISPLAY[item.playbookSlug] ?? item.playbookSlug;
    const globalFound =
      result.classification === "GENUINELY_NOT_CAPTURED" ||
      result.classification === "INVALID_EXISTING_CAPTURE"
        ? "no"
        : "yes";
    lines.push(
      `| ${playbook} | ${item.formation} | ${item.play} | missing from direct capture | ${globalFound} | ${mapFinalResult(result.classification)} | ${formatCandidate(result)} |`,
    );
  }

  lines.push("");
  lines.push("## Coverage After Recovery");
  lines.push("");
  lines.push(
    "| Playbook | Expected | Direct | Recovered | Reused | Total | Missing |",
  );
  lines.push("|---|---:|---:|---:|---:|---:|---:|");
  for (const book of [...input.books].sort((a, b) => a.playbook.localeCompare(b.playbook))) {
    if (book.missing > 0 || input.queueItems.some((q) => q.playbookSlug === book.playbookSlug)) {
      lines.push(
        `| ${book.playbook} | ${book.expected} | ${book.directCaptured} | ${book.recoveredExistingSource} | ${book.exactReused} | ${book.totalCoverage} | ${book.missing} |`,
      );
    }
  }

  writeFileSync(
    join(VIDEO_STAGING, "OFFENSIVE_GLOBAL_SOURCE_RECOVERY.md"),
    `${lines.join("\n").trimEnd()}\n`,
  );
}

async function main(): Promise<void> {
  console.log("OFFENSIVE GLOBAL SOURCE RECOVERY");
  console.log(`Staging: ${VIDEO_STAGING}`);
  console.log("");

  const sourceIndex = buildGlobalOffensiveSourceIndex(PLAY_ART_ROOT);
  const unprocessed = discoverUnprocessedOffensiveSourceScreenshots(PLAY_ART_ROOT, sourceIndex);
  console.log(`Global source index: ${sourceIndex.length} cards`);
  console.log(`Unprocessed source-screenshots: ${unprocessed.length}`);

  const queueItems = await collectMissingQueueItems();
  console.log(`Missing identities (direct capture): ${queueItems.length}`);
  console.log("");

  const formationCatalog = await buildGlobalOffensiveFormationCatalog(PLAY_ART_ROOT);
  const preCorpus = buildOffensiveValidatedArtCorpus(PLAY_ART_ROOT);
  const recoveryPass = await runGlobalOffensiveRecovery({
    queueItems,
    formationCatalog,
    sourceIndex,
    corpus: preCorpus,
    unprocessedSourceScreenshots: unprocessed,
  });

  writeFileSync(
    globalRecoveredRegistryPath(PLAY_ART_ROOT),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        recoveredCount: recoveryPass.recoveredCards.length,
        recovered: recoveryPass.recoveredCards,
        identityResults: recoveryPass.identityResults.map((r) => ({
          formation: r.target.formation,
          play: r.target.play,
          classification: r.classification,
          sourceCandidates: r.sourceCandidates,
          notes: r.notes,
        })),
        summary: recoveryPass.summary,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`Recovered canonical identities: ${recoveryPass.recoveredCards.length}`);
  console.log(JSON.stringify(recoveryPass.summary, null, 2));

  const corpus = buildOffensiveValidatedArtCorpus(PLAY_ART_ROOT);
  const books: BookResult[] = [];
  for (const slug of listOffensivePlaybookSlugs(PLAY_ART_ROOT)) {
    console.log(`Rebuilding: ${slug}`);
    books.push(
      await reapplyBook({
        playbookSlug: slug,
        corpus,
        globalRecovered: recoveryPass.recoveredCards,
      }),
    );
  }

  writeRecoveryReport({
    recoveryResults: recoveryPass.identityResults,
    books,
    queueItems,
    unprocessedCount: unprocessed.length,
  });
  const queues = writeOperatorQueues({
    recoveryResults: recoveryPass.identityResults,
    queueItems,
  });

  console.log("");
  console.log(`CAPTURE_REQUIRED: ${queues.captureCount}`);
  console.log(`PROCESSING_RESOLUTION_REQUIRED: ${queues.processingCount}`);
  console.log(`Report: ${join(VIDEO_STAGING, "OFFENSIVE_GLOBAL_SOURCE_RECOVERY.md")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
