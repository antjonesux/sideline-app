import type { PlayIdentity } from "@/lib/types";
import { normalizePlayName } from "@/lib/utils";

export type { PlayIdentity };

type PlaySetupKeyInput = {
  game_version: string;
  side_of_ball: string;
  playbook: string;
  formation: string;
  play_name: string;
};

function normalizeKeyPart(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Stable identity key for a play setup scope.
 * Lowercases/trims every part; play names go through `normalizePlayName` first
 * (digit-pair merge / Unicode cleanup), then lowercase for the key.
 * Pure — safe on client and server. Clients use this to look up `/counts` entries.
 */
export function buildPlaySetupKey(parts: PlaySetupKeyInput | PlayIdentity): string {
  return [
    normalizeKeyPart(parts.game_version),
    normalizeKeyPart(parts.side_of_ball),
    normalizeKeyPart(parts.playbook),
    normalizeKeyPart(parts.formation),
    normalizeKeyPart(normalizePlayName(parts.play_name)),
  ].join("|");
}

/**
 * Prefix for all setups in one playbook (`game_version|side|playbook|`).
 * Used by `/api/play-setups/counts` to filter with a single `like` query.
 */
export function buildPlaySetupPlaybookPrefix(
  parts: Pick<PlaySetupKeyInput, "game_version" | "side_of_ball" | "playbook">,
): string {
  return [
    normalizeKeyPart(parts.game_version),
    normalizeKeyPart(parts.side_of_ball),
    normalizeKeyPart(parts.playbook),
    "",
  ].join("|");
}

export const PLAY_SETUP_IMAGES_BUCKET = "play-setup-images";
export const PLAY_SETUP_MAX_PER_PLAY = 10;
export const PLAY_SETUP_TITLE_MAX = 60;
export const PLAY_SETUP_NOTES_MAX = 2000;
export const PLAY_SETUP_SIGNED_URL_SECONDS = 60 * 60;
