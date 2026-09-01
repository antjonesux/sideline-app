/**
 * Global defensive source recovery pass + coverage rebuild.
 *
 *   npm run play-art:defense-global-recovery
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
  applyDefensiveCrossPlaybookReuse,
  applyRecoveredExistingSource,
  buildDefensiveValidatedArtCorpus,
  buildRecaptureArtifacts,
  computeDefensiveReuseCoverage,
  DEFENSIVE_REUSE_GAME_VERSION,
  DEFENSIVE_REUSE_SIDE,
  defensiveReusableArtKey,
  globalRecoveredRegistryPath,
  loadDirectValidatedCards,
  listDefensivePlaybookSlugs,
  loadGlobalRecoveredCards,
  type DefensiveArtCorpus,
} from "./defensive-art-reuse";
import { buildGlobalDefensiveFormationCatalog } from "./defensive-global-formation-catalog";
import { buildGlobalDefensiveSourceIndex } from "./defensive-global-source-index";
import {
  runGlobalDefensiveRecovery,
  type IdentityRecoveryResult,
  type MissingIdentityTarget,
} from "./defensive-source-recovery";
import {
  diagnoseMissingIssues,
  type BookStatus,
  type IssueReason,
  type MissingIssue,
} from "./defense-screenshot-merge";
import type { ManualSupplementReport } from "./process-supplements";
import type { ExtractedVideoCard, VideoPrepareReport } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLAY_ART_ROOT = join(__dirname, "..");
const SIDELINE_ROOT = join(PLAY_ART_ROOT, "..", "..");
const VIDEO_STAGING = join(
  PLAY_ART_ROOT,
  "video-staging",
  DEFENSIVE_REUSE_GAME_VERSION,
  DEFENSIVE_REUSE_SIDE,
);
const BATCH_LOG_ROOT = join(PLAY_ART_ROOT, "video-staging", "_batch-logs");

type BookResult = {
  playbook: string;
  playbookSlug: string;
  status: BookStatus;
  expected: number;
  directCaptured: number;
  recoveredExistingSource: number;
  exactReused: number;
  totalCoverage: number;
  missing: number;
  coveragePct: number;
};

function emptyBreakdown(): Record<IssueReason, number> {
  return {
    NOT_CAPTURED: 0,
    OCR_UNRESOLVED: 0,
    CATALOG_MISMATCH: 0,
    INVALID_CAPTURE: 0,
    MISSING_ART_CROP: 0,
    DUPLICATE_ONLY: 0,
  };
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

function loadRemainingMissingTargets(): {
  uniqueRemaining: number;
  totalMissingMappings: number;
  targets: MissingIdentityTarget[];
} {
  const targets: MissingIdentityTarget[] = [];
  let totalMissingMappings = 0;

  for (const slug of listDefensivePlaybookSlugs(PLAY_ART_ROOT)) {
    const supplement = loadSupplementReport(join(VIDEO_STAGING, slug)) as
      | (ManualSupplementReport & {
          issues?: Array<{ formation: string; play: string }>;
        })
      | null;
    for (const issue of supplement?.issues ?? []) {
      totalMissingMappings += 1;
      const artKey = defensiveReusableArtKey(issue.formation, issue.play);
      if (!targets.some((t) => t.artKey === artKey)) {
        targets.push({
          formation: issue.formation,
          play: issue.play,
          artKey,
        });
      }
    }
  }

  return {
    uniqueRemaining: targets.length,
    totalMissingMappings,
    targets,
  };
}

function structuralOkFromCards(cards: ExtractedVideoCard[]): boolean {
  for (const card of cards) {
    if (!card.catalogValid || card.emptySlot || card.screenRejected) continue;
    if (!card.artCropPath || !existsSync(card.artCropPath)) return false;
  }
  return true;
}

function classifyStatus(input: {
  expected: number;
  detected: number;
  missing: number;
  issues: MissingIssue[];
  structuralOk: boolean;
}): BookStatus {
  if (!input.structuralOk) return "FAILED";
  if (
    input.expected > 0 &&
    input.detected === input.expected &&
    input.missing === 0 &&
    input.issues.length === 0
  ) {
    return "READY_TO_PUBLISH";
  }
  return "NEEDS_SUPPLEMENTS";
}

async function reapplyBook(input: {
  playbookSlug: string;
  corpus: DefensiveArtCorpus;
  globalRecovered: ExtractedVideoCard[];
}): Promise<BookResult> {
  const stagingRoot = join(VIDEO_STAGING, input.playbookSlug);
  const prior = loadSupplementReport(stagingRoot);
  const videoReport = loadVideoReport(stagingRoot);
  const seed = await importSeedModule(resolveSeedSlug(input.playbookSlug));
  const reference = referenceFromSeed(seed);
  const displayName =
    prior?.namespace.playbookDisplayName ?? videoReport?.playbook ?? input.playbookSlug;

  const directCards = loadDirectValidatedCards(stagingRoot);
  const recoveredResult = applyRecoveredExistingSource({
    targetPlaybookSlug: input.playbookSlug,
    reference,
    directCards,
    globalRecovered: input.globalRecovered,
  });
  const reuseResult = applyDefensiveCrossPlaybookReuse({
    targetPlaybookSlug: input.playbookSlug,
    targetDisplayName: displayName,
    reference,
    directCards: recoveredResult.combinedCards,
    corpus: input.corpus,
  });
  const combinedCards = reuseResult.combinedCards;
  const coverage = computeDefensiveReuseCoverage({
    reference,
    directCards,
    combinedCards,
  });
  const { combinedCatalog, combinedFormationCoverage, recaptureQueue } =
    buildRecaptureArtifacts({
      playbookSlug: input.playbookSlug,
      gameVersion: DEFENSIVE_REUSE_GAME_VERSION,
      side: DEFENSIVE_REUSE_SIDE,
      reference,
      combinedCards,
    });
  const missing = combinedCatalog.missingCatalogPlays;
  const issues = diagnoseMissingIssues({
    missing,
    allCards: combinedCards,
    formationCoverage: combinedFormationCoverage,
  });
  const breakdown = emptyBreakdown();
  for (const issue of issues) breakdown[issue.reason] += 1;
  const structuralOk = structuralOkFromCards(combinedCards.filter((c) => c.catalogValid));
  const status = classifyStatus({
    expected: coverage.expected,
    detected: coverage.totalCoverage,
    missing: missing.length,
    issues,
    structuralOk,
  });

  const enriched: ManualSupplementReport & Record<string, unknown> = {
    ...(prior ?? {
      namespace: {
        gameVersion: DEFENSIVE_REUSE_GAME_VERSION,
        side: DEFENSIVE_REUSE_SIDE,
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
    remainingMissing: missing.length,
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
    batchStatus: status,
    batchFailureReason: structuralOk ? null : "Structural validation failed",
    structuralValidation: structuralOk ? "PASS" : "FAIL",
    issues,
    issueBreakdown: breakdown,
    notes: [
      ...(prior?.notes ?? []),
      `Global recovery: ${recoveredResult.mappingsSatisfied} recovered + ${reuseResult.mappingsSatisfied} reused = ${coverage.totalCoverage}/${coverage.expected}.`,
    ],
  };

  writeFileSync(
    join(stagingRoot, "supplement-report.json"),
    `${JSON.stringify(enriched, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    join(stagingRoot, "recapture-queue.json"),
    `${JSON.stringify(recaptureQueue, null, 2)}\n`,
    "utf8",
  );

  if (status === "NEEDS_SUPPLEMENTS" && issues.length > 0) {
    const checklistPath = join(stagingRoot, "RECAPTURE_CHECKLIST.md");
    const byFormation = new Map<string, MissingIssue[]>();
    for (const issue of issues) {
      const list = byFormation.get(issue.formation) ?? [];
      list.push(issue);
      byFormation.set(issue.formation, list);
    }
    const lines = [`# ${displayName} — Remaining Issues`, "", `Missing: ${issues.length}`, ""];
    for (const formation of [...byFormation.keys()].sort()) {
      lines.push(`## ${formation}`, "");
      for (const item of byFormation.get(formation)!) {
        lines.push(`- [ ] ${item.play} — ${item.reason}`);
      }
      lines.push("");
    }
    writeFileSync(checklistPath, `${lines.join("\n").trimEnd()}\n`, "utf8");
  } else {
    const stale = join(stagingRoot, "RECAPTURE_CHECKLIST.md");
    if (existsSync(stale)) unlinkSync(stale);
  }

  return {
    playbook: displayName,
    playbookSlug: input.playbookSlug,
    status,
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
  if (!c) return "_none_";
  return [
    c.indexed.sourcePlaybookDisplayName,
    c.indexed.sourceFile,
    `formation OCR: ${c.formationOcr}`,
    `play OCR: ${c.playNameOcr ?? c.playNameOcrRaw ?? ""}`,
    `canonical: ${result.target.formation} / ${result.target.play}`,
    `art: ${relative(SIDELINE_ROOT, c.indexed.artCropPath)}`,
  ].join(" | ");
}

function writeOperatorQueues(input: {
  recoveryResults: IdentityRecoveryResult[];
  books: BookResult[];
}): void {
  const resolutionRequired = input.recoveryResults.filter(
    (r) => r.classification === "AMBIGUOUS_SOURCE",
  );
  const captureRequired = input.recoveryResults.filter((r) =>
    ["GENUINELY_NOT_CAPTURED", "INVALID_EXISTING_CAPTURE"].includes(r.classification),
  );

  const resolutionLines: string[] = [];
  resolutionLines.push("# Defensive Resolution Queue");
  resolutionLines.push("");
  resolutionLines.push(
    "Source pixels exist; exact canonical identity has not yet been established safely.",
  );
  resolutionLines.push("No new defensive screenshots are required for these rows.");
  resolutionLines.push("");
  resolutionLines.push("## Summary");
  resolutionLines.push("");
  resolutionLines.push(
    `Missing playbook mappings: ${input.books.reduce((n, b) => n + b.missing, 0)}`,
  );
  resolutionLines.push(`Resolution-required identities: ${resolutionRequired.length}`);
  resolutionLines.push("");

  if (resolutionRequired.length === 0) {
    resolutionLines.push("## DEFENSIVE RESOLUTION QUEUE COMPLETE");
    resolutionLines.push("");
    resolutionLines.push("NO DEFENSIVE CAPTURES REQUIRED");
    resolutionLines.push("");
  } else {
    const byFormation = new Map<string, IdentityRecoveryResult[]>();
    for (const result of resolutionRequired) {
      const list = byFormation.get(result.target.formation) ?? [];
      list.push(result);
      byFormation.set(result.target.formation, list);
    }
    for (const [formation, results] of [...byFormation.entries()].sort((a, b) =>
      a[0].localeCompare(b[0]),
    )) {
      resolutionLines.push(`## ${formation}`);
      resolutionLines.push("");
      for (const result of results.sort((a, b) => a.target.play.localeCompare(b.target.play))) {
        const w = result.winningCandidate;
        resolutionLines.push(`### ${result.target.play}`);
        resolutionLines.push("");
        resolutionLines.push(`- Classification: ${result.classification}`);
        resolutionLines.push(`- Root cause: ${result.ambiguityRootCause ?? "OTHER"}`);
        if (w) {
          resolutionLines.push(
            `- Source: ${w.indexed.sourcePlaybookDisplayName} / ${w.indexed.sourceFile}`,
          );
          resolutionLines.push(`- Formation OCR: ${w.formationOcrRaw.replace(/\n/g, " | ")}`);
          resolutionLines.push(`- Play OCR: ${w.playNameOcr ?? w.playNameOcrRaw ?? ""}`);
          resolutionLines.push(
            `- Art crop: ${relative(SIDELINE_ROOT, w.indexed.artCropPath)}`,
          );
        }
        if (result.competingCatalogCandidates?.length) {
          resolutionLines.push("- Competing candidates:");
          for (const c of result.competingCatalogCandidates) {
            resolutionLines.push(`  - ${c}`);
          }
        }
        resolutionLines.push(`- Why fail-closed: ${result.notes.join(" ")}`);
        resolutionLines.push("");
      }
    }
  }

  writeFileSync(
    join(VIDEO_STAGING, "DEFENSIVE_RESOLUTION_QUEUE.md"),
    `${resolutionLines.join("\n").trimEnd()}\n`,
    "utf8",
  );

  const captureLines: string[] = [];
  captureLines.push("# Defensive Unique Capture Queue (Deprecated)");
  captureLines.push("");
  captureLines.push("**NO DEFENSIVE CAPTURES REQUIRED**");
  captureLines.push("");
  captureLines.push(
    "Authoritative unresolved work is now `DEFENSIVE_RESOLUTION_QUEUE.md`.",
  );
  captureLines.push("");
  captureLines.push(
    "This file is retained for pipeline compatibility only. Identities classified as",
  );
  captureLines.push(
    "`AMBIGUOUS_SOURCE` or `SOURCE_FOUND_RESOLUTION_REQUIRED` must not appear here.",
  );
  captureLines.push("");
  if (captureRequired.length === 0) {
    captureLines.push("_No identities classified as GENUINELY_NOT_CAPTURED or INVALID_EXISTING_CAPTURE._");
  } else {
    captureLines.push(`Capture-required identities: ${captureRequired.length}`);
    captureLines.push("");
    for (const result of captureRequired) {
      captureLines.push(`- ${result.target.formation} / ${result.target.play} — ${result.classification}`);
    }
  }
  captureLines.push("");

  writeFileSync(
    join(VIDEO_STAGING, "DEFENSIVE_UNIQUE_CAPTURE_QUEUE.md"),
    `${captureLines.join("\n").trimEnd()}\n`,
    "utf8",
  );
}

function writeRecoveryReports(input: {
  startingUnique: number;
  startingMissingMappings: number;
  recoveryResults: IdentityRecoveryResult[];
  books: BookResult[];
  globalRecoveredCount: number;
  passLabel: string;
}): void {
  const resolvedThisPass = input.recoveryResults.filter(
    (r) => r.classification === "RECOVERED_EXISTING_SOURCE",
  ).length;
  const stillAmbiguous = input.recoveryResults.filter(
    (r) => r.classification === "AMBIGUOUS_SOURCE",
  ).length;
  const mappingsRecovered =
    input.startingMissingMappings - input.books.reduce((n, b) => n + b.missing, 0);

  writeOperatorQueues({
    recoveryResults: input.recoveryResults,
    books: input.books,
  });

  const recoveryLines: string[] = [];
  recoveryLines.push("# Defensive Global Source Recovery");
  recoveryLines.push("");
  recoveryLines.push("## Starting State");
  recoveryLines.push("");
  recoveryLines.push(
    `Unique identities previously labeled capture-required: **${input.startingUnique}**`,
  );
  recoveryLines.push(`Missing playbook mappings: **${input.startingMissingMappings}**`);
  recoveryLines.push("");
  recoveryLines.push("## Existing Source Recovery");
  recoveryLines.push("");
  recoveryLines.push(
    `Exact validated reuse already available: **${input.recoveryResults.filter((r) => r.classification === "EXACT_VALIDATED_REUSE").length}**`,
  );
  recoveryLines.push(
    `Recovered from previously unresolved source: **${input.recoveryResults.filter((r) => r.classification === "RECOVERED_EXISTING_SOURCE").length}**`,
  );
  recoveryLines.push(`Still ambiguous: **${stillAmbiguous}**`);
  recoveryLines.push(
    `Invalid existing source: **${input.recoveryResults.filter((r) => r.classification === "INVALID_EXISTING_CAPTURE").length}**`,
  );
  recoveryLines.push(
    `Genuinely not captured: **${input.recoveryResults.filter((r) => r.classification === "GENUINELY_NOT_CAPTURED").length}**`,
  );
  recoveryLines.push("");
  recoveryLines.push("## Mapping Impact");
  recoveryLines.push("");
  recoveryLines.push(`Mappings recovered this pass: **${Math.max(0, mappingsRecovered)}**`);
  recoveryLines.push(
    `Mappings remaining: **${input.books.reduce((n, b) => n + b.missing, 0)}**`,
  );
  recoveryLines.push("");
  recoveryLines.push("## Known Verification Cases");
  recoveryLines.push("");
  recoveryLines.push("### Goal Line 6-2");
  recoveryLines.push("");
  recoveryLines.push("| Play | Outcome | Source |");
  recoveryLines.push("|---|---|---|");
  for (const play of [
    "60 BASE",
    "60 HALF OUT",
    "60 OUT",
    "60 OUT JACKS",
    "60 PINCH",
    "GUTS",
  ]) {
    const result = input.recoveryResults.find(
      (r) => r.target.formation === "Goal Line 6-2" && r.target.play === play,
    );
    recoveryLines.push(
      `| ${play} | ${result?.classification ?? "N/A"} | ${result ? formatCandidate(result) : "_none_"} |`,
    );
  }
  recoveryLines.push("");
  recoveryLines.push("### Dime 3-2 / 1 DOUBLE WR1");
  recoveryLines.push("");
  const dime = input.recoveryResults.find(
    (r) => r.target.formation === "Dime 3-2" && r.target.play === "1 DOUBLE WR1",
  );
  recoveryLines.push(`Outcome: **${dime?.classification ?? "N/A"}**`);
  recoveryLines.push(`Source: ${dime ? formatCandidate(dime) : "_none_"}`);
  recoveryLines.push("");
  recoveryLines.push("### Nickel Over / NICKEL BLITZ 2");
  recoveryLines.push("");
  const nickel = input.recoveryResults.find(
    (r) => r.target.formation === "Nickel Over" && r.target.play === "NICKEL BLITZ 2",
  );
  recoveryLines.push(`Outcome: **${nickel?.classification ?? "N/A"}**`);
  recoveryLines.push(`Source: ${nickel ? formatCandidate(nickel) : "_none_"}`);
  recoveryLines.push("");
  recoveryLines.push("## Remaining Resolution Queue");
  recoveryLines.push("");
  recoveryLines.push(`Authoritative file: \`DEFENSIVE_RESOLUTION_QUEUE.md\``);
  recoveryLines.push(`Resolution-required count: **${stillAmbiguous}**`);
  recoveryLines.push("");

  writeFileSync(
    join(VIDEO_STAGING, "DEFENSIVE_GLOBAL_SOURCE_RECOVERY.md"),
    `${recoveryLines.join("\n").trimEnd()}\n`,
    "utf8",
  );

  const finalLines: string[] = [];
  finalLines.push(`# Defensive Final Ambiguity Resolution (${input.passLabel})`);
  finalLines.push("");
  finalLines.push("## Summary");
  finalLines.push("");
  finalLines.push(`Starting ambiguous identities: **${input.startingUnique}**`);
  finalLines.push(`Starting missing mappings: **${input.startingMissingMappings}**`);
  finalLines.push(`Resolved this pass: **${resolvedThisPass}**`);
  finalLines.push(`Still ambiguous: **${stillAmbiguous}**`);
  finalLines.push(
    `Final missing mappings: **${input.books.reduce((n, b) => n + b.missing, 0)}**`,
  );
  finalLines.push(
    `Aggregate coverage: **${input.books.reduce((n, b) => n + b.totalCoverage, 0)} / ${input.books.reduce((n, b) => n + b.expected, 0)}**`,
  );
  finalLines.push("");
  finalLines.push("## Results");
  finalLines.push("");
  finalLines.push("| Formation | Play | Final Result | Root Cause |");
  finalLines.push("|---|---|---|---|");
  for (const result of input.recoveryResults.sort(
    (a, b) =>
      a.target.formation.localeCompare(b.target.formation) ||
      a.target.play.localeCompare(b.target.play),
  )) {
    finalLines.push(
      `| ${result.target.formation} | ${result.target.play} | ${result.classification} | ${result.ambiguityRootCause ?? ""} |`,
    );
  }
  finalLines.push("");

  writeFileSync(
    join(VIDEO_STAGING, "DEFENSIVE_FINAL_AMBIGUITY_RESOLUTION.md"),
    `${finalLines.join("\n").trimEnd()}\n`,
    "utf8",
  );

  const coverageLines: string[] = [];
  coverageLines.push("# Defensive Coverage After Global Source Recovery");
  coverageLines.push("");
  coverageLines.push(
    "| Playbook | Expected | Direct | Recovered | Reused | Total | Missing | Status |",
  );
  coverageLines.push("|---|---:|---:|---:|---:|---:|---:|---|");
  for (const book of [...input.books].sort((a, b) => a.playbook.localeCompare(b.playbook))) {
    coverageLines.push(
      `| ${book.playbook} | ${book.expected} | ${book.directCaptured} | ${book.recoveredExistingSource} | ${book.exactReused} | ${book.totalCoverage} | ${book.missing} | ${book.status} |`,
    );
  }
  writeFileSync(
    join(VIDEO_STAGING, "DEFENSIVE_RECOVERY_COVERAGE.md"),
    `${coverageLines.join("\n").trimEnd()}\n`,
    "utf8",
  );
}

async function main(): Promise<void> {
  console.log("DEFENSIVE GLOBAL SOURCE RECOVERY");
  console.log(`Staging: ${VIDEO_STAGING}`);
  console.log("");

  const starting = loadRemainingMissingTargets();
  console.log(
    `Remaining missing: ${starting.uniqueRemaining} unique / ${starting.totalMissingMappings} mappings`,
  );

  const sourceIndex = buildGlobalDefensiveSourceIndex(PLAY_ART_ROOT);
  console.log(`Global source index: ${sourceIndex.length} cards`);

  const indexPath = join(VIDEO_STAGING, "DEFENSIVE_GLOBAL_SOURCE_INDEX.json");
  writeFileSync(
    indexPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        cardCount: sourceIndex.length,
        cards: sourceIndex.map((c) => ({
          gameVersion: c.gameVersion,
          side: c.side,
          sourcePlaybook: c.sourcePlaybookSlug,
          sourceType: c.sourceType,
          sourceFile: c.sourceFile,
          cardPosition: c.cardPosition,
          formationOcr: c.formationOcr,
          playNameOcr: c.playNameOcr,
          matchedFormation: c.matchedFormation,
          matchedPlay: c.matchedPlay,
          validationStatus: c.validationStatus,
          artCropPath: relative(SIDELINE_ROOT, c.artCropPath),
          sourceCardPath: relative(SIDELINE_ROOT, c.sourceCardPath),
        })),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const formationCatalog = await buildGlobalDefensiveFormationCatalog(PLAY_ART_ROOT);
  const preCorpus = buildDefensiveValidatedArtCorpus(PLAY_ART_ROOT);
  const recoveryPass = await runGlobalDefensiveRecovery({
    missingTargets: starting.targets,
    formationCatalog,
    sourceIndex,
    corpus: preCorpus,
  });

  const mergedRecovered = new Map<string, ExtractedVideoCard>();
  for (const card of loadGlobalRecoveredCards(PLAY_ART_ROOT)) {
    if (!card.matchedFormation || !card.matchedPlay) continue;
    mergedRecovered.set(
      defensiveReusableArtKey(card.matchedFormation, card.matchedPlay),
      card,
    );
  }
  for (const card of recoveryPass.recoveredCards) {
    if (!card.matchedFormation || !card.matchedPlay) continue;
    mergedRecovered.set(
      defensiveReusableArtKey(card.matchedFormation, card.matchedPlay),
      card,
    );
  }
  const allRecoveredCards = [...mergedRecovered.values()];

  writeFileSync(
    globalRecoveredRegistryPath(PLAY_ART_ROOT),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        recoveredCount: allRecoveredCards.length,
        recovered: allRecoveredCards,
        identityResults: recoveryPass.identityResults.map((r) => ({
          formation: r.target.formation,
          play: r.target.play,
          classification: r.classification,
          ambiguityRootCause: r.ambiguityRootCause ?? null,
          competingCatalogCandidates: r.competingCatalogCandidates ?? [],
          sourceCandidates: r.sourceCandidates,
          source: r.winningCandidate
            ? {
                playbook: r.winningCandidate.indexed.sourcePlaybookDisplayName,
                file: r.winningCandidate.indexed.sourceFile,
                formationOcr: r.winningCandidate.formationOcrRaw,
                playOcr: r.winningCandidate.playNameOcr,
                artCropPath: r.winningCandidate.indexed.artCropPath,
              }
            : null,
          notes: r.notes,
        })),
        summary: recoveryPass.summary,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`Recovered canonical identities: ${allRecoveredCards.length}`);

  const corpus = buildDefensiveValidatedArtCorpus(PLAY_ART_ROOT);
  const books: BookResult[] = [];
  for (const slug of listDefensivePlaybookSlugs(PLAY_ART_ROOT)) {
    console.log(`Rebuilding: ${slug}`);
    books.push(
      await reapplyBook({
        playbookSlug: slug,
        corpus,
        globalRecovered: allRecoveredCards,
      }),
    );
  }

  writeRecoveryReports({
    startingUnique: starting.uniqueRemaining,
    startingMissingMappings: starting.totalMissingMappings,
    recoveryResults: recoveryPass.identityResults,
    books,
    globalRecoveredCount: allRecoveredCards.length,
    passLabel: "disambiguation pass",
  });

  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  mkdirSync(BATCH_LOG_ROOT, { recursive: true });
  writeFileSync(
    join(BATCH_LOG_ROOT, `defense-global-recovery-${stamp}-report.json`),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        starting,
        recoverySummary: recoveryPass.summary,
        books,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log("");
  console.log("SUMMARY");
  console.log(
    JSON.stringify(
      {
        startingUnique: starting.uniqueRemaining,
        startingMissingMappings: starting.totalMissingMappings,
        recoveredIdentities: recoveryPass.summary.recoveredExistingSource,
        remainingMissingMappings: books.reduce((n, b) => n + b.missing, 0),
        remainingResolutionRequired: recoveryPass.identityResults.filter((r) =>
          r.classification === "AMBIGUOUS_SOURCE",
        ).length,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
