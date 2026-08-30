import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import {
  matchKnownFormation,
  normalizeFormationOcrText,
  ocrPlayCardHeader,
} from "../formation-ocr";
import type { PlayArtReference } from "../types";
import { cropScreenCards } from "./crop-cards";
import { pixelRect, type VideoCropProfile } from "./crop-profile";
import { matchPlayInFormation } from "./ocr-and-catalog";
import type {
  ExtractedVideoCard,
  RejectedCandidate,
  RejectReason,
  ResolvedVideoSource,
  StableScreen,
} from "./types";

function whichTesseract(): string {
  const fromEnv = process.env.TESSERACT_PATH?.trim();
  if (fromEnv) return fromEnv;
  for (const candidate of ["tesseract", "/opt/homebrew/bin/tesseract", "/usr/local/bin/tesseract"]) {
    const probe = spawnSync(candidate, ["--version"], { encoding: "utf8" });
    if (probe.status === 0) return candidate;
  }
  throw new Error("tesseract required for video Stage B validation");
}

async function ocrNavBand(
  framePath: string,
  profile: VideoCropProfile,
): Promise<string> {
  const meta = await sharp(framePath).metadata();
  const w = meta.width ?? profile.frameWidth;
  const h = meta.height ?? profile.frameHeight;
  const rect = pixelRect(w, h, profile.navBand);
  const prepared = await sharp(framePath)
    .extract(rect)
    .grayscale()
    .normalize()
    .resize(rect.width * 2, rect.height * 2, { fit: "fill" })
    .png()
    .toBuffer();
  const dir = mkdtempSync(join(tmpdir(), "sideline-nav-ocr-"));
  const imagePath = join(dir, "nav.png");
  try {
    writeFileSync(imagePath, prepared);
    const result = spawnSync(
      whichTesseract(),
      [
        imagePath,
        "stdout",
        "--psm",
        "7",
        "-c",
        "tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ",
      ],
      { encoding: "utf8", maxBuffer: 1024 * 1024 },
    );
    if (result.status !== 0) return "";
    return normalizeFormationOcrText(result.stdout ?? "");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function isChromeNoise(raw: string, formationText: string): boolean {
  return (
    /\bKEY\s+PLAYERS\b/i.test(raw) ||
    /\b\d+\s*PLAYS\b/i.test(formationText) ||
    /\bAVGYDS\b/i.test(formationText) ||
    /\bPLAYS\b/i.test(formationText)
  );
}

export type ScreenValidationResult = {
  acceptedScreens: StableScreen[];
  cards: ExtractedVideoCard[];
  rejected: RejectedCandidate[];
  shortHoldAccepted: number;
};

/**
 * Stage B — strict validation of broad Stage A candidates.
 * Crops + OCR once; rejects transitions; emits catalog identity candidates.
 */
export async function validateScreenCandidates(input: {
  candidates: StableScreen[];
  profile: VideoCropProfile;
  reference: PlayArtReference;
  resolved: ResolvedVideoSource;
  sourceCardsDir: string;
  artCropsDir: string;
  rejectedDir: string;
}): Promise<ScreenValidationResult> {
  mkdirSync(input.rejectedDir, { recursive: true });
  const knownFormations = input.reference.formations.map((f) => f.name);
  const playsByFormation = new Map(
    input.reference.formations.map((f) => [f.name, f.plays] as const),
  );

  const acceptedScreens: StableScreen[] = [];
  const cards: ExtractedVideoCard[] = [];
  const rejected: RejectedCandidate[] = [];
  let shortHoldAccepted = 0;

  for (const screen of input.candidates) {
    const cropped = await cropScreenCards({
      screen,
      profile: input.profile,
      sourceCardsDir: input.sourceCardsDir,
      artCropsDir: input.artCropsDir,
    });

    type CardOcr = {
      emptySlot: boolean;
      sourceCardPath: string;
      artCropPath: string;
      position: ExtractedVideoCard["cardPosition"];
      rawText: string;
      formationText: string;
      playNameText: string | null;
      matchedFormation: string | null;
      formationMatchConfidence: ExtractedVideoCard["formationMatchConfidence"];
      matchedPlay: string | null;
      playMatchConfidence: ExtractedVideoCard["playMatchConfidence"];
      chrome: boolean;
    };

    const cardOcrs: CardOcr[] = [];
    for (const card of cropped.cards) {
      if (card.emptySlot) {
        cardOcrs.push({
          emptySlot: true,
          sourceCardPath: card.sourceCardPath,
          artCropPath: card.artCropPath,
          position: card.position,
          rawText: "",
          formationText: "",
          playNameText: null,
          matchedFormation: null,
          formationMatchConfidence: "none",
          matchedPlay: null,
          playMatchConfidence: "skipped",
          chrome: false,
        });
        continue;
      }
      let ocr: { rawText: string; formationText: string; playNameText: string | null };
      try {
        ocr = await ocrPlayCardHeader(readFileSync(card.sourceCardPath));
      } catch {
        ocr = { rawText: "", formationText: "", playNameText: null };
      }
      const chrome = isChromeNoise(ocr.rawText, ocr.formationText);
      let matchedFormation: string | null = null;
      let formationMatchConfidence: ExtractedVideoCard["formationMatchConfidence"] = "none";
      if (!chrome) {
        const formationMatch = matchKnownFormation(ocr.formationText, knownFormations);
        matchedFormation = formationMatch.matchedFormation;
        formationMatchConfidence = formationMatch.matchConfidence;
      }
      let matchedPlay: string | null = null;
      let playMatchConfidence: ExtractedVideoCard["playMatchConfidence"] = "skipped";
      if (matchedFormation) {
        const plays = playsByFormation.get(matchedFormation) ?? [];
        const playMatch = matchPlayInFormation(ocr.playNameText, plays);
        matchedPlay = playMatch.matchedPlay;
        playMatchConfidence = playMatch.matchConfidence;
      } else if (ocr.playNameText) {
        playMatchConfidence = "none";
      }
      cardOcrs.push({
        emptySlot: false,
        sourceCardPath: card.sourceCardPath,
        artCropPath: card.artCropPath,
        position: card.position,
        rawText: ocr.rawText,
        formationText: ocr.formationText,
        playNameText: ocr.playNameText,
        matchedFormation,
        formationMatchConfidence,
        matchedPlay,
        playMatchConfidence,
        chrome,
      });
    }

    const reject = (reason: RejectReason, notes?: string) => {
      rejected.push({
        timestampSec: screen.timestampSec,
        timestampLabel: screen.timestampLabel,
        fingerprintHash: screen.fingerprintHash,
        reason,
        stableDurationSec: screen.stableDurationSec,
        shortHold: screen.shortHold,
        formationOcr: cardOcrs.map((c) => c.formationText),
        playOcr: cardOcrs.map((c) => c.playNameText ?? ""),
        notes,
      });
    };

    const nonEmpty = cardOcrs.filter((c) => !c.emptySlot);
    const chromeHits = nonEmpty.filter((c) => c.chrome).length;
    const matched = nonEmpty
      .map((c) => c.matchedFormation)
      .filter((f): f is string => f != null);
    const uniqueFormations = new Set(matched);

    if (nonEmpty.length === 0) {
      reject("NO_VALID_CARDS");
      continue;
    }
    if (chromeHits >= 2) {
      reject("KEY_PLAYERS_SCREEN", `chromeHits=${chromeHits}`);
      continue;
    }
    if (uniqueFormations.size > 1) {
      reject("FORMATION_DISAGREEMENT", `formations=${[...uniqueFormations].join(" | ")}`);
      continue;
    }
    if (nonEmpty.length >= 2 && matched.length === 0) {
      reject("TRANSITION_FRAME", "no catalog formation matches on cards");
      continue;
    }
    if (nonEmpty.length >= 3 && matched.length < 2) {
      reject("TRANSITION_FRAME", `only ${matched.length}/3 cards matched a formation`);
      continue;
    }

    // Soft nav corroboration (non-rejecting).
    try {
      await ocrNavBand(screen.framePath, input.profile);
    } catch {
      /* optional */
    }

    const screenIndex = acceptedScreens.length + 1;
    const acceptedScreen: StableScreen = { ...screen, screenIndex };
    acceptedScreens.push(acceptedScreen);
    if (screen.shortHold) shortHoldAccepted += 1;

    for (const c of cardOcrs) {
      const catalogValid =
        !c.emptySlot &&
        c.matchedFormation != null &&
        c.matchedPlay != null &&
        (c.playMatchConfidence === "exact" || c.playMatchConfidence === "fuzzy");
      cards.push({
        gameVersion: input.resolved.gameVersion,
        side: input.resolved.side,
        playbookSlug: input.resolved.playbookSlug,
        videoFile: input.resolved.basename,
        timestamp: screen.timestampLabel,
        timestampSec: screen.timestampSec,
        screenIndex,
        cardPosition: c.position,
        sourceCardPath: c.sourceCardPath,
        artCropPath: c.artCropPath,
        emptySlot: c.emptySlot,
        formationOcrRaw: c.rawText,
        formationOcr: c.formationText || normalizeFormationOcrText(c.rawText),
        playNameOcrRaw: c.playNameText,
        playNameOcr: c.playNameText,
        matchedFormation: c.matchedFormation,
        formationMatchConfidence: c.formationMatchConfidence,
        matchedPlay: c.matchedPlay,
        playMatchConfidence: c.playMatchConfidence,
        catalogValid,
        screenRejected: false,
        rejectReason: null,
      });
    }
  }

  writeFileSync(
    join(input.rejectedDir, "rejected-candidates.json"),
    `${JSON.stringify(rejected, null, 2)}\n`,
    "utf8",
  );

  return { acceptedScreens, cards, rejected, shortHoldAccepted };
}
