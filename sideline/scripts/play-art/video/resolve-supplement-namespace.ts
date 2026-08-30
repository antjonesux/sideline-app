import { existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { loadPlaybookCatalog, SEED_PLAYBOOKS_DIR } from "../source-discovery";
import { teamSlugToSeedSlug } from "../lib/slug-utils";
import type { ResolvedVideoSource, VideoSideOfBall } from "./types";

export type ResolvedSupplementNamespace = {
  folderPath: string;
  gameVersion: string;
  side: VideoSideOfBall;
  playbookSlug: string;
  playbookDisplayName: string;
  seedSlug: string;
  seedPath: string;
};

/**
 * Resolve `manual-supplements/{game}/{side}/{slug}/` → exact playbook namespace.
 * Fail-closed — never guess. Path must contain `manual-supplements` and exactly
 * three segments after it (game / side / playbook-slug).
 */
export function resolveSupplementNamespace(folderPath: string): ResolvedSupplementNamespace {
  const resolved = resolve(folderPath);
  const parts = resolved.replace(/\\/g, "/").split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "manual-supplements");

  if (idx < 0) {
    throw new Error(
      `MANUAL SUPPLEMENT PATH INVALID: Path must include manual-supplements/{game}/{side}/{playbook-slug}/.\n` +
        `Got: ${folderPath}`,
    );
  }

  const after = parts.slice(idx + 1);
  if (after.length === 0 || after.length === 1) {
    throw new Error(
      `MANUAL SUPPLEMENT PATH INVALID: Missing game version and side.\n` +
        `Got: ${folderPath}\n` +
        `Expected: scripts/play-art/manual-supplements/{game}/{side}/{playbook-slug}/`,
    );
  }
  if (after.length === 2) {
    throw new Error(
      `MANUAL SUPPLEMENT PATH INVALID: Missing side of ball.\n` +
        `Got: ${folderPath}\n` +
        `Expected: .../manual-supplements/{game}/offense|defense/{playbook-slug}/`,
    );
  }
  if (after.length > 3) {
    throw new Error(
      `MANUAL SUPPLEMENT PATH INVALID: Extra path segments after playbook slug.\n` +
        `Got: ${folderPath}\n` +
        `Expected exactly: .../manual-supplements/{game}/{side}/{playbook-slug}/`,
    );
  }

  const gameVersion = after[0].toLowerCase();
  const sideRaw = after[1].toLowerCase();
  const playbookSlug = after[2].toLowerCase();

  if (!/^cfb\d+$/.test(gameVersion)) {
    throw new Error(
      `MANUAL SUPPLEMENT PATH INVALID: Missing game version and side.\n` +
        `Got: ${folderPath}\n` +
        `Expected: .../manual-supplements/cfb27/offense/{slug}/`,
    );
  }
  if (sideRaw !== "offense" && sideRaw !== "defense") {
    throw new Error(
      `MANUAL SUPPLEMENT PATH INVALID: Missing side of ball.\n` +
        `Got segment "${sideRaw}" in ${folderPath}\n` +
        `Valid: offense | defense`,
    );
  }
  const side = sideRaw as VideoSideOfBall;
  if (!playbookSlug || playbookSlug === "manual-supplements") {
    throw new Error(
      `MANUAL SUPPLEMENT PATH INVALID: Missing playbook slug.\n` +
        `Got: ${folderPath}`,
    );
  }

  const seedSlug = teamSlugToSeedSlug(playbookSlug, gameVersion);
  const seedPath = join(SEED_PLAYBOOKS_DIR, `${seedSlug}.ts`);
  if (!existsSync(seedPath)) {
    throw new Error(
      `No matching ${gameVersion.toUpperCase()} ${side} playbook found for:\n` +
        `  ${playbookSlug}\n` +
        `Expected seed: lib/seed/playbooks/${seedSlug}.ts`,
    );
  }

  const catalog = loadPlaybookCatalog(SEED_PLAYBOOKS_DIR);
  const matches = catalog.filter(
    (e) =>
      e.seedSlug === seedSlug &&
      e.gameVersion === gameVersion &&
      e.sideOfBall === side,
  );
  if (matches.length === 0) {
    throw new Error(
      `No matching ${gameVersion.toUpperCase()} ${side} playbook found for:\n` +
        `  ${playbookSlug}`,
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `Ambiguous supplement playbook for ${playbookSlug}: ` +
        matches.map((m) => m.team).join(", "),
    );
  }

  return {
    folderPath: resolved,
    gameVersion,
    side,
    playbookSlug,
    playbookDisplayName: matches[0].team,
    seedSlug,
    seedPath,
  };
}

export function supplementNamespaceToResolved(
  ns: ResolvedSupplementNamespace,
): ResolvedVideoSource {
  return {
    videoPath: ns.folderPath,
    basename: basename(ns.folderPath),
    gameVersion: ns.gameVersion,
    side: ns.side,
    playbookSlug: ns.playbookSlug,
    playbookDisplayName: ns.playbookDisplayName,
    seedSlug: ns.seedSlug,
    seedPath: ns.seedPath,
    directorySide: ns.side,
  };
}

export function defaultSupplementFolder(input: {
  gameVersion: string;
  side: VideoSideOfBall;
  playbookSlug: string;
  playArtRoot: string;
}): string {
  return join(
    input.playArtRoot,
    "manual-supplements",
    input.gameVersion,
    input.side,
    input.playbookSlug,
  );
}
