import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, extname, join } from "node:path";
import sharp from "sharp";
import { normalizePlayName } from "../../../lib/utils";
import {
  matchKnownFormation,
  normalizeFormationOcrText,
  ocrPlayCardHeader,
} from "../formation-ocr";
import type { PlayArtReference } from "../types";
import { cropScreenCards } from "./crop-cards";
import { OBS_1920x1080_TOP_BAND, resolveCropProfile } from "./crop-profile";
import {
  buildFormationCoverage,
  buildRecaptureQueue,
} from "./formation-coverage";
import { compareToCatalog, matchPlayInFormation } from "./ocr-and-catalog";
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
  SupplementCardClass,
  VideoPrepareReport,
  VideoSideOfBall,
} from "./types";

export type InvalidScreenshotReason =
  | "WRONG_DIMENSIONS"
  | "INVALID_CROP_PROFILE"
  | "NO_PLAY_CARDS"
  | "TRANSITION_SCREEN"
  | "FORMATION_MISMATCH"
  | "UNREADABLE_IMAGE";

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
};

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg"]);

function playIdentityKey(formation: string, play: string): string {
  return `${formation}\0${normalizePlayName(play)}`;
}

function cardIdentityKey(card: ExtractedVideoCard): string | null {
  if (!card.catalogValid || !card.matchedFormation || !card.matchedPlay) return null;
  return playIdentityKey(card.matchedFormation, card.matchedPlay);
}

export function listSupplementScreenshots(folderPath: string): string[] {
  if (!existsSync(folderPath)) return [];
  return readdirSync(folderPath)
    .filter((name) => {
      if (name.startsWith(".")) return false;
      const ext = extname(name).toLowerCase();
      return IMAGE_EXTS.has(ext);
    })
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((name) => join(folderPath, name));
}

function isChromeNoise(raw: string, formationText: string): boolean {
  return (
    /\bKEY\s+PLAYERS\b/i.test(raw) ||
    /\b\d+\s*PLAYS\b/i.test(formationText) ||
    /\bAVGYDS\b/i.test(formationText) ||
    /\bPLAYS\b/i.test(formationText)
  );
}

function classifyCard(input: {
  emptySlot: boolean;
  screenInvalid: boolean;
  catalogValid: boolean;
  identityKey: string | null;
  alreadyHave: Set<string>;
  formationMatched: boolean;
  playOcr: string | null;
  playMatchConfidence: ExtractedVideoCard["playMatchConfidence"];
}): SupplementCardClass {
  if (input.screenInvalid) return "INVALID_SCREEN";
  if (input.emptySlot) return "EMPTY_SLOT";
  if (input.catalogValid && input.identityKey) {
    if (input.alreadyHave.has(input.identityKey)) return "DUPLICATE_EXISTING";
    return "NEW_MISSING_PLAY";
  }
  if (
    input.formationMatched &&
    (input.playMatchConfidence === "skipped" ||
      !input.playOcr ||
      !input.playOcr.trim())
  ) {
    return "OCR_UNRESOLVED";
  }
  if (input.formationMatched && input.playMatchConfidence === "none") {
    return "OCR_UNRESOLVED";
  }
  return "CATALOG_MISMATCH";
}

async function validateScreenshotDimensions(
  imagePath: string,
): Promise<
  | { ok: true; width: number; height: number }
  | { ok: false; reason: InvalidScreenshotReason; notes: string }
> {
  let width = 0;
  let height = 0;
  try {
    const meta = await sharp(imagePath).metadata();
    width = meta.width ?? 0;
    height = meta.height ?? 0;
  } catch (err) {
    return {
      ok: false,
      reason: "UNREADABLE_IMAGE",
      notes: err instanceof Error ? err.message : String(err),
    };
  }
  if (width <= 0 || height <= 0) {
    return {
      ok: false,
      reason: "UNREADABLE_IMAGE",
      notes: "Missing width/height metadata",
    };
  }
  try {
    resolveCropProfile(width, height);
  } catch (err) {
    return {
      ok: false,
      reason: "WRONG_DIMENSIONS",
      notes:
        err instanceof Error
          ? err.message
          : `Unsupported ${width}×${height}`,
    };
  }
  return { ok: true, width, height };
}

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
}): Promise<ManualSupplementReport> {
  const ns = input.namespace ?? resolveSupplementNamespace(input.folderPath);
  const resolved = supplementNamespaceToResolved(ns);
  const profile = OBS_1920x1080_TOP_BAND;

  const stagingRoot = join(
    input.playArtRoot,
    "video-staging",
    ns.gameVersion,
    ns.side,
    ns.playbookSlug,
  );
  mkdirSync(stagingRoot, { recursive: true });

  const videoReport = loadVideoReport(stagingRoot);
  const videoOnlyCards = annotateVideoCards(videoReport?.cards ?? []);
  const videoCatalog = compareToCatalog(input.reference, videoOnlyCards);
  const videoFormationCoverage = buildFormationCoverage(
    input.reference,
    videoOnlyCards,
  );

  const knownFormations = input.reference.formations.map((f) => f.name);
  const playsByFormation = new Map(
    input.reference.formations.map((f) => [f.name, f.plays] as const),
  );

  const ownedKeys = new Set<string>();
  for (const card of videoOnlyCards) {
    const key = cardIdentityKey(card);
    if (key) ownedKeys.add(key);
  }

  const screenshots = listSupplementScreenshots(ns.folderPath);
  const sourceCardsDir = join(stagingRoot, "supplement-source-cards");
  const artCropsDir = join(stagingRoot, "supplement-art-crops");
  const screensDir = join(stagingRoot, "supplement-screens");
  mkdirSync(sourceCardsDir, { recursive: true });
  mkdirSync(artCropsDir, { recursive: true });
  mkdirSync(screensDir, { recursive: true });

  const invalidScreenshots: ManualSupplementReport["invalidScreenshots"] = [];
  const supplementCards: ExtractedVideoCard[] = [];
  let screenshotsAccepted = 0;
  let newMissing = 0;
  let duplicates = 0;
  let ocrUnresolved = 0;
  let catalogMismatches = 0;
  let emptySlots = 0;
  let invalidScreenCards = 0;

  for (let i = 0; i < screenshots.length; i += 1) {
    const imagePath = screenshots[i];
    const fileName = basename(imagePath);
    const dim = await validateScreenshotDimensions(imagePath);
    if (!dim.ok) {
      invalidScreenshots.push({
        file: fileName,
        reason: dim.reason,
        notes: dim.notes,
      });
      continue;
    }

    const stagedScreenPath = join(screensDir, fileName);
    copyFileSync(imagePath, stagedScreenPath);

    const stemSafe = fileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-");
    let cropped;
    try {
      cropped = await cropScreenCards({
        screen: {
          screenIndex: i + 1,
          timestampSec: 0,
          timestampLabel: fileName,
          samplePath: stagedScreenPath,
          framePath: stagedScreenPath,
          stableDurationSec: 0,
          shortHold: false,
          fingerprintHash: `manual:${fileName}`,
          sharpnessScore: 0,
          localMotionScore: 0,
        },
        profile,
        sourceCardsDir,
        artCropsDir,
        stemPrefix: `supp-${stemSafe}`,
      });
    } catch (err) {
      invalidScreenshots.push({
        file: fileName,
        reason: "INVALID_CROP_PROFILE",
        notes: err instanceof Error ? err.message : String(err),
      });
      continue;
    }

    type Draft = {
      position: ExtractedVideoCard["cardPosition"];
      sourceCardPath: string;
      artCropPath: string;
      emptySlot: boolean;
      formationOcrRaw: string;
      formationOcr: string;
      playNameOcrRaw: string | null;
      playNameOcr: string | null;
      matchedFormation: string | null;
      formationMatchConfidence: ExtractedVideoCard["formationMatchConfidence"];
      matchedPlay: string | null;
      playMatchConfidence: ExtractedVideoCard["playMatchConfidence"];
      catalogValid: boolean;
      chrome: boolean;
    };

    const drafts: Draft[] = [];
    for (const card of cropped.cards) {
      if (card.emptySlot) {
        drafts.push({
          position: card.position,
          sourceCardPath: card.sourceCardPath,
          artCropPath: card.artCropPath,
          emptySlot: true,
          formationOcrRaw: "",
          formationOcr: "",
          playNameOcrRaw: null,
          playNameOcr: null,
          matchedFormation: null,
          formationMatchConfidence: "none",
          matchedPlay: null,
          playMatchConfidence: "skipped",
          catalogValid: false,
          chrome: false,
        });
        continue;
      }

      const buf = readFileSync(card.sourceCardPath);
      let ocr: { rawText: string; formationText: string; playNameText: string | null };
      try {
        ocr = await ocrPlayCardHeader(buf);
      } catch (err) {
        ocr = { rawText: "", formationText: "", playNameText: null };
        console.warn(
          `  OCR failed ${fileName} ${card.position}: ` +
            `${err instanceof Error ? err.message : String(err)}`,
        );
      }

      const formationMatch = matchKnownFormation(ocr.formationText, knownFormations);
      let formationName = formationMatch.matchedFormation;
      let formationMatchConfidence = formationMatch.matchConfidence;
      let matchedPlay: string | null = null;
      let playMatchConfidence: ExtractedVideoCard["playMatchConfidence"] = "skipped";
      if (formationName) {
        const plays = playsByFormation.get(formationName) ?? [];
        const playMatch = matchPlayInFormation(ocr.playNameText, plays);
        matchedPlay = playMatch.matchedPlay;
        playMatchConfidence = playMatch.matchConfidence;
      } else if (ocr.playNameText) {
        playMatchConfidence = "none";
      }

      const chrome = isChromeNoise(ocr.rawText, ocr.formationText);
      if (chrome) {
        formationName = null;
        formationMatchConfidence = "none";
        matchedPlay = null;
        playMatchConfidence = "none";
      }

      const catalogValid =
        formationMatchConfidence !== "none" &&
        matchedPlay != null &&
        (playMatchConfidence === "exact" || playMatchConfidence === "fuzzy");

      drafts.push({
        position: card.position,
        sourceCardPath: card.sourceCardPath,
        artCropPath: card.artCropPath,
        emptySlot: false,
        formationOcrRaw: ocr.rawText,
        formationOcr: ocr.formationText || normalizeFormationOcrText(ocr.rawText),
        playNameOcrRaw: ocr.playNameText,
        playNameOcr: ocr.playNameText,
        matchedFormation: formationName,
        formationMatchConfidence,
        matchedPlay,
        playMatchConfidence,
        catalogValid,
        chrome,
      });
    }

    const nonEmpty = drafts.filter((d) => !d.emptySlot);
    if (nonEmpty.length === 0) {
      invalidScreenshots.push({
        file: fileName,
        reason: "NO_PLAY_CARDS",
        notes: "All three card slots look empty",
      });
      for (const d of drafts) {
        emptySlots += 1;
        supplementCards.push({
          gameVersion: ns.gameVersion,
          side: ns.side,
          playbookSlug: ns.playbookSlug,
          videoFile: fileName,
          timestamp: fileName,
          timestampSec: 0,
          screenIndex: i + 1,
          cardPosition: d.position,
          sourceCardPath: d.sourceCardPath,
          artCropPath: d.artCropPath,
          emptySlot: true,
          formationOcrRaw: "",
          formationOcr: "",
          playNameOcrRaw: null,
          playNameOcr: null,
          matchedFormation: null,
          formationMatchConfidence: "none",
          matchedPlay: null,
          playMatchConfidence: "skipped",
          catalogValid: false,
          screenRejected: true,
          rejectReason: "NO_VALID_CARDS",
          sourceType: "manual-supplement",
          sourceFile: fileName,
          supplementClass: "INVALID_SCREEN",
        });
        invalidScreenCards += 1;
      }
      continue;
    }

    if (nonEmpty.every((d) => d.chrome)) {
      invalidScreenshots.push({
        file: fileName,
        reason: "TRANSITION_SCREEN",
        notes: "KEY PLAYERS / chrome-only screen",
      });
      for (const d of drafts) {
        invalidScreenCards += 1;
        supplementCards.push(makeSupplementCard({
          ns,
          fileName,
          screenIndex: i + 1,
          draft: d,
          screenInvalid: true,
          supplementClass: "INVALID_SCREEN",
        }));
      }
      continue;
    }

    const formationNames = nonEmpty
      .map((d) => d.matchedFormation)
      .filter((f): f is string => f != null);
    const uniqueFormations = new Set(formationNames);
    const formationMismatch =
      formationNames.length >= 2 && uniqueFormations.size > 1;

    if (formationMismatch) {
      invalidScreenshots.push({
        file: fileName,
        reason: "FORMATION_MISMATCH",
        notes: `Card formations disagree: ${[...uniqueFormations].join(" | ")}`,
      });
      for (const d of drafts) {
        invalidScreenCards += 1;
        supplementCards.push(makeSupplementCard({
          ns,
          fileName,
          screenIndex: i + 1,
          draft: d,
          screenInvalid: true,
          supplementClass: "INVALID_SCREEN",
        }));
      }
      continue;
    }

    // Sibling formation consensus: when ≥1 card on the screen resolves a
    // formation and no disagreement, apply that formation to cards whose
    // play OCR succeeded but formation OCR failed. Does NOT invent play
    // identity from the missing-catalog list — play text must still match.
    if (uniqueFormations.size === 1) {
      const consensusFormation = [...uniqueFormations][0];
      const plays = playsByFormation.get(consensusFormation) ?? [];
      for (const d of drafts) {
        if (d.emptySlot || d.chrome) continue;
        if (d.matchedFormation) continue;
        if (!d.playNameOcr || !d.playNameOcr.trim()) continue;
        const playMatch = matchPlayInFormation(d.playNameOcr, plays);
        if (
          playMatch.matchedPlay &&
          (playMatch.matchConfidence === "exact" ||
            playMatch.matchConfidence === "fuzzy")
        ) {
          d.matchedFormation = consensusFormation;
          d.formationMatchConfidence = "fuzzy";
          d.matchedPlay = playMatch.matchedPlay;
          d.playMatchConfidence = playMatch.matchConfidence;
          d.catalogValid = true;
        }
      }
    }

    screenshotsAccepted += 1;

    for (const d of drafts) {
      const identityKey =
        d.catalogValid && d.matchedFormation && d.matchedPlay
          ? playIdentityKey(d.matchedFormation, d.matchedPlay)
          : null;

      const supplementClass = classifyCard({
        emptySlot: d.emptySlot,
        screenInvalid: false,
        catalogValid: d.catalogValid,
        identityKey,
        alreadyHave: ownedKeys,
        formationMatched: d.formationMatchConfidence !== "none",
        playOcr: d.playNameOcr,
        playMatchConfidence: d.playMatchConfidence,
      });

      if (supplementClass === "EMPTY_SLOT") emptySlots += 1;
      if (supplementClass === "DUPLICATE_EXISTING") duplicates += 1;
      if (supplementClass === "OCR_UNRESOLVED") ocrUnresolved += 1;
      if (supplementClass === "CATALOG_MISMATCH") catalogMismatches += 1;
      if (supplementClass === "NEW_MISSING_PLAY" && identityKey) {
        newMissing += 1;
        ownedKeys.add(identityKey);
      }

      supplementCards.push(
        makeSupplementCard({
          ns,
          fileName,
          screenIndex: i + 1,
          draft: d,
          screenInvalid: false,
          supplementClass,
        }),
      );
    }
  }

  // Combined = video cards + only NEW_MISSING_PLAY supplement cards (and keep
  // other supplement cards in report, but coverage uses recovered + video).
  const recoveredCards = supplementCards.filter(
    (c) => c.supplementClass === "NEW_MISSING_PLAY" && c.catalogValid,
  );
  const combinedCards = [...videoOnlyCards, ...recoveredCards];
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

  // Preserve original video report / video-only recapture snapshot if present.
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
    screenshotsFound: screenshots.length,
    screenshotsAccepted,
    screenshotsInvalid: invalidScreenshots.length,
    invalidScreenshots,
    cardsProcessed: supplementCards.filter((c) => !c.emptySlot).length,
    newMissingPlaysRecovered: newMissing,
    duplicates,
    ocrUnresolved,
    catalogMismatches,
    emptySlots,
    invalidScreenCards,
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
      "Combined coverage = video catalog-valid identities ∪ NEW_MISSING_PLAY supplements.",
      "Duplicates never overwrite or weaken existing validated results.",
      `Crop profile: ${profile.id}`,
    ],
  };

  writeFileSync(supplementReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(
    recaptureQueuePath,
    `${JSON.stringify(recaptureQueue, null, 2)}\n`,
    "utf8",
  );

  // Lightweight combined coverage sidecar (does not overwrite report.json).
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

function makeSupplementCard(input: {
  ns: ResolvedSupplementNamespace;
  fileName: string;
  screenIndex: number;
  draft: {
    position: ExtractedVideoCard["cardPosition"];
    sourceCardPath: string;
    artCropPath: string;
    emptySlot: boolean;
    formationOcrRaw: string;
    formationOcr: string;
    playNameOcrRaw: string | null;
    playNameOcr: string | null;
    matchedFormation: string | null;
    formationMatchConfidence: ExtractedVideoCard["formationMatchConfidence"];
    matchedPlay: string | null;
    playMatchConfidence: ExtractedVideoCard["playMatchConfidence"];
    catalogValid: boolean;
  };
  screenInvalid: boolean;
  supplementClass: SupplementCardClass;
}): ExtractedVideoCard {
  // Only NEW_MISSING_PLAY cards contribute catalogValid to combined coverage.
  // Duplicates keep matchedFormation/play for provenance but catalogValid=false.
  const contributes =
    !input.screenInvalid &&
    input.supplementClass === "NEW_MISSING_PLAY" &&
    input.draft.catalogValid;

  return {
    gameVersion: input.ns.gameVersion,
    side: input.ns.side,
    playbookSlug: input.ns.playbookSlug,
    videoFile: input.fileName,
    timestamp: input.fileName,
    timestampSec: 0,
    screenIndex: input.screenIndex,
    cardPosition: input.draft.position,
    sourceCardPath: input.draft.sourceCardPath,
    artCropPath: input.draft.artCropPath,
    emptySlot: input.draft.emptySlot,
    formationOcrRaw: input.draft.formationOcrRaw,
    formationOcr: input.draft.formationOcr,
    playNameOcrRaw: input.draft.playNameOcrRaw,
    playNameOcr: input.draft.playNameOcr,
    matchedFormation: input.screenInvalid ? null : input.draft.matchedFormation,
    formationMatchConfidence: input.screenInvalid
      ? "none"
      : input.draft.formationMatchConfidence,
    matchedPlay: input.screenInvalid ? null : input.draft.matchedPlay,
    playMatchConfidence: input.screenInvalid
      ? "none"
      : input.draft.playMatchConfidence,
    catalogValid: contributes,
    screenRejected: input.screenInvalid,
    rejectReason: input.screenInvalid ? "NO_VALID_CARDS" : null,
    sourceType: "manual-supplement",
    sourceFile: input.fileName,
    supplementClass: input.supplementClass,
  };
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
      console.log(`  Manual supplement recovered: ${d.recovered}`);
      console.log(`  After: ${d.afterDetected} / ${d.afterExpected}`);
      if (d.stillMissing.length > 0) {
        console.log(`  Still missing:`);
        for (const p of d.stillMissing.slice(0, 12)) console.log(`  - ${p}`);
        if (d.stillMissing.length > 12) {
          console.log(`  - … +${d.stillMissing.length - 12} more`);
        }
      }
      console.log(`  Status: ${d.status}`);
      console.log("");
    }
  }

  console.log(`Updated recapture queue: ${report.recaptureQueuePath}`);
  console.log(`Supplement report: ${report.supplementReportPath}`);
}

export { defaultSupplementFolder, resolveSupplementNamespace };
