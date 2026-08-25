import { basename, join } from "node:path";

const DEFAULT_GAME = "cfb27";
const DEFAULT_SIDE: "offense" | "defense" = "offense";

/**
 * Normalize a team/scheme display name (or DOCX basename stem) to a safe slug.
 *
 * Ampersand rules:
 * - Spaced `&` (`Run & Shoot`) → `-and-` (`run-and-shoot`)
 * - Bare `&` (`Texas A&M`) → drop (`texas-am`) so seed filenames stay shell/URL-safe
 *
 * cfb.fan often drops the ampersand entirely (`run-shoot-off`); that mapping lives
 * in seed `source.url`, not here.
 *
 * Examples:
 *   California → california
 *   Ohio State → ohio-state
 *   Run & Shoot → run-and-shoot
 *   Veer & Shoot → veer-and-shoot
 *   Texas A&M → texas-am
 *   Pro Style → pro-style
 */
export function displayNameToTeamSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+&\s+/g, " and ")
    .replace(/&/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * DOCX basename → team/scheme slug for seed + reference paths.
 */
export function docxPathToTeamSlug(docxPath: string): string {
  const base = basename(docxPath).replace(/\.docx$/i, "");
  return displayNameToTeamSlug(base);
}

/** team/scheme slug → seed module slug (`california` → `cfb27-california`). */
export function teamSlugToSeedSlug(teamSlug: string, game: string = DEFAULT_GAME): string {
  const team = teamSlug.trim().toLowerCase().replace(/^-+|-+$/g, "");
  const gamePart = game.trim().toLowerCase() || DEFAULT_GAME;
  if (!team) {
    throw new Error("teamSlug is empty");
  }
  if (team.startsWith(`${gamePart}-`)) {
    return team;
  }
  return `${gamePart}-${team}`;
}

/** Convenience: DOCX path → seed slug. */
export function docxPathToSeedSlug(docxPath: string, game: string = DEFAULT_GAME): string {
  return teamSlugToSeedSlug(docxPathToTeamSlug(docxPath), game);
}

/**
 * Seed module slug → canonical reference JSON path.
 * Convention (from build-reference writeReferenceFile / referenceSlug):
 *   cfb27-california → {referencesDir}/cfb27-offense-california.json
 *   cfb27-air-force  → {referencesDir}/cfb27-offense-air-force.json
 *   cfb27-run-and-shoot → {referencesDir}/cfb27-offense-run-and-shoot.json
 *
 * Play-art ingestion is offense-first; the side segment is always `offense`
 * unless the caller passes an explicit --reference path.
 */
export function seedSlugToReferencePath(seedSlug: string, referencesDirectory: string): string {
  const trimmed = seedSlug.trim().toLowerCase();
  const match = trimmed.match(/^(cfb\d+)-(.+)$/);
  if (!match) {
    throw new Error(
      `Cannot derive reference path from seed slug '${seedSlug}'. Expected form like cfb27-california.`,
    );
  }
  const [, game, rest] = match;
  return join(referencesDirectory, `${game}-${DEFAULT_SIDE}-${rest}.json`);
}

export function parseGameFlag(raw: string | undefined): string {
  const value = (raw ?? DEFAULT_GAME).trim().toLowerCase();
  return value || DEFAULT_GAME;
}
