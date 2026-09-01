/**
 * Batch OBS video processing with READY_TO_PUBLISH / NEEDS_SUPPLEMENTS / FAILED status.
 *
 *   npm run play-art:video-batch -- --side=defense
 *   npm run play-art:video-batch -- --side=defense --pilot-only
 *   npm run play-art:video-batch -- --side=defense --force
 *
 * Does NOT publish. Offense staging is never modified when --side=defense.
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { OBS_1920x1080_TOP_BAND } from "./crop-profile";
import {
  printResolvedVideoSource,
  resolveVideoPlaybook,
} from "./resolve-video-playbook";
import type {
  FormationCoverageRow,
  VideoPrepareReport,
  VideoSideOfBall,
} from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLAY_ART_ROOT = join(__dirname, "..");
const SIDELINE_ROOT = join(PLAY_ART_ROOT, "..", "..");
const SOURCE_VIDEO_ROOT = join(PLAY_ART_ROOT, "source-video");
const VIDEO_STAGING_ROOT = join(PLAY_ART_ROOT, "video-staging");
const BATCH_LOG_ROOT = join(VIDEO_STAGING_ROOT, "_batch-logs");

export type VideoPlaybookStatus =
  | "READY_TO_PUBLISH"
  | "NEEDS_SUPPLEMENTS"
  | "FAILED";

export type VideoBatchBookResult = {
  playbook: string;
  playbookSlug: string;
  sourceFilename: string;
  sourcePath: string;
  stagingRoot: string;
  status: VideoPlaybookStatus;
  failureReason: string | null;
  expected: number | null;
  captured: number | null;
  coveragePct: number | null;
  missing: number | null;
  incompleteFormations: number | null;
  stableScreens: number | null;
  cardsExtracted: number | null;
  duplicateIdentitiesCollapsed: number | null;
  unresolvedFormationOcr: number | null;
  unresolvedPlayOcr: number | null;
  catalogMismatches: number | null;
  invalidCards: number | null;
  structuralValidation: "PASS" | "FAIL" | null;
  cropProfileId: string | null;
  frameWidth: number | null;
  frameHeight: number | null;
  sameGeometryAsOffense: boolean | null;
  checklistPath: string | null;
  recaptureQueuePath: string | null;
  reportPath: string | null;
  skipped: boolean;
  skipReason: string | null;
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

function discoverVideoSources(side: VideoSideOfBall): string[] {
  const sideDir = join(SOURCE_VIDEO_ROOT, side);
  if (!existsSync(sideDir)) return [];
  return readdirSync(sideDir)
    .filter((name) => name.toLowerCase().endsWith(".mp4") && !name.startsWith("."))
    .map((name) => join(sideDir, name))
    .sort((a, b) => a.localeCompare(b));
}

function stagingRootFor(resolved: ReturnType<typeof resolveVideoPlaybook>): string {
  return join(
    VIDEO_STAGING_ROOT,
    resolved.gameVersion,
    resolved.side,
    resolved.playbookSlug,
  );
}

function writeRecaptureChecklist(input: {
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
  const incompleteFormations = incomplete.length;
  const lines: string[] = [];
  lines.push(`# ${input.displayName} — Defensive Recapture Checklist`);
  lines.push("");
  lines.push(`Coverage: ${input.detected} / ${input.expected}`);
  lines.push(`Missing: ${missing}`);
  lines.push(`Incomplete formations: ${incompleteFormations}`);
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

function countUnresolvedOcr(report: VideoPrepareReport): {
  unresolvedFormationOcr: number;
  unresolvedPlayOcr: number;
  catalogMismatches: number;
  invalidCards: number;
} {
  const cards = report.cards.filter((c) => !c.emptySlot && !c.screenRejected);
  let unresolvedFormationOcr = 0;
  let unresolvedPlayOcr = 0;
  let catalogMismatches = 0;
  let invalidCards = 0;
  for (const card of cards) {
    if (card.formationMatchConfidence === "none") unresolvedFormationOcr += 1;
    if (
      card.playMatchConfidence === "none" &&
      card.formationMatchConfidence !== "none"
    ) {
      unresolvedPlayOcr += 1;
    }
    if (
      !card.catalogValid &&
      card.formationMatchConfidence !== "none" &&
      card.playMatchConfidence !== "none" &&
      card.playMatchConfidence !== "skipped"
    ) {
      catalogMismatches += 1;
    }
    if (card.screenRejected || (!card.catalogValid && card.rejectReason)) {
      invalidCards += 1;
    }
  }
  return {
    unresolvedFormationOcr,
    unresolvedPlayOcr,
    catalogMismatches,
    invalidCards,
  };
}

function structuralValidationPass(report: VideoPrepareReport): boolean {
  const canonical = report.cards.filter(
    (c) => c.catalogValid && !c.emptySlot && !c.screenRejected,
  );
  if (canonical.length === 0 && report.catalog.expectedPlayCount > 0) {
    return false;
  }
  for (const card of canonical) {
    if (!existsSync(card.artCropPath)) return false;
    if (!existsSync(card.sourceCardPath)) return false;
  }
  return true;
}

function classifyVideoStatus(
  report: VideoPrepareReport,
  structuralOk: boolean,
): { status: VideoPlaybookStatus; failureReason: string | null } {
  const ocr = countUnresolvedOcr(report);
  if (!structuralOk) {
    return {
      status: "FAILED",
      failureReason:
        "Structural validation failed (missing art crops or invalid crop geometry)",
    };
  }
  if (report.catalog.expectedPlayCount <= 0) {
    return {
      status: "FAILED",
      failureReason: "Expected catalog count is zero",
    };
  }

  const ready =
    report.catalog.detectedUniquePlays === report.catalog.expectedPlayCount &&
    report.catalog.missingCatalogPlays.length === 0 &&
    ocr.unresolvedFormationOcr === 0 &&
    ocr.unresolvedPlayOcr === 0 &&
    ocr.catalogMismatches === 0;

  if (ready) {
    return { status: "READY_TO_PUBLISH", failureReason: null };
  }
  return { status: "NEEDS_SUPPLEMENTS", failureReason: null };
}

function enhanceReport(
  report: VideoPrepareReport,
  batchMeta: {
    status: VideoPlaybookStatus;
    failureReason: string | null;
    structuralValidation: "PASS" | "FAIL";
    checklistPath: string | null;
  },
): Record<string, unknown> {
  const ocr = countUnresolvedOcr(report);
  return {
    ...report,
    batchStatus: batchMeta.status,
    batchFailureReason: batchMeta.failureReason,
    structuralValidation: batchMeta.structuralValidation,
    checklistPath: batchMeta.checklistPath,
    duplicateIdentitiesCollapsed: report.duplicateCards,
    unresolvedFormationOcr: ocr.unresolvedFormationOcr,
    unresolvedPlayOcr: ocr.unresolvedPlayOcr,
    catalogMismatches: ocr.catalogMismatches,
    invalidCards: ocr.invalidCards,
    positionalIdentityUsed: false,
    reviewToolUsed: false,
    externalVisualReferencesRequired: false,
  };
}

function shouldSkipVideo(stagingRoot: string, force: boolean): {
  skip: boolean;
  reason: string;
} {
  if (force) return { skip: false, reason: "" };
  const reportPath = join(stagingRoot, "report.json");
  if (!existsSync(reportPath)) return { skip: false, reason: "" };
  const raw = JSON.parse(readFileSync(reportPath, "utf8")) as Record<
    string,
    unknown
  >;
  const status = raw.batchStatus as VideoPlaybookStatus | undefined;
  if (status === "READY_TO_PUBLISH") {
    return {
      skip: true,
      reason: "Already READY_TO_PUBLISH (use --force to re-run)",
    };
  }
  return { skip: false, reason: "" };
}

function runPrepareVideo(videoPath: string, logPath: string): number {
  mkdirSync(dirname(logPath), { recursive: true });
  const relSource = relative(SIDELINE_ROOT, videoPath);
  const args = [
    "run",
    "play-art:video",
    "--",
    `--source=${relSource}`,
    "--skip-supplements",
  ];
  const result = spawnSync("npm", args, {
    cwd: SIDELINE_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  writeFileSync(logPath, output, "utf8");
  if (result.status !== 0) {
    process.stderr.write(output);
  }
  return result.status ?? 1;
}

function loadReport(stagingRoot: string): VideoPrepareReport | null {
  const reportPath = join(stagingRoot, "report.json");
  if (!existsSync(reportPath)) return null;
  return JSON.parse(readFileSync(reportPath, "utf8")) as VideoPrepareReport;
}

function postProcessBook(input: {
  resolved: ReturnType<typeof resolveVideoPlaybook>;
  stagingRoot: string;
  structuralFailure?: string;
}): VideoBatchBookResult {
  const relStaging = relative(SIDELINE_ROOT, input.stagingRoot);
  const reportPath = join(input.stagingRoot, "report.json");
  const recaptureQueuePath = join(input.stagingRoot, "recapture-queue.json");

  if (input.structuralFailure) {
    return {
      playbook: input.resolved.playbookDisplayName,
      playbookSlug: input.resolved.playbookSlug,
      sourceFilename: input.resolved.basename,
      sourcePath: input.resolved.videoPath,
      stagingRoot: relStaging,
      status: "FAILED",
      failureReason: input.structuralFailure,
      expected: null,
      captured: null,
      coveragePct: null,
      missing: null,
      incompleteFormations: null,
      stableScreens: null,
      cardsExtracted: null,
      duplicateIdentitiesCollapsed: null,
      unresolvedFormationOcr: null,
      unresolvedPlayOcr: null,
      catalogMismatches: null,
      invalidCards: null,
      structuralValidation: "FAIL",
      cropProfileId: null,
      frameWidth: null,
      frameHeight: null,
      sameGeometryAsOffense: null,
      checklistPath: null,
      recaptureQueuePath: existsSync(recaptureQueuePath)
        ? relative(SIDELINE_ROOT, recaptureQueuePath)
        : null,
      reportPath: existsSync(reportPath)
        ? relative(SIDELINE_ROOT, reportPath)
        : null,
      skipped: false,
      skipReason: null,
    };
  }

  const report = loadReport(input.stagingRoot);
  if (!report) {
    return {
      playbook: input.resolved.playbookDisplayName,
      playbookSlug: input.resolved.playbookSlug,
      sourceFilename: input.resolved.basename,
      sourcePath: input.resolved.videoPath,
      stagingRoot: relStaging,
      status: "FAILED",
      failureReason: "Video processing did not produce report.json",
      expected: null,
      captured: null,
      coveragePct: null,
      missing: null,
      incompleteFormations: null,
      stableScreens: null,
      cardsExtracted: null,
      duplicateIdentitiesCollapsed: null,
      unresolvedFormationOcr: null,
      unresolvedPlayOcr: null,
      catalogMismatches: null,
      invalidCards: null,
      structuralValidation: null,
      cropProfileId: null,
      frameWidth: null,
      frameHeight: null,
      sameGeometryAsOffense: null,
      checklistPath: null,
      recaptureQueuePath: null,
      reportPath: null,
      skipped: false,
      skipReason: null,
    };
  }

  const structuralOk = structuralValidationPass(report);
  const { status, failureReason } = classifyVideoStatus(report, structuralOk);
  const ocr = countUnresolvedOcr(report);
  const coveragePct =
    report.catalog.expectedPlayCount > 0
      ? (report.catalog.detectedUniquePlays / report.catalog.expectedPlayCount) *
        100
      : 0;

  let checklistPath: string | null = null;
  if (status === "NEEDS_SUPPLEMENTS") {
    checklistPath = join(input.stagingRoot, "RECAPTURE_CHECKLIST.md");
    writeRecaptureChecklist({
      displayName: input.resolved.playbookDisplayName,
      detected: report.catalog.detectedUniquePlays,
      expected: report.catalog.expectedPlayCount,
      formationCoverage: report.formationCoverage,
      outPath: checklistPath,
    });
    checklistPath = relative(SIDELINE_ROOT, checklistPath);
  }

  writeFileSync(
    reportPath,
    `${JSON.stringify(
      enhanceReport(report, {
        status,
        failureReason,
        structuralValidation: structuralOk ? "PASS" : "FAIL",
        checklistPath,
      }),
      null,
      2,
    )}\n`,
    "utf8",
  );

  const sameGeometryAsOffense =
    report.frameWidth === OBS_1920x1080_TOP_BAND.frameWidth &&
    report.frameHeight === OBS_1920x1080_TOP_BAND.frameHeight &&
    report.cropProfileId === OBS_1920x1080_TOP_BAND.id;

  return {
    playbook: input.resolved.playbookDisplayName,
    playbookSlug: input.resolved.playbookSlug,
    sourceFilename: input.resolved.basename,
    sourcePath: input.resolved.videoPath,
    stagingRoot: relStaging,
    status,
    failureReason,
    expected: report.catalog.expectedPlayCount,
    captured: report.catalog.detectedUniquePlays,
    coveragePct,
    missing: report.catalog.missingCatalogPlays.length,
    incompleteFormations: report.incompleteFormations,
    stableScreens: report.acceptedPlayScreens,
    cardsExtracted: report.playCardsExtracted,
    duplicateIdentitiesCollapsed: report.duplicateCards,
    unresolvedFormationOcr: ocr.unresolvedFormationOcr,
    unresolvedPlayOcr: ocr.unresolvedPlayOcr,
    catalogMismatches: ocr.catalogMismatches,
    invalidCards: ocr.invalidCards,
    structuralValidation: structuralOk ? "PASS" : "FAIL",
    cropProfileId: report.cropProfileId,
    frameWidth: report.frameWidth,
    frameHeight: report.frameHeight,
    sameGeometryAsOffense,
    checklistPath,
    recaptureQueuePath: existsSync(recaptureQueuePath)
      ? relative(SIDELINE_ROOT, recaptureQueuePath)
      : null,
    reportPath: relative(SIDELINE_ROOT, reportPath),
    skipped: false,
    skipReason: null,
  };
}

function writeCombinedRecaptureChecklist(
  side: VideoSideOfBall,
  gameVersion: string,
  books: VideoBatchBookResult[],
): string {
  const needs = books
    .filter((b) => b.status === "NEEDS_SUPPLEMENTS")
    .sort(
      (a, b) =>
        (a.missing ?? 0) - (b.missing ?? 0) ||
        a.playbook.localeCompare(b.playbook),
    );

  const sideLabel = side === "defense" ? "Defensive" : "Offensive";
  const lines: string[] = [];
  lines.push(`# Remaining ${sideLabel} Capture Queue`);
  lines.push("");
  lines.push(
    "| Playbook | Coverage | Missing | Incomplete Formations | Status |",
  );
  lines.push("|---|---:|---:|---:|---|");
  for (const row of needs) {
    const pct =
      row.expected && row.expected > 0
        ? ` (${((row.captured ?? 0) / row.expected * 100).toFixed(1)}%)`
        : "";
    lines.push(
      `| ${row.playbook} | ${row.captured ?? "—"} / ${row.expected ?? "—"}${pct} | ${row.missing ?? "—"} | ${row.incompleteFormations ?? "—"} | ${row.status} |`,
    );
  }
  lines.push("");
  lines.push(
    "Capture any screen containing a listed play; duplicates of already-captured identities are ignored.",
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const row of needs) {
    lines.push(`## ${row.playbook}`);
    lines.push("");
    lines.push(
      `Coverage: ${row.captured ?? 0} / ${row.expected ?? 0}` +
        (row.coveragePct != null ? ` (${row.coveragePct.toFixed(1)}%)` : ""),
    );
    lines.push(`Missing: ${row.missing ?? 0}`);
    lines.push(`Incomplete formations: ${row.incompleteFormations ?? 0}`);
    lines.push("");
    const report = row.reportPath
      ? (JSON.parse(
          readFileSync(join(SIDELINE_ROOT, row.reportPath), "utf8"),
        ) as VideoPrepareReport)
      : null;
    const incomplete =
      report?.formationCoverage.filter((f) => f.missingPlays.length > 0) ?? [];
    for (const formation of incomplete) {
      lines.push(`### ${formation.formation}`);
      lines.push("");
      lines.push(`Missing: ${formation.missingPlays.length}`);
      lines.push("");
      for (const play of formation.missingPlays) {
        lines.push(`- [ ] ${play}`);
      }
      lines.push("");
    }
  }

  const outPath = join(
    VIDEO_STAGING_ROOT,
    gameVersion,
    side,
    "RECAPTURE_CHECKLIST.md",
  );
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${lines.join("\n").trimEnd()}\n`, "utf8");
  return relative(SIDELINE_ROOT, outPath);
}

function sortBooks(books: VideoBatchBookResult[]): VideoBatchBookResult[] {
  const rank = (s: VideoPlaybookStatus) =>
    s === "READY_TO_PUBLISH" ? 0 : s === "NEEDS_SUPPLEMENTS" ? 1 : 2;
  return [...books].sort((a, b) => {
    const dr = rank(a.status) - rank(b.status);
    if (dr !== 0) return dr;
    if (a.status === "NEEDS_SUPPLEMENTS") {
      return (a.missing ?? 0) - (b.missing ?? 0);
    }
    return a.playbook.localeCompare(b.playbook);
  });
}

export async function runVideoBatch(options: {
  side: VideoSideOfBall;
  force?: boolean;
  pilotOnly?: boolean;
  dryRun?: boolean;
  stamp?: string;
}): Promise<{
  books: VideoBatchBookResult[];
  combinedChecklistPath: string | null;
  batchReportPath: string;
  pilot: VideoBatchBookResult | null;
}> {
  const stamp =
    options.stamp ??
    new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, "")
      .slice(0, 14);
  mkdirSync(BATCH_LOG_ROOT, { recursive: true });

  const sources = discoverVideoSources(options.side);
  const books: VideoBatchBookResult[] = [];
  let pilot: VideoBatchBookResult | null = null;

  console.log(`${options.side.toUpperCase()} VIDEO BATCH`);
  console.log(`Sources discovered: ${sources.length}`);
  console.log(`Force: ${options.force ? "yes" : "no"}`);
  console.log(`Pilot only: ${options.pilotOnly ? "yes" : "no"}`);
  console.log("");

  const toProcess = options.pilotOnly ? sources.slice(0, 1) : sources;

  for (const videoPath of toProcess) {
    console.log("─".repeat(64));
    console.log(`Processing ${videoPath}`);

    try {
      const resolved = resolveVideoPlaybook(videoPath);
      printResolvedVideoSource(resolved);
      const stagingRoot = stagingRootFor(resolved);

      if (options.dryRun) {
        books.push({
          playbook: resolved.playbookDisplayName,
          playbookSlug: resolved.playbookSlug,
          sourceFilename: resolved.basename,
          sourcePath: videoPath,
          stagingRoot: relative(SIDELINE_ROOT, stagingRoot),
          status: "FAILED",
          failureReason: null,
          expected: null,
          captured: null,
          coveragePct: null,
          missing: null,
          incompleteFormations: null,
          stableScreens: null,
          cardsExtracted: null,
          duplicateIdentitiesCollapsed: null,
          unresolvedFormationOcr: null,
          unresolvedPlayOcr: null,
          catalogMismatches: null,
          invalidCards: null,
          structuralValidation: null,
          cropProfileId: null,
          frameWidth: null,
          frameHeight: null,
          sameGeometryAsOffense: null,
          checklistPath: null,
          recaptureQueuePath: null,
          reportPath: null,
          skipped: true,
          skipReason: "dry-run",
        });
        continue;
      }

      const skip = shouldSkipVideo(stagingRoot, options.force ?? false);
      if (skip.skip) {
        console.log(`  SKIPPED: ${skip.reason}`);
        const prior = loadReport(stagingRoot);
        const priorRaw = existsSync(join(stagingRoot, "report.json"))
          ? (JSON.parse(
              readFileSync(join(stagingRoot, "report.json"), "utf8"),
            ) as Record<string, unknown>)
          : null;
        books.push(
          postProcessBook({ resolved, stagingRoot }) ??
            ({
              playbook: resolved.playbookDisplayName,
              playbookSlug: resolved.playbookSlug,
              sourceFilename: resolved.basename,
              sourcePath: videoPath,
              stagingRoot: relative(SIDELINE_ROOT, stagingRoot),
              status:
                (priorRaw?.batchStatus as VideoPlaybookStatus) ??
                "NEEDS_SUPPLEMENTS",
              failureReason: null,
              expected: prior?.catalog.expectedPlayCount ?? null,
              captured: prior?.catalog.detectedUniquePlays ?? null,
              coveragePct: prior
                ? (prior.catalog.detectedUniquePlays /
                    Math.max(1, prior.catalog.expectedPlayCount)) *
                  100
                : null,
              missing: prior?.catalog.missingCatalogPlays.length ?? null,
              incompleteFormations: prior?.incompleteFormations ?? null,
              stableScreens: prior?.acceptedPlayScreens ?? null,
              cardsExtracted: prior?.playCardsExtracted ?? null,
              duplicateIdentitiesCollapsed: prior?.duplicateCards ?? null,
              unresolvedFormationOcr: null,
              unresolvedPlayOcr: null,
              catalogMismatches: null,
              invalidCards: null,
              structuralValidation: null,
              cropProfileId: prior?.cropProfileId ?? null,
              frameWidth: prior?.frameWidth ?? null,
              frameHeight: prior?.frameHeight ?? null,
              sameGeometryAsOffense: null,
              checklistPath: null,
              recaptureQueuePath: null,
              reportPath: join(stagingRoot, "report.json"),
              skipped: true,
              skipReason: skip.reason,
            } as VideoBatchBookResult),
        );
        continue;
      }

      const logPath = join(
        BATCH_LOG_ROOT,
        `video-${resolved.playbookSlug}-${stamp}.log`,
      );
      console.log(`  Running video extraction… (log: ${logPath})`);
      const exitCode = runPrepareVideo(videoPath, logPath);
      if (exitCode !== 0) {
        books.push(
          postProcessBook({
            resolved,
            stagingRoot,
            structuralFailure: `Video extraction exited with code ${exitCode}`,
          }),
        );
        continue;
      }

      const result = postProcessBook({ resolved, stagingRoot });
      books.push(result);
      if (!pilot) pilot = result;
      console.log(
        `  ${result.status} — ${result.captured}/${result.expected} (${result.coveragePct?.toFixed(1)}%) missing=${result.missing}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  FAILED: ${message}`);
      books.push({
        playbook: videoPath,
        playbookSlug: videoPath,
        sourceFilename: videoPath.split("/").pop() ?? videoPath,
        sourcePath: videoPath,
        stagingRoot: "",
        status: "FAILED",
        failureReason: message,
        expected: null,
        captured: null,
        coveragePct: null,
        missing: null,
        incompleteFormations: null,
        stableScreens: null,
        cardsExtracted: null,
        duplicateIdentitiesCollapsed: null,
        unresolvedFormationOcr: null,
        unresolvedPlayOcr: null,
        catalogMismatches: null,
        invalidCards: null,
        structuralValidation: null,
        cropProfileId: null,
        frameWidth: null,
        frameHeight: null,
        sameGeometryAsOffense: null,
        checklistPath: null,
        recaptureQueuePath: null,
        reportPath: null,
        skipped: false,
        skipReason: null,
      });
    }
  }

  const gameVersion = books.find((b) => b.stagingRoot)?.stagingRoot
    ? "cfb27"
    : "cfb27";
  const combinedChecklistPath =
    options.dryRun || options.pilotOnly
      ? null
      : writeCombinedRecaptureChecklist(options.side, gameVersion, books);

  const batchReportPath = join(
    BATCH_LOG_ROOT,
    `${options.side}-run-${stamp}-report.json`,
  );
  writeFileSync(
    batchReportPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        side: options.side,
        stamp,
        pilotOnly: options.pilotOnly ?? false,
        books: sortBooks(books),
        combinedChecklistPath,
        counts: {
          discovered: sources.length,
          processed: books.filter((b) => !b.skipped).length,
          skipped: books.filter((b) => b.skipped).length,
          ready: books.filter((b) => b.status === "READY_TO_PUBLISH").length,
          needs: books.filter((b) => b.status === "NEEDS_SUPPLEMENTS").length,
          failed: books.filter((b) => b.status === "FAILED").length,
        },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return {
    books: sortBooks(books),
    combinedChecklistPath,
    batchReportPath: relative(SIDELINE_ROOT, batchReportPath),
    pilot,
  };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (hasFlag(argv, "--help") || hasFlag(argv, "-h")) {
    console.log(`Usage:
  npm run play-art:video-batch -- --side=defense [--force] [--pilot-only] [--dry-run]

Processes OBS source videos for one side. Continues after failures.
Does NOT publish or modify offensive staging when --side=defense.
`);
    return;
  }

  const sideRaw = readFlag(argv, "--side") ?? "defense";
  if (sideRaw !== "offense" && sideRaw !== "defense") {
    throw new Error(`Invalid --side=${sideRaw}. Use offense or defense.`);
  }

  await runVideoBatch({
    side: sideRaw as VideoSideOfBall,
    force: hasFlag(argv, "--force"),
    pilotOnly: hasFlag(argv, "--pilot-only"),
    dryRun: hasFlag(argv, "--dry-run"),
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
