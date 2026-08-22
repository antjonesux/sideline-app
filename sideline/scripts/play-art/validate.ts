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
): PlayArtValidationReport {
  const errors: string[] = [];
  const formationResults: FormationValidationResult[] = [];

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
    const key = item.assetPath.toLowerCase();
    assetKeyCounts.set(key, (assetKeyCounts.get(key) ?? 0) + 1);
  }
  for (const [key, count] of assetKeyCounts) {
    if (count > 1) {
      errors.push(`Duplicate output asset key: ${key} (${count} mappings)`);
    }
  }

  if (mapped.length !== playCardCount) {
    errors.push(`Unmapped play cards: extracted ${playCardCount}, mapped ${mapped.length}`);
  }

  for (const formation of reference.formations) {
    const expectedPlays = formation.plays.length;
    const extractedPlays = mappedByFormation.get(formation.name)?.length ?? 0;
    const status = extractedPlays === expectedPlays ? "pass" : "fail";
    if (status === "fail") {
      errors.push(
        `Formation "${formation.name}": expected ${expectedPlays} plays, mapped ${extractedPlays}`,
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
    for (const expectedPlay of refFormation.plays) {
      const normalized = normalizePlayName(expectedPlay);
      const count = mappedPlayNames.filter((p) => p === normalized).length;
      if (count === 0) {
        errors.push(`Unfulfilled reference play "${expectedPlay}" in formation "${formationName}"`);
      }
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
