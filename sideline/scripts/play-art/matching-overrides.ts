import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePlayName } from "../../lib/utils";
import { referenceSlug } from "./reference";
import type { PlayArtReference } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Formation-scoped cropId → canonical play name overrides for REVIEW exceptions. */
export type PlayArtMatchingOverrides = Record<string, Record<string, string>>;

export function defaultOverridesPath(reference: PlayArtReference): string {
  return join(__dirname, "matching-overrides", `${referenceSlug(reference)}.json`);
}

export function loadMatchingOverrides(path: string): PlayArtMatchingOverrides {
  if (!existsSync(path)) {
    return {};
  }
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as PlayArtMatchingOverrides;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Invalid matching overrides file: ${path}`);
  }
  return parsed;
}

/**
 * Re-key overrides by current crop→formation location.
 * Needed after formation-OCR remaps move crops between formation buckets.
 */
export function remapOverridesByCropLocation(
  overrides: PlayArtMatchingOverrides,
  availableCropIdsByFormation: Map<string, Set<string>>,
): PlayArtMatchingOverrides {
  const cropToFormation = new Map<string, string>();
  for (const [formation, crops] of availableCropIdsByFormation) {
    for (const cropId of crops) {
      cropToFormation.set(cropId, formation);
    }
  }

  const remapped: PlayArtMatchingOverrides = {};
  for (const cropMap of Object.values(overrides)) {
    for (const [cropId, playName] of Object.entries(cropMap)) {
      const formation = cropToFormation.get(cropId);
      if (!formation) continue;
      remapped[formation] = remapped[formation] ?? {};
      remapped[formation][cropId] = playName;
    }
  }
  return remapped;
}

export type OverrideValidationResult = {
  valid: boolean;
  errors: string[];
  normalized: PlayArtMatchingOverrides;
};

export function validateMatchingOverrides(
  reference: PlayArtReference,
  overrides: PlayArtMatchingOverrides,
  availableCropIdsByFormation: Map<string, Set<string>>,
): OverrideValidationResult {
  const errors: string[] = [];
  const normalized: PlayArtMatchingOverrides = {};

  for (const [formationName, cropMap] of Object.entries(overrides)) {
    const refFormation = reference.formations.find((f) => f.name === formationName);
    if (!refFormation) {
      errors.push(`Override formation not in reference: "${formationName}"`);
      continue;
    }

    const availableCrops = availableCropIdsByFormation.get(formationName);
    if (!availableCrops) {
      errors.push(`Override formation has no extracted crops: "${formationName}"`);
      continue;
    }

    const canonicalPlays = new Set(refFormation.plays.map((p) => normalizePlayName(p)));
    const usedCrops = new Set<string>();
    const usedPlays = new Set<string>();
    const normalizedCrops: Record<string, string> = {};

    for (const [cropId, playName] of Object.entries(cropMap)) {
      if (!availableCrops.has(cropId)) {
        errors.push(`Override crop "${cropId}" not found in formation "${formationName}"`);
        continue;
      }
      const normalizedPlay = normalizePlayName(playName);
      if (!canonicalPlays.has(normalizedPlay)) {
        // After OCR remaps, a play valid in the old formation may not exist in the new one.
        // Drop that override rather than aborting the whole ingest.
        console.warn(
          `Skipping override ${formationName}/${cropId}: play "${playName}" not canonical in remapped formation`,
        );
        continue;
      }
      if (usedCrops.has(cropId)) {
        errors.push(`Duplicate override crop "${cropId}" in formation "${formationName}"`);
        continue;
      }
      if (usedPlays.has(normalizedPlay)) {
        errors.push(
          `Duplicate override play "${normalizedPlay}" in formation "${formationName}"`,
        );
        continue;
      }
      usedCrops.add(cropId);
      usedPlays.add(normalizedPlay);
      normalizedCrops[cropId] = normalizedPlay;
    }

    if (Object.keys(normalizedCrops).length > 0) {
      normalized[formationName] = normalizedCrops;
    }
  }

  return { valid: errors.length === 0, errors, normalized };
}
