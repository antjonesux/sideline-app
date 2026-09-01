/**
 * Resolve `source-screenshots/{game}/{side}/{slug}/` → exact playbook namespace.
 * Fail-closed — directory path is sole authority; never guess.
 */
import { existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { loadPlaybookCatalog, SEED_PLAYBOOKS_DIR } from "../source-discovery";
import { teamSlugToSeedSlug } from "../lib/slug-utils";
import type { VideoSideOfBall } from "./types";

export type ResolvedScreenshotNamespace = {
  folderPath: string;
  gameVersion: string;
  side: VideoSideOfBall;
  playbookSlug: string;
  playbookDisplayName: string;
  seedSlug: string;
  seedPath: string;
};

export function resolveScreenshotNamespace(
  folderPath: string,
): ResolvedScreenshotNamespace {
  const resolved = resolve(folderPath);
  const parts = resolved.replace(/\\/g, "/").split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "source-screenshots");

  if (idx < 0) {
    throw new Error(
      `SCREENSHOT PATH INVALID: Path must include source-screenshots/{game}/{side}/{playbook-slug}/.\n` +
        `Got: ${folderPath}`,
    );
  }

  const after = parts.slice(idx + 1);
  if (after.length < 3) {
    throw new Error(
      `SCREENSHOT PATH INVALID: Expected source-screenshots/{game}/{side}/{playbook-slug}/.\n` +
        `Got: ${folderPath}`,
    );
  }
  if (after.length > 3) {
    throw new Error(
      `SCREENSHOT PATH INVALID: Extra path segments after playbook slug.\n` +
        `Got: ${folderPath}\n` +
        `Expected exactly: .../source-screenshots/{game}/{side}/{playbook-slug}/`,
    );
  }

  const gameVersion = after[0].toLowerCase();
  const sideRaw = after[1].toLowerCase();
  const playbookSlug = after[2].toLowerCase();

  if (!/^cfb\d+$/.test(gameVersion)) {
    throw new Error(
      `SCREENSHOT PATH INVALID: Missing/invalid game version.\n` +
        `Got: "${after[0]}" in ${folderPath}\n` +
        `Expected: cfb27 (or cfbNN)`,
    );
  }
  if (sideRaw !== "offense" && sideRaw !== "defense") {
    throw new Error(
      `SCREENSHOT PATH INVALID: Missing side of ball.\n` +
        `Got segment "${sideRaw}" in ${folderPath}\n` +
        `Valid: offense | defense`,
    );
  }
  const side = sideRaw as VideoSideOfBall;
  if (!playbookSlug) {
    throw new Error(
      `SCREENSHOT PATH INVALID: Missing playbook slug.\n` +
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
      `Ambiguous screenshot playbook for ${playbookSlug}: ` +
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

export function defaultScreenshotFolder(input: {
  gameVersion: string;
  side: VideoSideOfBall;
  playbookSlug: string;
  playArtRoot: string;
}): string {
  return join(
    input.playArtRoot,
    "source-screenshots",
    input.gameVersion,
    input.side,
    input.playbookSlug,
  );
}

export function screenshotStagingRoot(input: {
  playArtRoot: string;
  gameVersion: string;
  side: VideoSideOfBall;
  playbookSlug: string;
}): string {
  return join(
    input.playArtRoot,
    "screenshot-staging",
    input.gameVersion,
    input.side,
    input.playbookSlug,
  );
}

export function describeScreenshotNamespace(
  ns: ResolvedScreenshotNamespace,
): string {
  return `${basename(ns.folderPath)} → ${ns.gameVersion}/${ns.side}/${ns.playbookSlug} (${ns.playbookDisplayName})`;
}
