import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { normalizePlayName } from "../../../lib/utils";
import {
  defaultOverridesPath,
  loadMatchingOverrides,
  type PlayArtMatchingOverrides,
} from "../matching-overrides";
import type { PlayArtReference } from "../types";

export type ConfirmWriteResult =
  | {
      ok: true;
      path: string;
      created: boolean;
      previousPlay: string | null;
      /** Other crop that previously owned this play (cleared on transfer). */
      displacedCropId: string | null;
    }
  | { ok: false; error: string };

export type UndoWriteResult =
  | { ok: true; path: string }
  | { ok: false; error: string };

function writeOverridesFile(path: string, overrides: PlayArtMatchingOverrides): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(overrides, null, 2)}\n`, "utf8");
}

/**
 * Operator confirmation write path.
 *
 * Matcher reads formation-scoped overrides and forces PASS via `operator-override`.
 * This is the existing write path that drops REVIEW count on the next matcher run.
 * (USC trusted-hash reuse from the published manifest is separate and read-only here.)
 */
export function writeOperatorConfirmation(input: {
  reference: PlayArtReference;
  formation: string;
  cropId: string;
  playName: string;
  overridesPath?: string;
}): ConfirmWriteResult {
  const path = input.overridesPath ?? defaultOverridesPath(input.reference);
  const formationPlays =
    input.reference.formations.find((f) => f.name === input.formation)?.plays ?? [];
  const normalizedPlay = normalizePlayName(input.playName);
  const allowed = new Set(formationPlays.map((p) => normalizePlayName(p)));
  if (!allowed.has(normalizedPlay)) {
    return {
      ok: false,
      error: `Play "${input.playName}" is not in formation "${input.formation}"`,
    };
  }

  const canonicalPlay =
    formationPlays.find((p) => normalizePlayName(p) === normalizedPlay) ?? input.playName;

  const existed = existsSync(path);
  const overrides = loadMatchingOverrides(path);
  const formationMap = { ...(overrides[input.formation] ?? {}) };
  const previousPlay = formationMap[input.cropId] ?? null;

  // One play → one crop within a formation. If the play is already claimed,
  // transfer ownership to this crop so operators can correct a prior mis-confirm.
  let displacedCropId: string | null = null;
  for (const [otherCrop, otherPlay] of Object.entries(formationMap)) {
    if (otherCrop === input.cropId) continue;
    if (normalizePlayName(otherPlay) === normalizedPlay) {
      delete formationMap[otherCrop];
      displacedCropId = otherCrop;
      break;
    }
  }

  formationMap[input.cropId] = canonicalPlay;
  overrides[input.formation] = formationMap;

  try {
    writeOverridesFile(path, overrides);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Verify read-back
  const verify = loadMatchingOverrides(path);
  if (verify[input.formation]?.[input.cropId] !== canonicalPlay) {
    return { ok: false, error: "Override write verification failed" };
  }
  if (displacedCropId && verify[input.formation]?.[displacedCropId] != null) {
    return { ok: false, error: "Override transfer verification failed" };
  }

  return {
    ok: true,
    path,
    created: !existed || previousPlay == null,
    previousPlay,
    displacedCropId,
  };
}

export function undoOperatorConfirmation(input: {
  reference: PlayArtReference;
  formation: string;
  cropId: string;
  /** Only remove if current value matches what this session wrote. */
  expectedPlay: string;
  /** If the override existed before this session wrote it, refuse undo. */
  wasNew: boolean;
  /** If confirm transferred the play from another crop, restore that claim. */
  displacedCropId?: string | null;
  overridesPath?: string;
}): UndoWriteResult {
  if (!input.wasNew) {
    return {
      ok: false,
      error: "Cannot undo: override existed before this review session",
    };
  }

  const path = input.overridesPath ?? defaultOverridesPath(input.reference);
  if (!existsSync(path)) {
    return { ok: false, error: `Overrides file missing: ${path}` };
  }

  const overrides = loadMatchingOverrides(path);
  const formationMap = { ...(overrides[input.formation] ?? {}) };
  const current = formationMap[input.cropId];
  if (current == null) {
    return { ok: false, error: "Nothing to undo for this crop" };
  }
  if (normalizePlayName(current) !== normalizePlayName(input.expectedPlay)) {
    return {
      ok: false,
      error: `Cannot undo: override changed externally (now "${current}")`,
    };
  }

  delete formationMap[input.cropId];
  if (input.displacedCropId) {
    formationMap[input.displacedCropId] = current;
  }
  if (Object.keys(formationMap).length === 0) {
    delete overrides[input.formation];
  } else {
    overrides[input.formation] = formationMap;
  }

  try {
    writeOverridesFile(path, overrides);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  return { ok: true, path };
}

export function clearOperatorOverride(input: {
  reference: PlayArtReference;
  formation: string;
  cropId: string;
  overridesPath?: string;
}): UndoWriteResult {
  const path = input.overridesPath ?? defaultOverridesPath(input.reference);
  if (!existsSync(path)) {
    return { ok: true, path };
  }
  const overrides = loadMatchingOverrides(path);
  const formationMap = { ...(overrides[input.formation] ?? {}) };
  if (formationMap[input.cropId] == null) {
    return { ok: true, path };
  }
  delete formationMap[input.cropId];
  if (Object.keys(formationMap).length === 0) {
    delete overrides[input.formation];
  } else {
    overrides[input.formation] = formationMap;
  }
  try {
    writeOverridesFile(path, overrides);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  return { ok: true, path };
}

export function overridesPathFor(reference: PlayArtReference): string {
  return defaultOverridesPath(reference);
}
