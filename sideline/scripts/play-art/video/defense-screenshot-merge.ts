/**
 * Defensive screenshot merge batch.
 *
 * Discovers source-screenshots/cfb27/defense/{slug}/, merges into existing
 * video-staging via processManualSupplements, diagnoses remaining exceptions,
 * writes checklists + combined final report. Does NOT publish.
 *
 *   npm run play-art:defense-screenshot-merge
 *   npm run play-art:defense-screenshot-merge -- --force
 *   npm run play-art:defense-screenshot-merge -- --slug=3-3-5-tite
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePlayName } from "../../../lib/utils";
import { importSeedModule, referenceFromSeed } from "../build-reference";
import {
  processManualSupplements,
  type ManualSupplementReport,
} from "./process-supplements";
import { listScreenshotImages, fingerprintScreenshotFolder } from "./process-screenshot-screens";
import { resolveScreenshotNamespace } from "./resolve-screenshot-namespace";
import type { ResolvedSupplementNamespace } from "./resolve-supplement-namespace";
import type {
  ExtractedVideoCard,
  FormationCoverageRow,
  VideoPrepareReport,
} from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLAY_ART_ROOT = join(__dirname, "..");
const SIDELINE_ROOT = join(PLAY_ART_ROOT, "..", "..");
const SOURCE_ROOT = join(PLAY_ART_ROOT, "source-screenshots", "cfb27", "defense");
const VIDEO_STAGING = join(PLAY_ART_ROOT, "video-staging", "cfb27", "defense");
const BATCH_LOG_ROOT = join(PLAY_ART_ROOT, "video-staging", "_batch-logs");

export type IssueReason =
  | "NOT_CAPTURED"
  | "OCR_UNRESOLVED"
  | "CATALOG_MISMATCH"
  | "INVALID_CAPTURE"
  | "MISSING_ART_CROP"
  | "DUPLICATE_ONLY";

export type BookStatus = "READY_TO_PUBLISH" | "NEEDS_SUPPLEMENTS" | "FAILED";

export type MissingIssue = {
  formation: string;
  play: string;
  reason: IssueReason;
};

export type DefenseMergeBookResult = {
  playbook: string;
  playbookSlug: string;
  status: BookStatus;
  failureReason: string | null;
  beforeDetected: number;
  afterDetected: number;
  expected: number;
  coveragePct: number;
  missing: number;
  incompleteFormations: number;
  screenshotsFound: number;
  screenshotsAccepted: number;
  screenshotsInvalid: number;
  cardsExtracted: number;
  newIdentitiesRecovered: number;
  duplicatesIgnored: number;
  unresolvedFormationOcr: number;
  unresolvedPlayOcr: number;
  catalogMismatches: number;
  invalidCards: number;
  missingArtCrops: number;
  invalidCropGeometry: number;
  structuralValidation: "PASS" | "FAIL";
  issues: MissingIssue[];
  issueBreakdown: Record<IssueReason, number>;
  checklistPath: string | null;
  supplementReportPath: string | null;
  stagingRoot: string;
  /** Combined coverage before this pass (prior supplement report). */
  passBeforeDetected: number;
  /** Identities recovered during this pass only. */
  passRecovered: number;
  /** Screenshots added since prior source fingerprint snapshot. */
  newScreenshotsAdded: number;
  sourceMaterialChanged: boolean;
};

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name);
}

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

function discoverDefenseScreenshotFolders(): string[] {
  if (!existsSync(SOURCE_ROOT)) return [];
  return readdirSync(SOURCE_ROOT)
    .filter((name) => !name.startsWith("."))
    .map((name) => join(SOURCE_ROOT, name))
    .filter((p) => statSync(p).isDirectory())
    .sort((a, b) => a.localeCompare(b));
}

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

function loadPriorCombinedCoverage(stagingRoot: string): number | null {
  const path = join(stagingRoot, "supplement-report.json");
  if (!existsSync(path)) return null;
  const raw = JSON.parse(readFileSync(path, "utf8")) as {
    combinedCoverage?: { detected?: number };
  };
  return raw.combinedCoverage?.detected ?? null;
}

function loadPriorSourceFingerprint(
  stagingRoot: string,
): ReturnType<typeof fingerprintScreenshotFolder> {
  const path = join(stagingRoot, "screenshot-source-fingerprint.json");
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, "utf8")) as ReturnType<
    typeof fingerprintScreenshotFolder
  >;
}

function saveSourceFingerprint(
  stagingRoot: string,
  fp: ReturnType<typeof fingerprintScreenshotFolder>,
): void {
  writeFileSync(
    join(stagingRoot, "screenshot-source-fingerprint.json"),
    `${JSON.stringify(fp, null, 2)}\n`,
    "utf8",
  );
}

function countNewScreenshots(
  prior: ReturnType<typeof fingerprintScreenshotFolder>,
  current: ReturnType<typeof fingerprintScreenshotFolder>,
): number {
  const priorNames = new Set(prior.map((e) => e.name));
  return current.filter((e) => !priorNames.has(e.name)).length;
}

function sourceMaterialChanged(
  prior: ReturnType<typeof fingerprintScreenshotFolder>,
  current: ReturnType<typeof fingerprintScreenshotFolder>,
): boolean {
  if (prior.length !== current.length) return true;
  const priorByName = new Map(prior.map((e) => [e.name, e] as const));
  for (const entry of current) {
    const old = priorByName.get(entry.name);
    if (!old || old.size !== entry.size || old.mtimeMs !== entry.mtimeMs) {
      return true;
    }
  }
  return false;
}

function loadVideoReport(stagingRoot: string): VideoPrepareReport | null {
  const path = join(stagingRoot, "report.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as VideoPrepareReport;
}

/**
 * Classify each still-missing catalog identity using observed cards.
 * Prefer OCR_UNRESOLVED / CATALOG_MISMATCH evidence over NOT_CAPTURED.
 */
export function diagnoseMissingIssues(input: {
  missing: Array<{ formation: string; play: string }>;
  allCards: ExtractedVideoCard[];
  formationCoverage: FormationCoverageRow[];
}): MissingIssue[] {
  const issues: MissingIssue[] = [];
  const coverageByFormation = new Map(
    input.formationCoverage.map((r) => [r.formation, r] as const),
  );

  for (const miss of input.missing) {
    const formationCards = input.allCards.filter(
      (c) =>
        !c.emptySlot &&
        !c.screenRejected &&
        c.matchedFormation === miss.formation,
    );
    const playNorm = normalizePlayName(miss.play);

    // Resolved identity whose art crop is gone (should be rare after merge).
    const resolvedMissingCrop = formationCards.find(
      (c) =>
        c.catalogValid &&
        c.matchedPlay &&
        normalizePlayName(c.matchedPlay) === playNorm &&
        (!c.artCropPath || !existsSync(c.artCropPath)),
    );
    if (resolvedMissingCrop) {
      issues.push({
        formation: miss.formation,
        play: miss.play,
        reason: "MISSING_ART_CROP",
      });
      continue;
    }

    // Formation-matched cards with OCR that failed play resolution and
    // uniquely (or strongly) points at this missing play.
    const unresolvedInFormation = formationCards.filter(
      (c) =>
        !c.catalogValid &&
        c.formationMatchConfidence !== "none" &&
        (c.supplementClass === "OCR_UNRESOLVED" ||
          c.playMatchConfidence === "none" ||
          c.playMatchConfidence === "skipped"),
    );

    const strongOcrHits = unresolvedInFormation.filter((c) => {
      if (!c.playNameOcr || !c.playNameOcr.trim()) return false;
      const ocr = normalizePlayName(c.playNameOcr);
      if (!ocr) return false;
      if (ocr === playNorm) return true;
      if (ocr.replace(/\s+/g, "") === playNorm.replace(/\s+/g, "")) return true;
      // Substantial fragment: OCR is a proper core of the catalog name
      // (e.g. "EDGE PINCH" ⊂ "1 EDGE PINCH") — reject tiny stems like "COVER".
      if (ocr.length < Math.min(8, playNorm.length)) return false;
      if (playNorm.startsWith(ocr) || ocr.startsWith(playNorm)) return true;
      if (playNorm.endsWith(ocr) && ocr.length >= 8) return true;
      if (playNorm.includes(` ${ocr}`) && ocr.length >= 8) return true;
      if (playNorm.includes(ocr) && ocr.length >= 10) return true;
      return false;
    });

    // Unique among still-missing plays in this formation?
    const otherMissingInFormation = input.missing
      .filter((m) => m.formation === miss.formation && m.play !== miss.play)
      .map((m) => normalizePlayName(m.play));

    const uniqueStrong = strongOcrHits.filter((c) => {
      const ocr = normalizePlayName(c.playNameOcr!);
      const alsoMatchesOther = otherMissingInFormation.some(
        (other) =>
          ocr === other ||
          ocr.replace(/\s+/g, "") === other.replace(/\s+/g, "") ||
          (ocr.length >= 8 && (other.startsWith(ocr) || other.includes(ocr))),
      );
      return !alsoMatchesOther;
    });

    if (uniqueStrong.length > 0 || strongOcrHits.some((c) => normalizePlayName(c.playNameOcr!) === playNorm)) {
      issues.push({
        formation: miss.formation,
        play: miss.play,
        reason: "OCR_UNRESOLVED",
      });
      continue;
    }

    const mismatch = formationCards.find((c) => {
      if (c.catalogValid) return false;
      if (c.supplementClass !== "CATALOG_MISMATCH" && c.formationMatchConfidence === "none") {
        return false;
      }
      if (!c.playNameOcr) return false;
      const ocr = normalizePlayName(c.playNameOcr);
      return (
        ocr === playNorm ||
        ocr.replace(/\s+/g, "") === playNorm.replace(/\s+/g, "")
      );
    });
    if (mismatch) {
      issues.push({
        formation: miss.formation,
        play: miss.play,
        reason: "CATALOG_MISMATCH",
      });
      continue;
    }

    const invalid = formationCards.find(
      (c) =>
        c.supplementClass === "INVALID_SCREEN" ||
        c.rejectReason != null ||
        (!c.artCropPath && !c.catalogValid),
    );
    if (invalid && formationCards.every((c) => !c.catalogValid)) {
      issues.push({
        formation: miss.formation,
        play: miss.play,
        reason: "INVALID_CAPTURE",
      });
      continue;
    }

    const row = coverageByFormation.get(miss.formation);
    const onlyDuplicates =
      row != null &&
      row.catalogValidUniquePlays > 0 &&
      row.missingCatalogPlayCount > 0 &&
      formationCards.every(
        (c) =>
          c.catalogValid ||
          c.supplementClass === "DUPLICATE_EXISTING" ||
          c.supplementClass === "EMPTY_SLOT",
      ) &&
      formationCards.some((c) => c.catalogValid);
    // DUPLICATE_ONLY: we saw cards for the formation but none resolve to this play
    // and there is no OCR evidence pointing at it — still treat as NOT_CAPTURED
    // unless every observed card is a duplicate of already-owned identities
    // with zero unresolved OCR in formation.
    if (
      onlyDuplicates &&
      row.unresolvedCardCount === 0 &&
      formationCards.length > 0
    ) {
      issues.push({
        formation: miss.formation,
        play: miss.play,
        reason: "DUPLICATE_ONLY",
      });
      continue;
    }

    issues.push({
      formation: miss.formation,
      play: miss.play,
      reason: "NOT_CAPTURED",
    });
  }

  return issues;
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

function classifyStatus(input: {
  expected: number;
  detected: number;
  missing: number;
  issues: MissingIssue[];
  structuralOk: boolean;
  failureReason: string | null;
}): { status: BookStatus; failureReason: string | null } {
  if (input.failureReason) {
    return { status: "FAILED", failureReason: input.failureReason };
  }
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

function structuralOkFromCards(cards: ExtractedVideoCard[]): {
  ok: boolean;
  missingArtCrops: number;
  invalidCropGeometry: number;
} {
  const canonical = cards.filter(
    (c) => c.catalogValid && !c.emptySlot && !c.screenRejected,
  );
  let missingArtCrops = 0;
  for (const card of canonical) {
    if (!card.artCropPath || !existsSync(card.artCropPath)) {
      missingArtCrops += 1;
    }
  }
  return {
    ok: missingArtCrops === 0,
    missingArtCrops,
    invalidCropGeometry: 0,
  };
}

function updateVideoReportBatchStatus(input: {
  stagingRoot: string;
  status: BookStatus;
  failureReason: string | null;
  structuralValidation: "PASS" | "FAIL";
  checklistPath: string | null;
  afterDetected: number;
  expected: number;
}): void {
  const reportPath = join(input.stagingRoot, "report.json");
  if (!existsSync(reportPath)) return;
  const report = JSON.parse(readFileSync(reportPath, "utf8")) as Record<
    string,
    unknown
  >;
  report.batchStatus = input.status;
  report.batchFailureReason = input.failureReason;
  report.structuralValidation = input.structuralValidation;
  report.checklistPath = input.checklistPath;
  report.combinedDetectedAfterScreenshots = input.afterDetected;
  report.combinedExpected = input.expected;
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function processOneBook(input: {
  folderPath: string;
  force: boolean;
}): Promise<DefenseMergeBookResult> {
  const nsShot = resolveScreenshotNamespace(input.folderPath);
  const ns: ResolvedSupplementNamespace = {
    folderPath: nsShot.folderPath,
    gameVersion: nsShot.gameVersion,
    side: nsShot.side,
    playbookSlug: nsShot.playbookSlug,
    playbookDisplayName: nsShot.playbookDisplayName,
    seedSlug: nsShot.seedSlug,
    seedPath: nsShot.seedPath,
  };

  const stagingRoot = join(
    PLAY_ART_ROOT,
    "video-staging",
    ns.gameVersion,
    ns.side,
    ns.playbookSlug,
  );
  const relStaging = relative(SIDELINE_ROOT, stagingRoot);
  const videoReport = loadVideoReport(stagingRoot);
  const videoOnlyDetected = videoReport?.catalog.detectedUniquePlays ?? 0;
  const passBeforeDetected =
    loadPriorCombinedCoverage(stagingRoot) ?? videoOnlyDetected;
  const expectedFromVideo = videoReport?.catalog.expectedPlayCount ?? 0;
  const priorFingerprint = loadPriorSourceFingerprint(stagingRoot);
  const currentFingerprint = fingerprintScreenshotFolder(ns.folderPath);
  const newScreenshotsAdded = countNewScreenshots(
    priorFingerprint,
    currentFingerprint,
  );
  const materialChanged = sourceMaterialChanged(
    priorFingerprint,
    currentFingerprint,
  );

  const images = listScreenshotImages(ns.folderPath);

  // Empty folder: keep video-only state, diagnose remaining from video report.
  if (images.length === 0) {
    if (!videoReport) {
      return {
        playbook: ns.playbookDisplayName,
        playbookSlug: ns.playbookSlug,
        status: "FAILED",
        failureReason: "No video staging report and no screenshots",
        beforeDetected: 0,
        afterDetected: 0,
        expected: 0,
        coveragePct: 0,
        missing: 0,
        incompleteFormations: 0,
        screenshotsFound: 0,
        screenshotsAccepted: 0,
        screenshotsInvalid: 0,
        cardsExtracted: 0,
        newIdentitiesRecovered: 0,
        duplicatesIgnored: 0,
        unresolvedFormationOcr: 0,
        unresolvedPlayOcr: 0,
        catalogMismatches: 0,
        invalidCards: 0,
        missingArtCrops: 0,
        invalidCropGeometry: 0,
        structuralValidation: "FAIL",
        issues: [],
        issueBreakdown: emptyBreakdown(),
        checklistPath: null,
        supplementReportPath: null,
        stagingRoot: relStaging,
        passBeforeDetected: 0,
        passRecovered: 0,
        newScreenshotsAdded: 0,
        sourceMaterialChanged: false,
      };
    }

    const missing = videoReport.catalog.missingCatalogPlays;
    const issues = diagnoseMissingIssues({
      missing,
      allCards: videoReport.cards,
      formationCoverage: videoReport.formationCoverage,
    });
    const breakdown = emptyBreakdown();
    for (const i of issues) breakdown[i.reason] += 1;
    const struct = structuralOkFromCards(
      videoReport.cards.filter((c) => c.catalogValid),
    );
    const { status, failureReason } = classifyStatus({
      expected: expectedFromVideo,
      detected: passBeforeDetected,
      missing: missing.length,
      issues,
      structuralOk: struct.ok,
      failureReason: null,
    });
    let checklistPath: string | null = null;
    if (status === "NEEDS_SUPPLEMENTS") {
      checklistPath = join(stagingRoot, "RECAPTURE_CHECKLIST.md");
      writeExceptionChecklist({
        displayName: ns.playbookDisplayName,
        detected: passBeforeDetected,
        expected: expectedFromVideo,
        issues,
        incompleteFormations: videoReport.incompleteFormations,
        outPath: checklistPath,
      });
      checklistPath = relative(SIDELINE_ROOT, checklistPath);
    }
    updateVideoReportBatchStatus({
      stagingRoot,
      status,
      failureReason,
      structuralValidation: struct.ok ? "PASS" : "FAIL",
      checklistPath,
      afterDetected: passBeforeDetected,
      expected: expectedFromVideo,
    });
    return {
      playbook: ns.playbookDisplayName,
      playbookSlug: ns.playbookSlug,
      status,
      failureReason,
      beforeDetected: passBeforeDetected,
      afterDetected: passBeforeDetected,
      expected: expectedFromVideo,
      coveragePct:
        expectedFromVideo > 0
          ? (passBeforeDetected / expectedFromVideo) * 100
          : 0,
      missing: missing.length,
      incompleteFormations: videoReport.incompleteFormations,
      screenshotsFound: 0,
      screenshotsAccepted: 0,
      screenshotsInvalid: 0,
      cardsExtracted: 0,
      newIdentitiesRecovered: 0,
      duplicatesIgnored: 0,
      unresolvedFormationOcr: 0,
      unresolvedPlayOcr: 0,
      catalogMismatches: 0,
      invalidCards: 0,
      missingArtCrops: struct.missingArtCrops,
      invalidCropGeometry: 0,
      structuralValidation: struct.ok ? "PASS" : "FAIL",
      issues,
      issueBreakdown: breakdown,
      checklistPath,
      supplementReportPath: null,
      stagingRoot: relStaging,
      passBeforeDetected,
      passRecovered: 0,
      newScreenshotsAdded: 0,
      sourceMaterialChanged: false,
    };
  }

  const seed = await importSeedModule(ns.seedSlug);
  const reference = referenceFromSeed(seed);
  if (
    reference.gameVersion !== ns.gameVersion ||
    reference.sideOfBall !== ns.side
  ) {
    throw new Error(
      `Reference namespace mismatch for ${ns.playbookSlug}: ` +
        `${reference.gameVersion}/${reference.sideOfBall} vs ${ns.gameVersion}/${ns.side}`,
    );
  }

  const supplement: ManualSupplementReport = await processManualSupplements({
    folderPath: ns.folderPath,
    playArtRoot: PLAY_ART_ROOT,
    reference,
    namespace: ns,
  });

  const missing = supplement.combinedFormationCoverage.flatMap((row) =>
    row.missingPlays.map((play) => ({ formation: row.formation, play })),
  );
  // Prefer catalog missing list for exact set.
  const catalogMissing = compareMissingFromCombined(supplement);
  const issues = diagnoseMissingIssues({
    missing: catalogMissing,
    allCards: [...supplement.videoOnlyCards, ...supplement.cards],
    formationCoverage: supplement.combinedFormationCoverage,
  });
  const breakdown = emptyBreakdown();
  for (const i of issues) breakdown[i.reason] += 1;

  const struct = structuralOkFromCards(
    supplement.combinedCards.filter((c) => c.catalogValid),
  );
  const { status, failureReason } = classifyStatus({
    expected: supplement.combinedCoverage.expected,
    detected: supplement.combinedCoverage.detected,
    missing: catalogMissing.length,
    issues,
    structuralOk: struct.ok,
    failureReason: null,
  });

  let checklistPath: string | null = null;
  if (status === "NEEDS_SUPPLEMENTS" || catalogMissing.length > 0) {
    checklistPath = join(stagingRoot, "RECAPTURE_CHECKLIST.md");
    writeExceptionChecklist({
      displayName: ns.playbookDisplayName,
      detected: supplement.combinedCoverage.detected,
      expected: supplement.combinedCoverage.expected,
      issues,
      incompleteFormations: supplement.incompleteFormations,
      outPath: checklistPath,
    });
    checklistPath = relative(SIDELINE_ROOT, checklistPath);
  } else {
    const staleChecklist = join(stagingRoot, "RECAPTURE_CHECKLIST.md");
    if (existsSync(staleChecklist)) {
      unlinkSync(staleChecklist);
    }
    checklistPath = null;
  }

  saveSourceFingerprint(stagingRoot, currentFingerprint);

  const passRecovered = Math.max(
    0,
    supplement.combinedCoverage.detected - passBeforeDetected,
  );

  // Enrich supplement report with diagnosis + status.
  const enrichedPath = join(stagingRoot, "supplement-report.json");
  const enriched = {
    ...supplement,
    batchStatus: status,
    batchFailureReason: failureReason,
    structuralValidation: struct.ok ? "PASS" : "FAIL",
    issues,
    issueBreakdown: breakdown,
    checklistPath,
  };
  writeFileSync(enrichedPath, `${JSON.stringify(enriched, null, 2)}\n`, "utf8");

  updateVideoReportBatchStatus({
    stagingRoot,
    status,
    failureReason,
    structuralValidation: struct.ok ? "PASS" : "FAIL",
    checklistPath,
    afterDetected: supplement.combinedCoverage.detected,
    expected: supplement.combinedCoverage.expected,
  });

  const unresolvedFormationOcr = supplement.cards.filter(
    (c) =>
      !c.emptySlot &&
      !c.screenRejected &&
      c.formationMatchConfidence === "none",
  ).length;
  const unresolvedPlayOcr = supplement.ocrUnresolved;
  const invalidCards = supplement.invalidScreenCards;

  return {
    playbook: ns.playbookDisplayName,
    playbookSlug: ns.playbookSlug,
    status,
    failureReason,
    beforeDetected: passBeforeDetected,
    afterDetected: supplement.combinedCoverage.detected,
    expected: supplement.combinedCoverage.expected,
    coveragePct: supplement.combinedCoverage.pct,
    missing: catalogMissing.length,
    incompleteFormations: supplement.incompleteFormations,
    screenshotsFound: supplement.screenshotsFound,
    screenshotsAccepted: supplement.screenshotsAccepted,
    screenshotsInvalid: supplement.screenshotsInvalid,
    cardsExtracted: supplement.cardsProcessed,
    newIdentitiesRecovered: supplement.newMissingPlaysRecovered,
    duplicatesIgnored: supplement.duplicates,
    unresolvedFormationOcr,
    unresolvedPlayOcr,
    catalogMismatches: supplement.catalogMismatches,
    invalidCards,
    missingArtCrops: struct.missingArtCrops,
    invalidCropGeometry: 0,
    structuralValidation: struct.ok ? "PASS" : "FAIL",
    issues,
    issueBreakdown: breakdown,
    checklistPath,
    supplementReportPath: relative(SIDELINE_ROOT, enrichedPath),
    stagingRoot: relStaging,
    passBeforeDetected,
    passRecovered,
    newScreenshotsAdded,
    sourceMaterialChanged: materialChanged,
  };
}

function compareMissingFromCombined(
  report: ManualSupplementReport,
): Array<{ formation: string; play: string }> {
  // Rebuild from formation coverage (authoritative after merge).
  return report.combinedFormationCoverage.flatMap((row) =>
    row.missingPlays.map((play) => ({ formation: row.formation, play })),
  );
}

function writeCombinedFinalReport(books: DefenseMergeBookResult[]): string {
  const sorted = [...books].sort((a, b) => {
    const rank = (s: BookStatus) =>
      s === "READY_TO_PUBLISH" ? 0 : s === "NEEDS_SUPPLEMENTS" ? 1 : 2;
    const dr = rank(a.status) - rank(b.status);
    if (dr !== 0) return dr;
    if (a.status === "NEEDS_SUPPLEMENTS") return a.missing - b.missing;
    return a.playbook.localeCompare(b.playbook);
  });

  const lines: string[] = [];
  lines.push("# Defensive Screenshot Processing — Final Coverage");
  lines.push("");
  lines.push(
    "| Playbook | Expected | Captured | Coverage | Missing | Status |",
  );
  lines.push("|---|---:|---:|---:|---:|---|");
  for (const b of sorted) {
    lines.push(
      `| ${b.playbook} | ${b.expected} | ${b.afterDetected} | ${b.coveragePct.toFixed(1)}% | ${b.missing} | ${b.status} |`,
    );
  }
  lines.push("");

  const ready = sorted.filter((b) => b.status === "READY_TO_PUBLISH");
  lines.push("## Ready to Publish");
  lines.push("");
  if (ready.length === 0) {
    lines.push("_None._");
    lines.push("");
  } else {
    for (const b of ready) {
      lines.push(`- **${b.playbook}** — ${b.afterDetected}/${b.expected} (100%), structural ${b.structuralValidation}`);
    }
    lines.push("");
  }

  const needs = sorted.filter((b) => b.status !== "READY_TO_PUBLISH");
  lines.push("## Still Needs Attention");
  lines.push("");
  if (needs.length === 0) {
    lines.push("_None — all defensive books are complete._");
    lines.push("");
  } else {
    for (const b of needs) {
      lines.push(`### ${b.playbook}`);
      lines.push("");
      lines.push(
        `Coverage: ${b.afterDetected} / ${b.expected} (${b.coveragePct.toFixed(1)}%)`,
      );
      lines.push(`Missing: ${b.missing}`);
      lines.push(`Incomplete formations: ${b.incompleteFormations}`);
      lines.push(`Status: ${b.status}`);
      if (b.failureReason) lines.push(`Failure: ${b.failureReason}`);
      lines.push("");
      lines.push("Issue breakdown:");
      lines.push("");
      for (const reason of Object.keys(b.issueBreakdown) as IssueReason[]) {
        lines.push(`- ${reason}: ${b.issueBreakdown[reason]}`);
      }
      lines.push("");
      if (b.issues.length > 0) {
        lines.push("| Formation | Play | Reason |");
        lines.push("|---|---|---|");
        for (const issue of b.issues) {
          lines.push(
            `| ${issue.formation} | ${issue.play} | ${issue.reason} |`,
          );
        }
        lines.push("");
      }
    }
  }

  const outPath = join(VIDEO_STAGING, "DEFENSIVE_SCREENSHOT_FINAL_COVERAGE.md");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${lines.join("\n").trimEnd()}\n`, "utf8");

  // Also refresh the operator recapture queue for incomplete books only.
  const queueLines: string[] = [];
  queueLines.push("# Remaining Defensive Capture Queue");
  queueLines.push("");
  queueLines.push(
    "| Playbook | Coverage | Missing | Incomplete Formations | Status |",
  );
  queueLines.push("|---|---:|---:|---:|---|");
  const incomplete = sorted.filter((b) => b.status === "NEEDS_SUPPLEMENTS");
  for (const b of incomplete) {
    queueLines.push(
      `| ${b.playbook} | ${b.afterDetected} / ${b.expected} (${b.coveragePct.toFixed(1)}%) | ${b.missing} | ${b.incompleteFormations} | ${b.status} |`,
    );
  }
  queueLines.push("");
  if (incomplete.length === 0) {
    queueLines.push("_All defensive books are complete. No remaining captures._");
    queueLines.push("");
  } else {
    queueLines.push("---");
    queueLines.push("");
    for (const b of incomplete) {
      queueLines.push(`## ${b.playbook}`);
      queueLines.push("");
      queueLines.push(
        `Coverage: ${b.afterDetected} / ${b.expected} (${b.coveragePct.toFixed(1)}%)`,
      );
      queueLines.push(`Missing: ${b.missing}`);
      queueLines.push(`Incomplete formations: ${b.incompleteFormations}`);
      queueLines.push("");
      const byFormation = new Map<string, MissingIssue[]>();
      for (const issue of b.issues) {
        const list = byFormation.get(issue.formation) ?? [];
        list.push(issue);
        byFormation.set(issue.formation, list);
      }
      for (const formation of [...byFormation.keys()].sort()) {
        const items = byFormation.get(formation)!;
        queueLines.push(`### ${formation}`);
        queueLines.push("");
        queueLines.push(`Missing: ${items.length}`);
        queueLines.push("");
        for (const item of items) {
          queueLines.push(`- [ ] ${item.play} — ${item.reason}`);
        }
        queueLines.push("");
      }
    }
  }
  writeFileSync(
    join(VIDEO_STAGING, "RECAPTURE_CHECKLIST.md"),
    `${queueLines.join("\n").trimEnd()}\n`,
    "utf8",
  );

  return relative(SIDELINE_ROOT, outPath);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (hasFlag(argv, "--help") || hasFlag(argv, "-h")) {
    console.log(`Usage:
  npm run play-art:defense-screenshot-merge [--force] [--slug=<slug>] [--dry-run]

Merges source-screenshots/cfb27/defense/* into video-staging via existing
supplement pipeline. Diagnoses remaining exceptions. Does NOT publish.
`);
    return;
  }

  const force = hasFlag(argv, "--force");
  const dryRun = hasFlag(argv, "--dry-run");
  const onlySlug = readFlag(argv, "--slug")?.toLowerCase();
  void force;

  let folders = discoverDefenseScreenshotFolders();
  if (onlySlug) {
    folders = folders.filter((f) => f.endsWith(`/${onlySlug}`));
  }

  console.log("DEFENSIVE SCREENSHOT MERGE");
  console.log(`Source root: ${SOURCE_ROOT}`);
  console.log(`Playbooks discovered: ${folders.length}`);
  console.log("");

  const results: DefenseMergeBookResult[] = [];
  const stamp = new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, "")
    .slice(0, 14);

  for (const folder of folders) {
    const label = folder.split("/").pop() ?? folder;
    console.log("─".repeat(64));
    console.log(`Processing ${label}`);
    try {
      if (dryRun) {
        const ns = resolveScreenshotNamespace(folder);
        const n = listScreenshotImages(folder).length;
        console.log(
          `  Dry-run OK — ${ns.playbookDisplayName} (${n} screenshots, seed ${ns.seedSlug})`,
        );
        continue;
      }
      const result = await processOneBook({ folderPath: folder, force });
      printSummary(result);
      results.push(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  FAILED: ${message}`);
      results.push({
        playbook: label,
        playbookSlug: label,
        status: "FAILED",
        failureReason: message,
        beforeDetected: 0,
        afterDetected: 0,
        expected: 0,
        coveragePct: 0,
        missing: 0,
        incompleteFormations: 0,
        screenshotsFound: 0,
        screenshotsAccepted: 0,
        screenshotsInvalid: 0,
        cardsExtracted: 0,
        newIdentitiesRecovered: 0,
        duplicatesIgnored: 0,
        unresolvedFormationOcr: 0,
        unresolvedPlayOcr: 0,
        catalogMismatches: 0,
        invalidCards: 0,
        missingArtCrops: 0,
        invalidCropGeometry: 0,
        structuralValidation: "FAIL",
        issues: [],
        issueBreakdown: emptyBreakdown(),
        checklistPath: null,
        supplementReportPath: null,
        stagingRoot: "",
        passBeforeDetected: 0,
        passRecovered: 0,
        newScreenshotsAdded: 0,
        sourceMaterialChanged: false,
      });
    }
  }

  if (dryRun) return;

  const combinedPath = writeCombinedFinalReport(results);
  const batchReportPath = join(
    BATCH_LOG_ROOT,
    `defense-screenshot-merge-${stamp}-report.json`,
  );
  mkdirSync(BATCH_LOG_ROOT, { recursive: true });
  writeFileSync(
    batchReportPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        stamp,
        combinedReportPath: combinedPath,
        counts: {
          books: results.length,
          screenshots: results.reduce((n, r) => n + r.screenshotsFound, 0),
          newScreenshotsAdded: results.reduce(
            (n, r) => n + r.newScreenshotsAdded,
            0,
          ),
          cards: results.reduce((n, r) => n + r.cardsExtracted, 0),
          newIdentities: results.reduce(
            (n, r) => n + r.newIdentitiesRecovered,
            0,
          ),
          passRecovered: results.reduce((n, r) => n + r.passRecovered, 0),
          duplicates: results.reduce((n, r) => n + r.duplicatesIgnored, 0),
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
  console.log("DEFENSIVE SCREENSHOT MERGE SUMMARY");
  console.log("═".repeat(64));
  console.log(
    `Ready: ${results.filter((r) => r.status === "READY_TO_PUBLISH").length}  ` +
      `Needs: ${results.filter((r) => r.status === "NEEDS_SUPPLEMENTS").length}  ` +
      `Failed: ${results.filter((r) => r.status === "FAILED").length}`,
  );
  console.log(`Combined report: ${combinedPath}`);
  console.log(`Batch JSON: ${relative(SIDELINE_ROOT, batchReportPath)}`);
  console.log("No production assets published.");
}

function printSummary(r: DefenseMergeBookResult): void {
  console.log(
    `  ${r.status} — pass before ${r.passBeforeDetected}/${r.expected} → after ${r.afterDetected}/${r.expected} ` +
      `(${r.coveragePct.toFixed(1)}%)  +${r.passRecovered} this pass  missing=${r.missing}`,
  );
  if (r.screenshotsFound > 0) {
    console.log(
      `  screenshots=${r.screenshotsFound} (+${r.newScreenshotsAdded} new) accepted=${r.screenshotsAccepted} ` +
        `cards=${r.cardsExtracted} dups=${r.duplicatesIgnored}`,
    );
  }
}

if (process.argv[1]?.endsWith("defense-screenshot-merge.ts")) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
