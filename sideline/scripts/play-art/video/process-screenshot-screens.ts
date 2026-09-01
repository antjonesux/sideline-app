/**
 * Shared three-card screenshot processing for:
 * - manual supplements (OBS video gaps)
 * - first-class source-screenshots ingestion
 *
 * Identity = namespace + formation OCR + play OCR + exact catalog resolution.
 * Positional order / card slot is provenance only — never play identity.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
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
import { matchPlayInFormation } from "./ocr-and-catalog";
import type {
  CardSourceType,
  ExtractedVideoCard,
  SupplementCardClass,
  VideoSideOfBall,
} from "./types";

export type InvalidScreenshotReason =
  | "WRONG_DIMENSIONS"
  | "INVALID_CROP_PROFILE"
  | "NO_PLAY_CARDS"
  | "TRANSITION_SCREEN"
  | "FORMATION_MISMATCH"
  | "UNREADABLE_IMAGE";

export type ScreenshotScreenStats = {
  screenshotsFound: number;
  screenshotsAccepted: number;
  screenshotsInvalid: number;
  invalidScreenshots: Array<{
    file: string;
    reason: InvalidScreenshotReason;
    notes?: string;
  }>;
  cards: ExtractedVideoCard[];
  cardsProcessed: number;
  newIdentities: number;
  duplicates: number;
  ocrUnresolved: number;
  catalogMismatches: number;
  emptySlots: number;
  invalidScreenCards: number;
  unresolvedFormationOcr: number;
  unresolvedPlayOcr: number;
  invalidCropGeometry: number;
  missingArtCrops: number;
  cropProfileId: string;
};

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg"]);

export function playIdentityKey(formation: string, play: string): string {
  return `${formation}\0${normalizePlayName(play)}`;
}

export function cardIdentityKey(card: ExtractedVideoCard): string | null {
  if (!card.catalogValid || !card.matchedFormation || !card.matchedPlay) return null;
  return playIdentityKey(card.matchedFormation, card.matchedPlay);
}

export function listScreenshotImages(folderPath: string): string[] {
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

export type ScreenshotSourceFingerprintEntry = {
  name: string;
  size: number;
  mtimeMs: number;
};

export function fingerprintScreenshotFolder(
  folderPath: string,
): ScreenshotSourceFingerprintEntry[] {
  return listScreenshotImages(folderPath).map((path) => {
    const st = statSync(path);
    return {
      name: basename(path),
      size: st.size,
      mtimeMs: Math.floor(st.mtimeMs),
    };
  });
}

export function fingerprintsEqual(
  a: ScreenshotSourceFingerprintEntry[],
  b: ScreenshotSourceFingerprintEntry[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (
      a[i].name !== b[i].name ||
      a[i].size !== b[i].size ||
      a[i].mtimeMs !== b[i].mtimeMs
    ) {
      return false;
    }
  }
  return true;
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

function makeCard(input: {
  ns: {
    gameVersion: string;
    side: VideoSideOfBall;
    playbookSlug: string;
  };
  fileName: string;
  screenIndex: number;
  draft: Draft;
  screenInvalid: boolean;
  supplementClass: SupplementCardClass;
  sourceType: CardSourceType;
}): ExtractedVideoCard {
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
    sourceType: input.sourceType,
    sourceFile: input.fileName,
    supplementClass: input.supplementClass,
  };
}

/**
 * Process a folder (or explicit list) of play-selection screenshots into
 * catalog-classified cards. Mutates `alreadyHave` as new identities are found.
 */
export async function processScreenshotScreens(input: {
  imagePaths: string[];
  namespace: {
    gameVersion: string;
    side: VideoSideOfBall;
    playbookSlug: string;
  };
  reference: PlayArtReference;
  alreadyHave: Set<string>;
  screensDir: string;
  sourceCardsDir: string;
  artCropsDir: string;
  sourceType: CardSourceType;
  stemPrefix: string;
}): Promise<ScreenshotScreenStats> {
  mkdirSync(input.screensDir, { recursive: true });
  mkdirSync(input.sourceCardsDir, { recursive: true });
  mkdirSync(input.artCropsDir, { recursive: true });

  const knownFormations = input.reference.formations.map((f) => f.name);
  const playsByFormation = new Map(
    input.reference.formations.map((f) => [f.name, f.plays] as const),
  );

  const invalidScreenshots: ScreenshotScreenStats["invalidScreenshots"] = [];
  const cards: ExtractedVideoCard[] = [];
  let screenshotsAccepted = 0;
  let newIdentities = 0;
  let duplicates = 0;
  let ocrUnresolved = 0;
  let catalogMismatches = 0;
  let emptySlots = 0;
  let invalidScreenCards = 0;
  let unresolvedFormationOcr = 0;
  let unresolvedPlayOcr = 0;
  let invalidCropGeometry = 0;
  let missingArtCrops = 0;
  let lastProfile = OBS_1920x1080_TOP_BAND;

  for (let i = 0; i < input.imagePaths.length; i += 1) {
    const imagePath = input.imagePaths[i];
    const fileName = basename(imagePath);
    const dim = await validateScreenshotDimensions(imagePath);
    if (!dim.ok) {
      invalidScreenshots.push({
        file: fileName,
        reason: dim.reason,
        notes: dim.notes,
      });
      if (dim.reason === "WRONG_DIMENSIONS" || dim.reason === "INVALID_CROP_PROFILE") {
        invalidCropGeometry += 1;
      }
      continue;
    }

    const profile = resolveCropProfile(dim.width, dim.height);
    lastProfile = profile;
    const stagedScreenPath = join(input.screensDir, fileName);
    copyFileSync(imagePath, stagedScreenPath);

    const stemSafe = fileName
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-");
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
          fingerprintHash: `${input.sourceType}:${fileName}`,
          sharpnessScore: 0,
          localMotionScore: 0,
        },
        profile,
        sourceCardsDir: input.sourceCardsDir,
        artCropsDir: input.artCropsDir,
        stemPrefix: `${input.stemPrefix}-${stemSafe}`,
      });
    } catch (err) {
      invalidScreenshots.push({
        file: fileName,
        reason: "INVALID_CROP_PROFILE",
        notes: err instanceof Error ? err.message : String(err),
      });
      invalidCropGeometry += 1;
      continue;
    }

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

      if (!existsSync(card.artCropPath)) {
        missingArtCrops += 1;
      }

      const buf = readFileSync(card.sourceCardPath);
      let ocr: {
        rawText: string;
        formationText: string;
        playNameText: string | null;
      };
      try {
        ocr = await ocrPlayCardHeader(buf);
      } catch (err) {
        ocr = { rawText: "", formationText: "", playNameText: null };
        console.warn(
          `  OCR failed ${fileName} ${card.position}: ` +
            `${err instanceof Error ? err.message : String(err)}`,
        );
      }

      const formationMatch = matchKnownFormation(
        ocr.formationText,
        knownFormations,
      );
      let formationName = formationMatch.matchedFormation;
      let formationMatchConfidence = formationMatch.matchConfidence;
      let matchedPlay: string | null = null;
      let playMatchConfidence: ExtractedVideoCard["playMatchConfidence"] =
        "skipped";
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
        formationOcr:
          ocr.formationText || normalizeFormationOcrText(ocr.rawText),
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
        invalidScreenCards += 1;
        cards.push(
          makeCard({
            ns: input.namespace,
            fileName,
            screenIndex: i + 1,
            draft: d,
            screenInvalid: true,
            supplementClass: "INVALID_SCREEN",
            sourceType: input.sourceType,
          }),
        );
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
        cards.push(
          makeCard({
            ns: input.namespace,
            fileName,
            screenIndex: i + 1,
            draft: d,
            screenInvalid: true,
            supplementClass: "INVALID_SCREEN",
            sourceType: input.sourceType,
          }),
        );
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
        cards.push(
          makeCard({
            ns: input.namespace,
            fileName,
            screenIndex: i + 1,
            draft: d,
            screenInvalid: true,
            supplementClass: "INVALID_SCREEN",
            sourceType: input.sourceType,
          }),
        );
      }
      continue;
    }

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
      if (
        !d.emptySlot &&
        !d.chrome &&
        d.formationMatchConfidence === "none" &&
        !d.catalogValid
      ) {
        unresolvedFormationOcr += 1;
      }
      if (
        !d.emptySlot &&
        !d.chrome &&
        d.matchedFormation &&
        (!d.playNameOcr ||
          !d.playNameOcr.trim() ||
          d.playMatchConfidence === "none" ||
          d.playMatchConfidence === "skipped") &&
        !d.catalogValid
      ) {
        unresolvedPlayOcr += 1;
      }

      const identityKey =
        d.catalogValid && d.matchedFormation && d.matchedPlay
          ? playIdentityKey(d.matchedFormation, d.matchedPlay)
          : null;

      const supplementClass = classifyCard({
        emptySlot: d.emptySlot,
        screenInvalid: false,
        catalogValid: d.catalogValid,
        identityKey,
        alreadyHave: input.alreadyHave,
        formationMatched: d.formationMatchConfidence !== "none",
        playOcr: d.playNameOcr,
        playMatchConfidence: d.playMatchConfidence,
      });

      if (supplementClass === "EMPTY_SLOT") emptySlots += 1;
      if (supplementClass === "DUPLICATE_EXISTING") duplicates += 1;
      if (supplementClass === "OCR_UNRESOLVED") ocrUnresolved += 1;
      if (supplementClass === "CATALOG_MISMATCH") catalogMismatches += 1;
      if (supplementClass === "NEW_MISSING_PLAY" && identityKey) {
        newIdentities += 1;
        input.alreadyHave.add(identityKey);
      }

      cards.push(
        makeCard({
          ns: input.namespace,
          fileName,
          screenIndex: i + 1,
          draft: d,
          screenInvalid: false,
          supplementClass,
          sourceType: input.sourceType,
        }),
      );
    }
  }

  return {
    screenshotsFound: input.imagePaths.length,
    screenshotsAccepted,
    screenshotsInvalid: invalidScreenshots.length,
    invalidScreenshots,
    cards,
    cardsProcessed: cards.filter((c) => !c.emptySlot).length,
    newIdentities,
    duplicates,
    ocrUnresolved,
    catalogMismatches,
    emptySlots,
    invalidScreenCards,
    unresolvedFormationOcr,
    unresolvedPlayOcr,
    invalidCropGeometry,
    missingArtCrops,
    cropProfileId: lastProfile.id,
  };
}
