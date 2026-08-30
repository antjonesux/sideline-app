import { basename } from "node:path";
import type { ParsedVideoFilename, VideoSideOfBall } from "./types";

const FILENAME_RE = /^(cfb\d+)-(offense|defense)-(.+)\.mp4$/i;

/**
 * Parse `{game-version}-{side}-{playbook-slug}.mp4`.
 * Fail-closed: never guess missing game/side/slug.
 */
export function parseVideoFilename(videoPathOrName: string): ParsedVideoFilename {
  const name = basename(videoPathOrName).trim();
  if (!name.toLowerCase().endsWith(".mp4")) {
    throw new Error(
      `VIDEO FILENAME INVALID: expected .mp4, got "${name}".\n` +
        `Expected format: {game-version}-{side}-{playbook-slug}.mp4\n` +
        `Example: cfb27-offense-texas.mp4`,
    );
  }

  const match = FILENAME_RE.exec(name);
  if (!match) {
    const lower = name.toLowerCase().replace(/\.mp4$/, "");
    const parts = lower.split("-");
    if (parts.length === 1) {
      throw new Error(
        `VIDEO FILENAME INVALID: Missing game version and side.\n` +
          `Got: ${name}\n` +
          `Expected: cfb27-offense-${parts[0]}.mp4`,
      );
    }
    if (/^cfb\d+$/i.test(parts[0]) && parts.length === 2) {
      throw new Error(
        `VIDEO FILENAME INVALID: Missing side of ball.\n` +
          `Got: ${name}\n` +
          `Expected: ${parts[0]}-offense-${parts.slice(1).join("-")}.mp4 ` +
          `or ${parts[0]}-defense-${parts.slice(1).join("-")}.mp4`,
      );
    }
    if (/^cfb\d+$/i.test(parts[0]) && parts[1] && parts[1] !== "offense" && parts[1] !== "defense") {
      throw new Error(
        `VIDEO FILENAME INVALID: Unsupported side: ${parts[1]}\n` +
          `Got: ${name}\n` +
          `Valid side values: offense | defense`,
      );
    }
    throw new Error(
      `VIDEO FILENAME INVALID: "${name}"\n` +
        `Expected format: {game-version}-{side}-{playbook-slug}.mp4\n` +
        `Example: cfb27-offense-texas.mp4`,
    );
  }

  const gameVersion = match[1].toLowerCase();
  const side = match[2].toLowerCase() as VideoSideOfBall;
  const playbookSlug = match[3].toLowerCase().replace(/^-+|-+$/g, "");
  if (!playbookSlug) {
    throw new Error(
      `VIDEO FILENAME INVALID: empty playbook slug in "${name}"`,
    );
  }

  return { gameVersion, side, playbookSlug, basename: name };
}

/** Infer side from path segments (`.../offense/...` or `.../defense/...`). */
export function inferDirectorySide(videoPath: string): VideoSideOfBall | null {
  const normalized = videoPath.replace(/\\/g, "/").toLowerCase();
  const segments = normalized.split("/");
  const offenseIdx = segments.lastIndexOf("offense");
  const defenseIdx = segments.lastIndexOf("defense");
  if (offenseIdx < 0 && defenseIdx < 0) return null;
  if (offenseIdx > defenseIdx) return "offense";
  if (defenseIdx > offenseIdx) return "defense";
  return null;
}
