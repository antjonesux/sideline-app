/**
 * Apply exact defensive cross-playbook art reuse across all CFB27 defensive books.
 * Recomputes coverage from existing direct captures — does NOT re-OCR screenshots.
 *
 *   npm run play-art:defense-art-reuse
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
import { importSeedModule, referenceFromSeed } from "../build-reference";
import {
  applyDefensiveCrossPlaybookReuse,
  buildDefensiveValidatedArtCorpus,
  buildRecaptureArtifacts,
  computeDefensiveReuseCoverage,
  DEFENSIVE_REUSE_GAME_VERSION,
  DEFENSIVE_REUSE_SIDE,
  loadDirectValidatedCards,
  listDefensivePlaybookSlugs,
  type DefensiveArtCorpus,
} from "./defensive-art-reuse";
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

export type DefenseReuseBookResult = {
  playbook: string;
  playbookSlug: string;
  status: BookStatus;
  failureReason: string | null;
  expected: number;
  directCaptured: number;
  exactReused: number;
  totalCoverage: number;
  missing: number;
  coveragePct: number;
  reuseMappingsSatisfied: number;
  incompleteFormations: number;
  issues: MissingIssue[];
  issueBreakdown: Record<IssueReason, number>;
  structuralValidation: "PASS" | "FAIL";
  stagingRoot: string;
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
  failureReason: string | null;
}): { status: BookStatus; failureReason: string | null } {
  if (input.failureReason) return { status: "FAILED", failureReason: input.failureReason };
  if (!input.structuralOk) {
    return {
      status: "FAILED",
      failureReason:
        "Structural validation failed (missing art crops or invalid crop geometry)",
    };
  }
  if (
    input.expected > 0 &&
    input.detected === input.expected &&
    input.missing === 0 &&
    input.issues.length === 0
  ) {
    return { status: "READY_TO_PUBLISH", failureReason: null };
  }
  return { status: "NEEDS_SUPPLEMENTS", failureReason: null };
}

function writeExceptionChecklist(input: {
  displayName: string;
  detected: number;
  expected: number;
  issues: MissingIssue[];
  incompleteFormations: number;
  outPath: string;
}): void {
  const byFormation = new Map<string, MissingIssue[]>();
  for (const issue of input.issues) {
    const list = byFormation.get(issue.formation) ?? [];
    list.push(issue);
    byFormation.set(issue.formation, list);
  }
  const formations = [...byFormation.keys()].sort((a, b) => {
    const da = byFormation.get(a)!.length;
    const db = byFormation.get(b)!.length;
    return db - da || a.localeCompare(b);
  });
  const lines: string[] = [];
  lines.push(`# ${input.displayName} — Remaining Issues`);
  lines.push("");
  lines.push(`Coverage: ${input.detected} / ${input.expected}`);
  lines.push(`Missing: ${input.issues.length}`);
  lines.push(`Incomplete formations: ${input.incompleteFormations}`);
  lines.push("");
  if (formations.length === 0) {
    lines.push("_No remaining issues._");
    lines.push("");
  } else {
    for (const formation of formations) {
      const items = byFormation.get(formation)!;
      lines.push(`## ${formation}`);
      lines.push("");
      for (const item of items) {
        lines.push(`- [ ] ${item.play} — ${item.reason}`);
      }
      lines.push("");
    }
  }
  writeFileSync(input.outPath, `${lines.join("\n").trimEnd()}\n`, "utf8");
}

function resolveSeedSlug(playbookSlug: string): string {
  const report = loadVideoReport(join(VIDEO_STAGING, playbookSlug));
  return report?.seedSlug ?? playbookSlug;
}

async function reapplyReuseToBook(input: {
  playbookSlug: string;
  corpus: DefensiveArtCorpus;
}): Promise<DefenseReuseBookResult> {
  const stagingRoot = join(VIDEO_STAGING, input.playbookSlug);
  const relStaging = relative(SIDELINE_ROOT, stagingRoot);
  const prior = loadSupplementReport(stagingRoot);
  const videoReport = loadVideoReport(stagingRoot);

  if (!videoReport && !prior) {
    return {
      playbook: input.playbookSlug,
      playbookSlug: input.playbookSlug,
      status: "FAILED",
      failureReason: "No video staging report",
      expected: 0,
      directCaptured: 0,
      exactReused: 0,
      totalCoverage: 0,
      missing: 0,
      coveragePct: 0,
      reuseMappingsSatisfied: 0,
      incompleteFormations: 0,
      issues: [],
      issueBreakdown: emptyBreakdown(),
      structuralValidation: "FAIL",
      stagingRoot: relStaging,
    };
  }

  const seedSlug = resolveSeedSlug(input.playbookSlug);
  const seed = await importSeedModule(seedSlug);
  const reference = referenceFromSeed(seed);
  const displayName =
    prior?.namespace.playbookDisplayName ??
    videoReport?.playbook ??
    input.playbookSlug;

  const directCards = loadDirectValidatedCards(stagingRoot);
  const reuseResult = applyDefensiveCrossPlaybookReuse({
    targetPlaybookSlug: input.playbookSlug,
    targetDisplayName: displayName,
    reference,
    directCards,
    corpus: input.corpus,
  });
  const reuseCoverage = computeDefensiveReuseCoverage({
    reference,
    directCards,
    combinedCards: reuseResult.combinedCards,
  });
  const { combinedCatalog, combinedFormationCoverage, recaptureQueue } =
    buildRecaptureArtifacts({
      playbookSlug: input.playbookSlug,
      gameVersion: DEFENSIVE_REUSE_GAME_VERSION,
      side: DEFENSIVE_REUSE_SIDE,
      reference,
      combinedCards: reuseResult.combinedCards,
    });

  const missing = combinedCatalog.missingCatalogPlays;
  const issues = diagnoseMissingIssues({
    missing,
    allCards: reuseResult.combinedCards,
    formationCoverage: combinedFormationCoverage,
  });
  const breakdown = emptyBreakdown();
  for (const issue of issues) breakdown[issue.reason] += 1;

  const structuralOk = structuralOkFromCards(
    reuseResult.combinedCards.filter((c) => c.catalogValid),
  );
  const { status, failureReason } = classifyStatus({
    expected: reuseCoverage.expected,
    detected: reuseCoverage.totalCoverage,
    missing: missing.length,
    issues,
    structuralOk,
    failureReason: null,
  });

  const incompleteFormations = combinedFormationCoverage.filter(
    (r) => r.status !== "COMPLETE",
  ).length;
  const completeFormations = combinedFormationCoverage.filter(
    (r) => r.status === "COMPLETE",
  ).length;

  let checklistPath: string | null = null;
  if (status === "NEEDS_SUPPLEMENTS" && issues.length > 0) {
    checklistPath = join(stagingRoot, "RECAPTURE_CHECKLIST.md");
    writeExceptionChecklist({
      displayName,
      detected: reuseCoverage.totalCoverage,
      expected: reuseCoverage.expected,
      issues,
      incompleteFormations,
      outPath: checklistPath,
    });
    checklistPath = relative(SIDELINE_ROOT, checklistPath);
  } else {
    const stale = join(stagingRoot, "RECAPTURE_CHECKLIST.md");
    if (existsSync(stale)) unlinkSync(stale);
  }

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
        detected: reuseCoverage.directCaptured,
        expected: reuseCoverage.expected,
        pct: reuseCoverage.expected
          ? (reuseCoverage.directCaptured / reuseCoverage.expected) * 100
          : 0,
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
      detected: reuseCoverage.totalCoverage,
      expected: reuseCoverage.expected,
      pct: reuseCoverage.coveragePct,
    },
    remainingMissing: missing.length,
    completeFormations,
    incompleteFormations,
    combinedFormationCoverage,
    combinedCards: reuseResult.combinedCards,
    reuseCards: reuseResult.reuseCards,
    reuseCoverage,
    recaptureQueue,
    batchStatus: status,
    batchFailureReason: failureReason,
    structuralValidation: structuralOk ? "PASS" : "FAIL",
    issues,
    issueBreakdown: breakdown,
    checklistPath,
    notes: [
      ...(prior?.notes ?? []),
      `Exact cross-playbook reuse applied: ${reuseCoverage.exactReused} identities (${reuseCoverage.directCaptured} direct + ${reuseCoverage.exactReused} reused = ${reuseCoverage.totalCoverage} total).`,
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
  writeFileSync(
    join(stagingRoot, "combined-coverage.json"),
    `${JSON.stringify(
      {
        videoOnly: enriched.videoOnlyCoverage,
        combined: enriched.combinedCoverage,
        reuse: reuseCoverage,
        remainingMissing: missing.length,
        newMissingPlaysRecovered: enriched.newMissingPlaysRecovered,
        formationDeltas: enriched.formationDeltas,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  if (videoReport) {
    const reportMutable = videoReport as VideoPrepareReport &
      Record<string, unknown>;
    reportMutable.batchStatus = status;
    reportMutable.batchFailureReason = failureReason;
    reportMutable.structuralValidation = structuralOk ? "PASS" : "FAIL";
    reportMutable.checklistPath = checklistPath;
    reportMutable.combinedDetectedAfterScreenshots = reuseCoverage.totalCoverage;
    reportMutable.combinedExpected = reuseCoverage.expected;
    writeFileSync(
      join(stagingRoot, "report.json"),
      `${JSON.stringify(reportMutable, null, 2)}\n`,
      "utf8",
    );
  }

  return {
    playbook: displayName,
    playbookSlug: input.playbookSlug,
    status,
    failureReason,
    expected: reuseCoverage.expected,
    directCaptured: reuseCoverage.directCaptured,
    exactReused: reuseCoverage.exactReused,
    totalCoverage: reuseCoverage.totalCoverage,
    missing: missing.length,
    coveragePct: reuseCoverage.coveragePct,
    reuseMappingsSatisfied: reuseResult.mappingsSatisfied,
    incompleteFormations,
    issues,
    issueBreakdown: breakdown,
    structuralValidation: structuralOk ? "PASS" : "FAIL",
    stagingRoot: relStaging,
  };
}

function writeCombinedOperatorReports(books: DefenseReuseBookResult[]): string {
  const sorted = [...books].sort((a, b) => {
    if (a.status !== b.status) {
      const rank = (s: BookStatus) =>
        s === "READY_TO_PUBLISH" ? 0 : s === "NEEDS_SUPPLEMENTS" ? 1 : 2;
      return rank(a.status) - rank(b.status);
    }
    return a.missing - b.missing || a.playbook.localeCompare(b.playbook);
  });

  const coverageLines: string[] = [];
  coverageLines.push("# Defensive Coverage After Exact-Art Reuse");
  coverageLines.push("");
  coverageLines.push(
    "| Playbook | Expected | Direct | Reused | Total | Missing | Status |",
  );
  coverageLines.push("|---|---:|---:|---:|---:|---:|---|");
  for (const b of sorted) {
    coverageLines.push(
      `| ${b.playbook} | ${b.expected} | ${b.directCaptured} | ${b.exactReused} | ${b.totalCoverage} | ${b.missing} | ${b.status} |`,
    );
  }
  writeFileSync(
    join(VIDEO_STAGING, "DEFENSIVE_REUSE_COVERAGE.md"),
    `${coverageLines.join("\n").trimEnd()}\n`,
    "utf8",
  );

  const incomplete = sorted.filter((b) => b.status === "NEEDS_SUPPLEMENTS");
  const queueLines: string[] = [];
  queueLines.push("# Remaining Defensive Capture Queue");
  queueLines.push("");
  queueLines.push(
    "| Playbook | Coverage | Missing | Incomplete Formations | Status |",
  );
  queueLines.push("|---|---:|---:|---:|---|");
  for (const b of incomplete) {
    queueLines.push(
      `| ${b.playbook} | ${b.totalCoverage} / ${b.expected} (${b.coveragePct.toFixed(1)}%) | ${b.missing} | ${b.incompleteFormations} | ${b.status} |`,
    );
  }
  queueLines.push("");
  queueLines.push("---");
  queueLines.push("");
  for (const b of incomplete) {
    queueLines.push(`## ${b.playbook}`);
    queueLines.push("");
    queueLines.push(
      `Coverage: ${b.totalCoverage} / ${b.expected} (${b.coveragePct.toFixed(1)}%)`,
    );
    queueLines.push(`Missing: ${b.missing}`);
    queueLines.push("");
    const byFormation = new Map<string, MissingIssue[]>();
    for (const issue of b.issues) {
      const list = byFormation.get(issue.formation) ?? [];
      list.push(issue);
      byFormation.set(issue.formation, list);
    }
    for (const formation of [...byFormation.keys()].sort()) {
      queueLines.push(`### ${formation}`);
      queueLines.push("");
      for (const item of byFormation.get(formation)!) {
        queueLines.push(`- [ ] ${item.play} — ${item.reason}`);
      }
      queueLines.push("");
    }
  }
  writeFileSync(
    join(VIDEO_STAGING, "RECAPTURE_CHECKLIST.md"),
    `${queueLines.join("\n").trimEnd()}\n`,
    "utf8",
  );

  return relative(SIDELINE_ROOT, join(VIDEO_STAGING, "DEFENSIVE_REUSE_COVERAGE.md"));
}

async function main(): Promise<void> {
  console.log("DEFENSIVE EXACT-ART REUSE");
  console.log(`Staging: ${VIDEO_STAGING}`);
  console.log("");

  const corpus = buildDefensiveValidatedArtCorpus(PLAY_ART_ROOT);
  console.log(`Corpus identities: ${corpus.size}`);
  console.log("");

  const slugs = listDefensivePlaybookSlugs(PLAY_ART_ROOT);
  const results: DefenseReuseBookResult[] = [];
  const stamp = new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, "")
    .slice(0, 14);

  for (const slug of slugs) {
    console.log("─".repeat(64));
    console.log(`Applying reuse: ${slug}`);
    try {
      const result = await reapplyReuseToBook({ playbookSlug: slug, corpus });
      console.log(
        `  ${result.status} — direct ${result.directCaptured} + reused ${result.exactReused} = ${result.totalCoverage}/${result.expected} (${result.coveragePct.toFixed(1)}%) missing=${result.missing}`,
      );
      results.push(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  FAILED: ${message}`);
      results.push({
        playbook: slug,
        playbookSlug: slug,
        status: "FAILED",
        failureReason: message,
        expected: 0,
        directCaptured: 0,
        exactReused: 0,
        totalCoverage: 0,
        missing: 0,
        coveragePct: 0,
        reuseMappingsSatisfied: 0,
        incompleteFormations: 0,
        issues: [],
        issueBreakdown: emptyBreakdown(),
        structuralValidation: "FAIL",
        stagingRoot: "",
      });
    }
  }

  const coverageReport = writeCombinedOperatorReports(results);

  mkdirSync(BATCH_LOG_ROOT, { recursive: true });
  const batchPath = join(BATCH_LOG_ROOT, `defense-art-reuse-${stamp}-report.json`);
  const totalReuseMappings = results.reduce((n, r) => n + r.reuseMappingsSatisfied, 0);
  const totalMissing = results.reduce((n, r) => n + r.missing, 0);
  writeFileSync(
    batchPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        stamp,
        coverageReportPath: coverageReport,
        counts: {
          books: results.length,
          reuseMappingsSatisfied: totalReuseMappings,
          totalMissing,
          ready: results.filter((r) => r.status === "READY_TO_PUBLISH").length,
          needs: results.filter((r) => r.status === "NEEDS_SUPPLEMENTS").length,
          failed: results.filter((r) => r.status === "FAILED").length,
        },
        books: results,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log("");
  console.log("═".repeat(64));
  console.log("DEFENSIVE EXACT-ART REUSE SUMMARY");
  console.log("═".repeat(64));
  console.log(
    `Reuse mappings satisfied: ${totalReuseMappings}  Remaining missing: ${totalMissing}`,
  );
  console.log(
    `Ready: ${results.filter((r) => r.status === "READY_TO_PUBLISH").length}  Needs: ${results.filter((r) => r.status === "NEEDS_SUPPLEMENTS").length}  Failed: ${results.filter((r) => r.status === "FAILED").length}`,
  );
  console.log(`Coverage report: ${coverageReport}`);
  console.log(`Batch JSON: ${relative(SIDELINE_ROOT, batchPath)}`);
  console.log("");
  console.log("Regenerating unique capture queue...");
}

main()
  .then(async () => {
    const { spawnSync } = await import("node:child_process");
    const analyze = spawnSync(
      "npx",
      ["tsx", "./scripts/play-art/video/analyze-defensive-capture-overlap.ts"],
      {
        cwd: SIDELINE_ROOT,
        stdio: "inherit",
        env: { ...process.env, NODE_PATH: "./node_modules" },
      },
    );
    if (analyze.status !== 0) {
      process.exitCode = analyze.status ?? 1;
    }
  })
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
