import { PLAY_STRIP_HEIGHT } from "../extract-docx";
import { FORMATION_HEADER_REGION } from "../formation-ocr";
import type { CardPosition, NormRect, VideoCropProfile } from "./types";

export type { VideoCropProfile, NormRect, CardPosition } from "./types";

/** DOCX owned card size — target for source-card export compatibility. */
export const OWNED_CARD_WIDTH = 626;
export const OWNED_CARD_HEIGHT = PLAY_STRIP_HEIGHT; // 355

/**
 * Calibrated OBS capture profile for 1920×1080 recordings where the play-call
 * UI occupies the top ~380px and the remainder is letterboxed black.
 *
 * Measured from cfb27-offense-go-go.mp4 probe frames (stable across screens).
 */
export const OBS_1920x1080_TOP_BAND: VideoCropProfile = {
  id: "obs-1920x1080-top-band-v1",
  frameWidth: 1920,
  frameHeight: 1080,
  contentBand: { x: 0, y: 0, width: 1, height: 380 / 1080 },
  navBand: { x: 0.12, y: 0, width: 0.76, height: 44 / 1080 },
  cards: {
    left: { x: 72 / 1920, y: 45 / 1080, width: 545 / 1920, height: 334 / 1080 },
    middle: { x: 687 / 1920, y: 45 / 1080, width: 545 / 1920, height: 334 / 1080 },
    right: { x: 1302 / 1920, y: 45 / 1080, width: 545 / 1920, height: 334 / 1080 },
  },
  cardHeaderHeightFrac: FORMATION_HEADER_REGION.height / OWNED_CARD_HEIGHT,
  // Art band within card: below header text, above PASS/stats footer chrome.
  cardArt: {
    x: 0.02,
    y: FORMATION_HEADER_REGION.height / OWNED_CARD_HEIGHT,
    width: 0.96,
    height: 1 - FORMATION_HEADER_REGION.height / OWNED_CARD_HEIGHT - 0.12,
  },
};

const PROFILES: VideoCropProfile[] = [OBS_1920x1080_TOP_BAND];

export function resolveCropProfile(
  frameWidth: number,
  frameHeight: number,
): VideoCropProfile {
  const hit = PROFILES.find(
    (p) => p.frameWidth === frameWidth && p.frameHeight === frameHeight,
  );
  if (!hit) {
    throw new Error(
      `VIDEO CROP PROFILE: unsupported frame size ${frameWidth}×${frameHeight}.\n` +
        `Calibrated profiles: ${PROFILES.map((p) => `${p.id} (${p.frameWidth}×${p.frameHeight})`).join(", ")}.\n` +
        `FAIL CLOSED — do not produce malformed crops. Re-record at a calibrated resolution ` +
        `or add an explicit crop profile.`,
    );
  }
  return hit;
}

export function pixelRect(
  frameWidth: number,
  frameHeight: number,
  norm: NormRect,
): { left: number; top: number; width: number; height: number } {
  const left = Math.round(norm.x * frameWidth);
  const top = Math.round(norm.y * frameHeight);
  const width = Math.round(norm.width * frameWidth);
  const height = Math.round(norm.height * frameHeight);
  return {
    left: Math.max(0, left),
    top: Math.max(0, top),
    width: Math.max(1, Math.min(width, frameWidth - left)),
    height: Math.max(1, Math.min(height, frameHeight - top)),
  };
}

export function cardPositions(): CardPosition[] {
  return ["left", "middle", "right"];
}
