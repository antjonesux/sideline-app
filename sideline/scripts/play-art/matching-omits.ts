import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePlayName } from "../../lib/utils";
import { referenceSlug } from "./reference";
import type { PlayArtReference } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Operator-declared vault duplicates: crop is the same printed play as another
 * crop already kept for that formation. Omitted crops PASS as `duplicate-omit`
 * and are not published as a second mapping (one play → one asset).
 */
export type PlayArtMatchingOmit = {
  reason: "duplicate";
  duplicateOf: string;
  keptCropId: string;
};

export type PlayArtMatchingOmits = Record<string, Record<string, PlayArtMatchingOmit>>;

export function defaultOmitsPath(reference: PlayArtReference): string {
  return join(__dirname, "matching-omits", `${referenceSlug(reference)}.json`);
}

export function loadMatchingOmits(path: string): PlayArtMatchingOmits {
  if (!existsSync(path)) return {};
  const parsed = JSON.parse(readFileSync(path, "utf8")) as PlayArtMatchingOmits;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Invalid matching omits file: ${path}`);
  }
  return parsed;
}

export function writeMatchingOmit(input: {
  reference: PlayArtReference;
  formation: string;
  cropId: string;
  duplicateOf: string;
  keptCropId: string;
  omitsPath?: string;
}): { ok: true; path: string } | { ok: false; error: string } {
  const path = input.omitsPath ?? defaultOmitsPath(input.reference);
  const formationPlays =
    input.reference.formations.find((f) => f.name === input.formation)?.plays ?? [];
  const normalizedPlay = normalizePlayName(input.duplicateOf);
  const canonical =
    formationPlays.find((p) => normalizePlayName(p) === normalizedPlay) ?? null;
  if (!canonical) {
    return {
      ok: false,
      error: `Play "${input.duplicateOf}" is not in formation "${input.formation}"`,
    };
  }
  if (input.cropId === input.keptCropId) {
    return { ok: false, error: "Duplicate crop and kept crop must differ" };
  }

  const omits = loadMatchingOmits(path);
  const formationMap = { ...(omits[input.formation] ?? {}) };
  formationMap[input.cropId] = {
    reason: "duplicate",
    duplicateOf: canonical,
    keptCropId: input.keptCropId,
  };
  omits[input.formation] = formationMap;

  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(omits, null, 2)}\n`, "utf8");
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  return { ok: true, path };
}

export function removeMatchingOmit(input: {
  reference: PlayArtReference;
  formation: string;
  cropId: string;
  omitsPath?: string;
}): { ok: true; path: string } | { ok: false; error: string } {
  const path = input.omitsPath ?? defaultOmitsPath(input.reference);
  if (!existsSync(path)) return { ok: false, error: `Omits file missing: ${path}` };
  const omits = loadMatchingOmits(path);
  const formationMap = { ...(omits[input.formation] ?? {}) };
  if (formationMap[input.cropId] == null) {
    return { ok: false, error: "Nothing to undo for this crop omit" };
  }
  delete formationMap[input.cropId];
  if (Object.keys(formationMap).length === 0) delete omits[input.formation];
  else omits[input.formation] = formationMap;
  try {
    writeFileSync(path, `${JSON.stringify(omits, null, 2)}\n`, "utf8");
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  return { ok: true, path };
}

export function omitsPathFor(reference: PlayArtReference): string {
  return defaultOmitsPath(reference);
}
