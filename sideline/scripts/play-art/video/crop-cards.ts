import { mkdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import {
  OWNED_CARD_HEIGHT,
  OWNED_CARD_WIDTH,
  cardPositions,
  pixelRect,
  type VideoCropProfile,
} from "./crop-profile";
import type { CardPosition, StableScreen } from "./types";

export type CroppedScreenCards = {
  screenIndex: number;
  timestampSec: number;
  timestampLabel: string;
  cards: Array<{
    position: CardPosition;
    sourceCardPath: string;
    artCropPath: string;
    emptySlot: boolean;
  }>;
};

async function isLikelyEmptyCard(cardBuffer: Buffer): Promise<boolean> {
  const { data, info } = await sharp(cardBuffer)
    .resize(80, 48, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let sum = 0;
  let sumSq = 0;
  const n = info.width * info.height;
  for (let i = 0; i < n; i += 1) {
    sum += data[i];
    sumSq += data[i] * data[i];
  }
  const mean = sum / n;
  const variance = sumSq / n - mean * mean;
  // Empty / unused slots are flat dark panels with almost no diagram ink.
  return variance < 80 && mean < 55;
}

/**
 * Extract three source cards (+ art crops) from a stable frame using fixed geometry.
 * Source cards are resized to DOCX-owned 626×355 for OCR/matcher compatibility.
 */
export async function cropScreenCards(input: {
  screen: StableScreen;
  profile: VideoCropProfile;
  sourceCardsDir: string;
  artCropsDir: string;
  /** Optional filename stem prefix (default: screen-NNNN). */
  stemPrefix?: string;
}): Promise<CroppedScreenCards> {
  mkdirSync(input.sourceCardsDir, { recursive: true });
  mkdirSync(input.artCropsDir, { recursive: true });

  const meta = await sharp(input.screen.framePath).metadata();
  const frameWidth = meta.width ?? input.profile.frameWidth;
  const frameHeight = meta.height ?? input.profile.frameHeight;

  const cards: CroppedScreenCards["cards"] = [];
  for (const position of cardPositions()) {
    const rect = pixelRect(frameWidth, frameHeight, input.profile.cards[position]);
    const rawCard = await sharp(input.screen.framePath).extract(rect).png().toBuffer();
    const emptySlot = await isLikelyEmptyCard(rawCard);

    const sourceCard = await sharp(rawCard)
      .resize(OWNED_CARD_WIDTH, OWNED_CARD_HEIGHT, { fit: "fill", kernel: "lanczos3" })
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();

    const artNorm = input.profile.cardArt;
    const artRect = {
      left: Math.round(artNorm.x * OWNED_CARD_WIDTH),
      top: Math.round(artNorm.y * OWNED_CARD_HEIGHT),
      width: Math.round(artNorm.width * OWNED_CARD_WIDTH),
      height: Math.round(artNorm.height * OWNED_CARD_HEIGHT),
    };
    const artCrop = await sharp(sourceCard).extract(artRect).jpeg({ quality: 92 }).toBuffer();

    const stem =
      input.stemPrefix != null
        ? `${input.stemPrefix}-${position}`
        : `screen-${String(input.screen.screenIndex).padStart(4, "0")}-${position}`;
    const sourceCardPath = join(input.sourceCardsDir, `${stem}.jpg`);
    const artCropPath = join(input.artCropsDir, `${stem}.jpg`);
    await sharp(sourceCard).toFile(sourceCardPath);
    await sharp(artCrop).toFile(artCropPath);

    cards.push({
      position,
      sourceCardPath,
      artCropPath,
      emptySlot,
    });
  }

  return {
    screenIndex: input.screen.screenIndex,
    timestampSec: input.screen.timestampSec,
    timestampLabel: input.screen.timestampLabel,
    cards,
  };
}
