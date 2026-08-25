import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { displayNameToTeamSlug } from "./lib/slug-utils";
import type { PlayArtReference } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function referencesDir(): string {
  return join(__dirname, "references");
}

export function defaultReferencePath(slug: string): string {
  return join(referencesDir(), `${slug}.json`);
}

export function loadPlayArtReference(referencePath: string): PlayArtReference {
  if (!existsSync(referencePath)) {
    throw new Error(`Reference file not found: ${referencePath}`);
  }
  const raw = readFileSync(referencePath, "utf8");
  const parsed = JSON.parse(raw) as PlayArtReference;
  validateReferenceShape(parsed, referencePath);
  return parsed;
}

function validateReferenceShape(ref: PlayArtReference, path: string): void {
  if (ref.gameVersion !== "cfb26" && ref.gameVersion !== "cfb27") {
    throw new Error(`Reference ${path}: gameVersion must be cfb26 or cfb27`);
  }
  if (ref.sideOfBall !== "offense" && ref.sideOfBall !== "defense") {
    throw new Error(`Reference ${path}: sideOfBall must be offense or defense`);
  }
  if (!ref.playbook?.trim()) {
    throw new Error(`Reference ${path}: missing playbook`);
  }
  if (!Array.isArray(ref.formations) || ref.formations.length === 0) {
    throw new Error(`Reference ${path}: formations must be a non-empty array`);
  }
  for (const [i, formation] of ref.formations.entries()) {
    if (!formation.name?.trim()) {
      throw new Error(`Reference ${path}: formation[${i}] missing name`);
    }
    if (!Array.isArray(formation.plays) || formation.plays.length === 0) {
      throw new Error(`Reference ${path}: formation "${formation.name}" must have plays`);
    }
    for (const [j, play] of formation.plays.entries()) {
      if (!play?.trim()) {
        throw new Error(
          `Reference ${path}: formation "${formation.name}" play[${j}] is empty`,
        );
      }
    }
  }
}

export function referenceSlug(ref: PlayArtReference): string {
  return `${ref.gameVersion}-${ref.sideOfBall}-${displayNameToTeamSlug(ref.playbook)}`;
}

export function totalExpectedPlays(ref: PlayArtReference): number {
  return ref.formations.reduce((sum, f) => sum + f.plays.length, 0);
}
