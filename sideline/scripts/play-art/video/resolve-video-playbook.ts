import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadPlaybookCatalog, SEED_PLAYBOOKS_DIR } from "../source-discovery";
import { teamSlugToSeedSlug } from "../lib/slug-utils";
import { inferDirectorySide, parseVideoFilename } from "./parse-video-filename";
import type { ResolvedVideoSource } from "./types";

/**
 * Resolve video filename → exact game + side + playbook seed.
 * Fail-closed on ambiguity, missing seed, or directory/filename side mismatch.
 */
export function resolveVideoPlaybook(videoPath: string): ResolvedVideoSource {
  const parsed = parseVideoFilename(videoPath);
  const directorySide = inferDirectorySide(videoPath);

  if (directorySide != null && directorySide !== parsed.side) {
    throw new Error(
      `VIDEO SOURCE CONFLICT: filename side (${parsed.side}) disagrees with ` +
        `directory side (${directorySide}).\n` +
        `File: ${videoPath}\n` +
        `Do not guess which is correct — fix the path or rename the file.`,
    );
  }

  const seedSlug = teamSlugToSeedSlug(parsed.playbookSlug, parsed.gameVersion);
  const seedPath = join(SEED_PLAYBOOKS_DIR, `${seedSlug}.ts`);
  if (!existsSync(seedPath)) {
    throw new Error(
      `No ${parsed.gameVersion.toUpperCase()} ${parsed.side} playbook resolved for slug:\n` +
        `  ${parsed.playbookSlug}\n` +
        `Expected seed module: lib/seed/playbooks/${seedSlug}.ts\n` +
        `File: ${parsed.basename}`,
    );
  }

  const catalog = loadPlaybookCatalog(SEED_PLAYBOOKS_DIR);
  const matches = catalog.filter(
    (e) =>
      e.seedSlug === seedSlug &&
      e.gameVersion === parsed.gameVersion &&
      e.sideOfBall === parsed.side,
  );

  if (matches.length === 0) {
    const sameSlug = catalog.filter((e) => e.seedSlug === seedSlug);
    if (sameSlug.length > 0) {
      const got = sameSlug
        .map((e) => `${e.gameVersion}/${e.sideOfBall}/${e.team}`)
        .join(", ");
      throw new Error(
        `Seed ${seedSlug}.ts exists but does not match filename namespace.\n` +
          `Filename requires: ${parsed.gameVersion} / ${parsed.side}\n` +
          `Seed provides: ${got}\n` +
          `File: ${parsed.basename}`,
      );
    }
    throw new Error(
      `No ${parsed.gameVersion.toUpperCase()} ${parsed.side} playbook resolved for slug:\n` +
        `  ${parsed.playbookSlug}`,
    );
  }

  if (matches.length > 1) {
    throw new Error(
      `Ambiguous playbook resolution for ${parsed.basename}: ` +
        matches.map((m) => m.team).join(", "),
    );
  }

  const entry = matches[0];
  return {
    videoPath,
    basename: parsed.basename,
    gameVersion: parsed.gameVersion,
    side: parsed.side,
    playbookSlug: parsed.playbookSlug,
    playbookDisplayName: entry.team,
    seedSlug,
    seedPath,
    directorySide,
  };
}

export function printResolvedVideoSource(resolved: ResolvedVideoSource): void {
  console.log("VIDEO SOURCE");
  console.log(`File: ${resolved.basename}`);
  console.log(`Game: ${resolved.gameVersion.toUpperCase()}`);
  console.log(`Side: ${resolved.side === "offense" ? "Offense" : "Defense"}`);
  console.log(`Playbook: ${resolved.playbookDisplayName}`);
  console.log(`Playbook slug: ${resolved.playbookSlug}`);
  console.log(`Seed: ${resolved.seedSlug}`);
  console.log("Status: READY");
}
