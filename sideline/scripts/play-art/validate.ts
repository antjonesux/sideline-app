import { normalizePlayName } from "../../lib/utils";
import type {
  MappedPlayArt,
  PlayArtReference,
  PlayArtValidationReport,
  FormationValidationResult,
} from "./types";

export function validatePlayArtMapping(
  reference: PlayArtReference,
  mapped: MappedPlayArt[],
  formationHeaderCount: number,
  playCardCount: number,
  options?: {
    /** Vault duplicate crops omitted from publish mappings. */
    omittedCropCount?: number;
    /** Per-formation allowance for catalog plays with no unique vault card. */
    unfulfilledAllowanceByFormation?: Map<string, number>;
  },
): PlayArtValidationReport {
  const errors: string[] = [];
  const formationResults: FormationValidationResult[] = [];
  const omittedCropCount = options?.omittedCropCount ?? 0;
  const unfulfilledAllowanceByFormation =
    options?.unfulfilledAllowanceByFormation ?? new Map<string, number>();

  const expectedFormations = reference.formations.length;
  if (formationHeaderCount !== expectedFormations) {
    errors.push(
      `Formation count mismatch: expected ${expectedFormations}, extracted ${formationHeaderCount} headers`,
    );
  }

  const expectedTotalPlays = reference.formations.reduce((sum, f) => sum + f.plays.length, 0);
  if (playCardCount !== expectedTotalPlays) {
    errors.push(
      `Total play-card count mismatch: expected ${expectedTotalPlays}, extracted ${playCardCount}`,
    );
  }

  const mappedByFormation = new Map<string, MappedPlayArt[]>();
  for (const item of mapped) {
    if (!item.formation.trim() || !item.playName.trim()) {
      errors.push(`Mapped image at block ${item.blockIndex} missing formation or play name`);
    }
    const list = mappedByFormation.get(item.formation) ?? [];
    list.push(item);
    mappedByFormation.set(item.formation, list);
  }

  const assetKeyCounts = new Map<string, number>();
  for (const item of mapped) {
    if (!item.assetId || !item.assetPath) {
      errors.push(
        `Mapped play "${item.formation}" / "${item.playName}" missing content-hash asset identity`,
      );
    }
    const key = item.assetId.toLowerCase();
    assetKeyCounts.set(key, (assetKeyCounts.get(key) ?? 0) + 1);
  }
  // Content-addressed assets intentionally reuse the same asset_id/path for identical bytes.

  if (mapped.length + omittedCropCount !== playCardCount) {
    errors.push(
      `Unmapped play cards: extracted ${playCardCount}, mapped ${mapped.length}, omitted ${omittedCropCount}`,
    );
  }

  for (const formation of reference.formations) {
    const expectedPlays = formation.plays.length;
    const extractedPlays = mappedByFormation.get(formation.name)?.length ?? 0;
    const allowance = unfulfilledAllowanceByFormation.get(formation.name) ?? 0;
    const status =
      extractedPlays === expectedPlays || extractedPlays + allowance === expectedPlays
        ? "pass"
        : "fail";
    if (status === "fail") {
      errors.push(
        `Formation "${formation.name}": expected ${expectedPlays} plays, mapped ${extractedPlays}` +
          (allowance ? ` (omit allowance ${allowance})` : ""),
      );
    }
    formationResults.push({
      formation: formation.name,
      expectedPlays,
      extractedPlays,
      status,
      message:
        status === "fail"
          ? `Expected ${expectedPlays} play cards, got ${extractedPlays}`
          : undefined,
    });
  }

  for (const [formationName, items] of mappedByFormation) {
    const refFormation = reference.formations.find((f) => f.name === formationName);
    if (!refFormation) {
      errors.push(`Mapped formation not in reference: "${formationName}"`);
      continue;
    }
    const mappedPlayNames = items.map((i) => normalizePlayName(i.playName));
    const unfulfilled: string[] = [];
    for (const expectedPlay of refFormation.plays) {
      const normalized = normalizePlayName(expectedPlay);
      const count = mappedPlayNames.filter((p) => p === normalized).length;
      if (count === 0) {
        unfulfilled.push(expectedPlay);
      }
    }
    const allowance = unfulfilledAllowanceByFormation.get(formationName) ?? 0;
    if (unfulfilled.length > allowance) {
      for (const expectedPlay of unfulfilled) {
        errors.push(`Unfulfilled reference play "${expectedPlay}" in formation "${formationName}"`);
      }
    } else if (unfulfilled.length > 0) {
      console.warn(
        `[WARN] ${formationName}: ${unfulfilled.length} catalog play(s) have no unique vault card ` +
          `(duplicate-omit allowance ${allowance}): ${unfulfilled.join(", ")}`,
      );
    }
  }

  const status = errors.length === 0 ? "pass" : "fail";
  return {
    playbook: reference.playbook,
    status,
    expectedFormations,
    extractedFormationHeaders: formationHeaderCount,
    extractedPlayCards: playCardCount,
    formations: formationResults,
    errors,
  };
}

export function printValidationSummary(report: PlayArtValidationReport): void {
  console.log("");
  console.log(`${report.playbook} — ${report.status.toUpperCase()}`);
  console.log(
    `Formations: ${report.extractedFormationHeaders}/${report.expectedFormations} headers`,
  );
  console.log(`Play cards: ${report.extractedPlayCards} total`);
  console.log("");

  for (const formation of report.formations) {
    console.log(`${report.playbook} / ${formation.formation}`);
    console.log(`expected: ${formation.expectedPlays}`);
    console.log(`extracted: ${formation.extractedPlays}`);
    console.log(formation.status === "pass" ? "PASS" : "FAIL");
    console.log("");
  }

  if (report.errors.length > 0) {
    console.log("Errors:");
    for (const err of report.errors) {
      console.log(`  - ${err}`);
    }
    console.log("");
  }
}
