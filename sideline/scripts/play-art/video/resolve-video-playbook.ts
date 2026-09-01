import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadPlaybookCatalog, SEED_PLAYBOOKS_DIR } from "../source-discovery";
import { teamSlugToSeedSlug } from "../lib/slug-utils";
import { inferDirectorySide, parseVideoFilename } from "./parse-video-filename";
import { defenseVideoSlugCandidates } from "./resolve-defense-video-slug";
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

  const slugCandidates =
    parsed.side === "defense"
      ? defenseVideoSlugCandidates(parsed.playbookSlug)
      : [parsed.playbookSlug];

  const catalog = loadPlaybookCatalog(SEED_PLAYBOOKS_DIR);
  const attempted: string[] = [];

  for (const candidateSlug of slugCandidates) {
    const seedSlug = teamSlugToSeedSlug(candidateSlug, parsed.gameVersion);
    attempted.push(seedSlug);
    const seedPath = join(SEED_PLAYBOOKS_DIR, `${seedSlug}.ts`);
    if (!existsSync(seedPath)) {
      continue;
    }

    const matches = catalog.filter(
      (e) =>
        e.seedSlug === seedSlug &&
        e.gameVersion === parsed.gameVersion &&
        e.sideOfBall === parsed.side,
    );

    if (matches.length === 0) {
      const sameSlug = catalog.filter((e) => e.seedSlug === seedSlug);
      if (sameSlug.length > 0) {
        // Side mismatch — try next slug candidate (e.g. offense Multiple vs defense).
        continue;
      }
      continue;
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
      playbookSlug: candidateSlug,
      filenamePlaybookSlug: parsed.playbookSlug,
      playbookDisplayName: entry.team,
      seedSlug,
      seedPath,
      directorySide,
    };
  }

  throw new Error(
    `No ${parsed.gameVersion.toUpperCase()} ${parsed.side} playbook resolved for slug:\n` +
      `  ${parsed.playbookSlug}\n` +
      `Attempted seed modules:\n` +
      attempted.map((s) => `  lib/seed/playbooks/${s}.ts`).join("\n") +
      `\nFile: ${parsed.basename}`,
  );
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
