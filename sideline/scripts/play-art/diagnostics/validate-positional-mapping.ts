#!/usr/bin/env node
/**
 * Read-only diagnostic: simulate positional-first play identity against
 * published operator-approved mappings.
 *
 * Primary evidence path (default): matching reports under scripts/play-art/reports/
 * already encode OCR-confirmed formation buckets + DOCX crop order +
 * positionalPlayName (from mapPlayArtPositionally) + published playName.
 * Those reports are verified 1:1 against play-art-manifest.json before use.
 *
 * Optional:
 *   --re-extract[=slug]     Re-run extractPlayArtDocx + mapPlayArtPositionally
 *                           and compare content-hashed crops to the manifest
 *                           (slow; requires tesseract; sample or single book).
 *   --include-unpublished   Structural candidate scan for DOCXs not yet published
 *                           (section OCR; does not publish).
 *   --playbook=<slug>       Limit to one published playbook slug.
 *
 * Does NOT modify: matcher thresholds, overrides, omits, trusted hashes,
 * DOCXs, manifest, or published assets.
 *
 * Usage (from sideline/):
 *   npm run play-art:validate-positional
 *   npm run play-art:validate-positional -- --playbook=usc
 *   npm run play-art:validate-positional -- --re-extract=air-force
 *   npm run play-art:validate-positional -- --include-unpublished
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePlayName } from "../../../lib/utils";
import { assignContentHashedAssets } from "../content-hash";
import {
  extractPlayArtDocx,
  isDocxOptionalFormation,
} from "../extract-docx";
import { mapPlayArtPositionally } from "../map-positional";
import { defaultOmitsPath, loadMatchingOmits } from "../matching-omits";
import { defaultOverridesPath, loadMatchingOverrides } from "../matching-overrides";
import { loadPlayArtReference, referencesDir } from "../reference";
import {
  discoverAndResolveSources,
  SOURCE_ROOT,
} from "../source-discovery";
import type {
  PlayArtManifestRecord,
  PlayArtMatchingReport,
  PlayArtReference,
} from "../types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SIDELINE_ROOT = join(__dirname, "..", "..", "..");
const PLAY_ART_ROOT = join(__dirname, "..");
const REPORTS_DIR = join(PLAY_ART_ROOT, "reports");
const OUT_DIR = join(__dirname, "reports");
const MANIFEST_PATH = join(SIDELINE_ROOT, "lib", "generated", "play-art-manifest.json");
const REVIEW_STATE_DIR = join(PLAY_ART_ROOT, "review-tool", "state");

type MappingClass =
  | "EXACT_POSITIONAL_MATCH"
  | "POSITIONAL_MISMATCH"
  | "COUNT_MISMATCH"
  | "DUPLICATE_VAULT_CARD"
  | "MISSING_VAULT_CARD"
  | "OPTIONAL_FORMATION_OMITTED"
  | "FORMATION_ASSIGNMENT_FAILURE"
  | "UNKNOWN_EXCEPTION";

type MismatchCause =
  | "VAULT_DUPLICATE"
  | "MISSING_VAULT_CARD"
  | "EXTRA_VAULT_CARD"
  | "DIFFERENT_PLAY_ORDER"
  | "FORMATION_EXTRACTION"
  | "FORMATION_OCR_MISMATCH"
  | "OPERATOR_TRANSFER"
  | "CFB_FAN_DISAGREEMENT_ONLY"
  | "UNKNOWN";

type MappingRow = {
  playbook: string;
  formation: string;
  cropId: string;
  sourceOrder: number;
  simulatedPlay: string | null;
  publishedPlay: string | null;
  matchMethod: string | null;
  classification: MappingClass;
  cause: MismatchCause | null;
};

type FormationRow = {
  playbook: string;
  formation: string;
  canonicalPlayCount: number;
  vaultCropCount: number;
  mappedPositionalCount: number;
  exactMatches: number;
  mismatches: number;
  duplicateOmits: number;
  missingCards: number;
  extraCards: number;
  safePositional: boolean;
  cause: MismatchCause | null;
  notes: string[];
};

type PlaybookRow = {
  playbook: string;
  formations: number;
  safeFormations: number;
  exceptionFormations: number;
  cropsChecked: number;
  exact: number;
  exceptions: number;
  positionalAgreementPct: number;
  formationSafeRatePct: number;
  fullySafe: boolean;
};

type UnpublishedFormationRow = {
  playbook: string;
  formation: string;
  classification: "POSITIONAL_SAFE_CANDIDATE" | "STRUCTURAL_REVIEW" | "FORMATION_FAILURE";
  canonicalPlayCount: number;
  vaultCropCount: number;
  notes: string[];
};

function readFlag(argv: string[], name: string): string | undefined {
  const eq = `${name}=`;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === name && argv[i + 1] && !argv[i + 1].startsWith("-")) {
      return argv[i + 1];
    }
    if (argv[i].startsWith(eq)) return argv[i].slice(eq.length);
  }
  return undefined;
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.some((a) => a === name || a.startsWith(`${name}=`));
}

function pct(n: number, d: number): number {
  if (d <= 0) return 0;
  return Math.round((10000 * n) / d) / 100;
}

function loadManifest(): PlayArtManifestRecord[] {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(`Manifest not found: ${MANIFEST_PATH}`);
  }
  const parsed = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as {
    entries: PlayArtManifestRecord[];
  };
  return parsed.entries.filter(
    (e) => e.side_of_ball.trim().toLowerCase() === "offense",
  );
}

function matchingReportPath(slug: string): string {
  return join(REPORTS_DIR, `cfb27-offense-${slug}-matching.json`);
}

function slugFromMatchingReportFile(fileName: string): string | null {
  const m = /^cfb27-offense-(.+)-matching\.json$/.exec(fileName);
  return m ? m[1] : null;
}

function playbookDisplayToSlug(playbook: string): string {
  return playbook
    .trim()
    .toLowerCase()
    .replace(/\s+&\s+/g, "-and-")
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function verifyReportAgainstManifest(
  report: PlayArtMatchingReport,
  manifestEntries: PlayArtManifestRecord[],
): { ok: boolean; missing: number; extra: number } {
  const pubKeys = new Set(
    manifestEntries.map(
      (e) => `${e.formation.trim()}\0${normalizePlayName(e.play_name)}`,
    ),
  );
  const repKeys = new Set<string>();
  for (const formation of report.formations) {
    for (const a of formation.assignments) {
      if (a.matchMethod === "duplicate-omit") continue;
      repKeys.add(`${a.formation.trim()}\0${normalizePlayName(a.playName)}`);
    }
  }
  let missing = 0;
  let extra = 0;
  for (const k of pubKeys) if (!repKeys.has(k)) missing += 1;
  for (const k of repKeys) if (!pubKeys.has(k)) extra += 1;
  return { ok: missing === 0 && extra === 0, missing, extra };
}

function classifyFormation(
  playbook: string,
  formationName: string,
  expectedPlays: string[],
  assignments: PlayArtMatchingReport["formations"][number]["assignments"],
  overrideCropIds: Set<string>,
): { formation: FormationRow; mappings: MappingRow[] } {
  const notes: string[] = [];
  const mappings: MappingRow[] = [];
  const omits = assignments.filter((a) => a.matchMethod === "duplicate-omit");
  const normal = assignments.filter((a) => a.matchMethod !== "duplicate-omit");

  const canonicalPlayCount = expectedPlays.length;
  const vaultCropCount = assignments.length;
  const publishedPlays = normal.map((a) => normalizePlayName(a.playName));
  const positionalPlays = normal.map((a) =>
    a.positionalPlayName ? normalizePlayName(a.positionalPlayName) : null,
  );

  let exactMatches = 0;
  let mismatches = 0;
  let missingCards = 0;
  let extraCards = 0;
  let cause: MismatchCause | null = null;

  // Count / set analysis first (formation-level cause).
  if (normal.length !== canonicalPlayCount) {
    if (normal.length < canonicalPlayCount) {
      missingCards = canonicalPlayCount - normal.length;
      cause = "MISSING_VAULT_CARD";
      notes.push(
        `Count mismatch: ${normal.length} published crops vs ${canonicalPlayCount} canonical plays`,
      );
    } else {
      extraCards = normal.length - canonicalPlayCount;
      cause = "EXTRA_VAULT_CARD";
      notes.push(
        `Count mismatch: ${normal.length} crops vs ${canonicalPlayCount} canonical plays`,
      );
    }
  } else {
    const pubSet = new Set(publishedPlays);
    const posSet = new Set(positionalPlays.filter((p): p is string => p != null));
    const sameSet =
      pubSet.size === publishedPlays.length &&
      posSet.size === positionalPlays.length &&
      publishedPlays.length === positionalPlays.length &&
      [...pubSet].every((p) => posSet.has(p));

    if (!sameSet) {
      cause = "UNKNOWN";
      notes.push("Published play set ≠ positional play set at equal counts");
    } else {
      const allExact = normal.every(
        (a) =>
          a.positionalPlayName != null &&
          normalizePlayName(a.playName) === normalizePlayName(a.positionalPlayName),
      );
      if (!allExact) {
        cause = "DIFFERENT_PLAY_ORDER";
        notes.push("Same play set; Vault DOCX order ≠ canonical seed order");
      }
    }
  }

  if (omits.length > 0) {
    notes.push(`${omits.length} duplicate-omit crop(s)`);
    if (cause == null) cause = "VAULT_DUPLICATE";
  }

  for (const a of omits) {
    mappings.push({
      playbook,
      formation: formationName,
      cropId: a.cropId,
      sourceOrder: a.sourceOrder,
      simulatedPlay: a.positionalPlayName
        ? normalizePlayName(a.positionalPlayName)
        : null,
      publishedPlay: null,
      matchMethod: a.matchMethod,
      classification: "DUPLICATE_VAULT_CARD",
      cause: "VAULT_DUPLICATE",
    });
  }

  for (const a of normal) {
    const simulated = a.positionalPlayName
      ? normalizePlayName(a.positionalPlayName)
      : null;
    const published = normalizePlayName(a.playName);
    const exact = simulated != null && simulated === published;
    if (exact) exactMatches += 1;
    else mismatches += 1;

    let rowCause: MismatchCause | null = null;
    let classification: MappingClass = exact
      ? "EXACT_POSITIONAL_MATCH"
      : "POSITIONAL_MISMATCH";

    if (!exact) {
      if (cause === "DIFFERENT_PLAY_ORDER") rowCause = "DIFFERENT_PLAY_ORDER";
      else if (cause === "MISSING_VAULT_CARD") rowCause = "MISSING_VAULT_CARD";
      else if (cause === "EXTRA_VAULT_CARD") rowCause = "EXTRA_VAULT_CARD";
      else if (
        a.matchMethod === "operator-override" &&
        overrideCropIds.has(a.cropId)
      ) {
        rowCause = "OPERATOR_TRANSFER";
      } else {
        rowCause = cause ?? "UNKNOWN";
      }

      // Operator chose positional name while visual path needed REVIEW —
      // still a positional match at crop level when exact; when not exact and
      // override restored a different play, mark transfer.
      if (
        a.matchMethod === "operator-override" &&
        simulated != null &&
        simulated === published
      ) {
        // already exact
      } else if (
        a.matchMethod === "operator-override" &&
        !exact &&
        rowCause === "DIFFERENT_PLAY_ORDER"
      ) {
        // Keep DIFFERENT_PLAY_ORDER as primary structural cause; note transfer.
        notes.push(`override crop ${a.cropId}: ${published} (pos ${simulated})`);
      }
    } else if (
      a.matchMethod === "operator-override" &&
      simulated === published
    ) {
      // Evidence for cfb.fan disagreement: operator sealed to positional.
      rowCause = "CFB_FAN_DISAGREEMENT_ONLY";
    }

    if (simulated == null && !exact) {
      classification = "UNKNOWN_EXCEPTION";
      rowCause = "UNKNOWN";
    }

    mappings.push({
      playbook,
      formation: formationName,
      cropId: a.cropId,
      sourceOrder: a.sourceOrder,
      simulatedPlay: simulated,
      publishedPlay: published,
      matchMethod: a.matchMethod,
      classification,
      cause: exact ? rowCause : rowCause,
    });
  }

  // Safe when every normal crop matches positional; duplicate omits are explicit exceptions.
  const safePositional =
    mismatches === 0 &&
    missingCards === 0 &&
    extraCards === 0 &&
    normal.length === canonicalPlayCount;

  if (!safePositional && cause == null) {
    cause = "UNKNOWN";
  }

  return {
    formation: {
      playbook,
      formation: formationName,
      canonicalPlayCount,
      vaultCropCount,
      mappedPositionalCount: normal.length,
      exactMatches,
      mismatches,
      duplicateOmits: omits.length,
      missingCards,
      extraCards,
      safePositional,
      cause: safePositional ? null : cause,
      notes,
    },
    mappings,
  };
}

function analyzePlaybookFromReport(
  report: PlayArtMatchingReport,
  reference: PlayArtReference | null,
): {
  formations: FormationRow[];
  mappings: MappingRow[];
  playbook: PlaybookRow;
  optionalOmitted: number;
} {
  const overridePath = reference
    ? defaultOverridesPath(reference)
    : join(
        PLAY_ART_ROOT,
        "matching-overrides",
        `cfb27-offense-${playbookDisplayToSlug(report.playbook)}.json`,
      );
  const overrides = loadMatchingOverrides(overridePath);
  const overrideCropIds = new Set<string>();
  for (const cropMap of Object.values(overrides)) {
    for (const cropId of Object.keys(cropMap)) overrideCropIds.add(cropId);
  }

  const expectedByFormation = new Map<string, string[]>();
  if (reference) {
    for (const f of reference.formations) {
      if (isDocxOptionalFormation(f.name, reference.playbook)) {
        const hasCrops = report.formations.some(
          (rf) => rf.formation.trim() === f.name.trim(),
        );
        if (!hasCrops) {
          expectedByFormation.set(f.name, f.plays);
        }
      }
      expectedByFormation.set(f.name, f.plays);
    }
  }

  const formations: FormationRow[] = [];
  const mappings: MappingRow[] = [];
  let optionalOmitted = 0;

  if (reference) {
    for (const f of reference.formations) {
      if (!isDocxOptionalFormation(f.name, reference.playbook)) continue;
      const has = report.formations.some(
        (rf) => rf.formation.trim().toLowerCase() === f.name.trim().toLowerCase(),
      );
      if (!has) {
        optionalOmitted += 1;
        formations.push({
          playbook: report.playbook,
          formation: f.name,
          canonicalPlayCount: f.plays.length,
          vaultCropCount: 0,
          mappedPositionalCount: 0,
          exactMatches: 0,
          mismatches: 0,
          duplicateOmits: 0,
          missingCards: 0,
          extraCards: 0,
          safePositional: true,
          cause: null,
          notes: ["OPTIONAL_FORMATION_OMITTED — absent from Vault DOCX (expected)"],
        });
      }
    }
  }

  for (const rf of report.formations) {
    const expected =
      expectedByFormation.get(rf.formation) ??
      rf.assignments
        .filter((a) => a.matchMethod !== "duplicate-omit")
        .map((a) => a.playName);
    const { formation, mappings: rows } = classifyFormation(
      report.playbook,
      rf.formation,
      expected,
      rf.assignments,
      overrideCropIds,
    );
    // Prefer report expectedPlays when reference plays length differs due to omit allowance.
    if (rf.expectedPlays > 0 && expected.length !== rf.expectedPlays) {
      formation.canonicalPlayCount = rf.expectedPlays;
    }
    formations.push(formation);
    mappings.push(...rows);
  }

  const comparable = mappings.filter(
    (m) =>
      m.classification === "EXACT_POSITIONAL_MATCH" ||
      m.classification === "POSITIONAL_MISMATCH",
  );
  const exact = comparable.filter(
    (m) => m.classification === "EXACT_POSITIONAL_MATCH",
  ).length;
  const ownedFormations = formations.filter(
    (f) => !f.notes.some((n) => n.startsWith("OPTIONAL_FORMATION_OMITTED")),
  );
  const safeFormations = ownedFormations.filter((f) => f.safePositional).length;

  const playbook: PlaybookRow = {
    playbook: report.playbook,
    formations: ownedFormations.length,
    safeFormations,
    exceptionFormations: ownedFormations.length - safeFormations,
    cropsChecked: comparable.length,
    exact,
    exceptions: comparable.length - exact,
    positionalAgreementPct: pct(exact, comparable.length),
    formationSafeRatePct: pct(safeFormations, ownedFormations.length),
    fullySafe: safeFormations === ownedFormations.length && ownedFormations.length > 0,
  };

  return { formations, mappings, playbook, optionalOmitted };
}

function analyzeHumanReviewImpact(
  allMappings: MappingRow[],
  formationRows: FormationRow[],
): {
  historicalReviewCount: number;
  historicalReviewed: number;
  historicalSkipped: number;
  positionallyCorrectReviews: number;
  genuinePositionalAnomalyReviews: number;
  estimatedReviewsAvoidable: number;
  estimatedReductionPct: number;
  note: string;
} {
  let historicalReviewCount = 0;
  let historicalReviewed = 0;
  let historicalSkipped = 0;

  if (existsSync(REVIEW_STATE_DIR)) {
    for (const file of readdirSync(REVIEW_STATE_DIR)) {
      if (!file.endsWith(".json")) continue;
      const raw = JSON.parse(
        readFileSync(join(REVIEW_STATE_DIR, file), "utf8"),
      ) as {
        reviewCount?: number;
        reviewed?: string[];
        skipped?: unknown[];
      };
      historicalReviewCount += raw.reviewCount ?? 0;
      historicalReviewed += raw.reviewed?.length ?? 0;
      historicalSkipped += raw.skipped?.length ?? 0;
    }
  }

  const safeFormationKeys = new Set(
    formationRows
      .filter((f) => f.safePositional)
      .map((f) => `${f.playbook}\0${f.formation}`),
  );

  // Crops that needed operator override but ended at positional name —
  // evidence that visual REVIEW disagreed with positional truth.
  const overridePositionalWins = allMappings.filter(
    (m) =>
      m.matchMethod === "operator-override" &&
      m.classification === "EXACT_POSITIONAL_MATCH",
  );

  // Among historical reviews, only formation-safe positional crops would have
  // avoided REVIEW under positional-first. Almost none of the corpus is safe.
  const avoidableIfSafeFormation = allMappings.filter(
    (m) =>
      m.matchMethod === "operator-override" &&
      safeFormationKeys.has(`${m.playbook}\0${m.formation}`),
  ).length;

  const positionallyCorrectReviews = overridePositionalWins.length;
  const genuinePositionalAnomalyReviews = Math.max(
    0,
    historicalReviewed - positionallyCorrectReviews,
  );

  return {
    historicalReviewCount,
    historicalReviewed,
    historicalSkipped,
    positionallyCorrectReviews,
    genuinePositionalAnomalyReviews,
    estimatedReviewsAvoidable: avoidableIfSafeFormation,
    estimatedReductionPct: pct(avoidableIfSafeFormation, historicalReviewCount),
    note:
      "Historical REVIEW counts come from review-tool/state/*.json (post-queue). " +
      "Current matching reports are REVIEW=0 after overrides. " +
      "Avoidable estimate counts only overrides inside formations that are fully positional-safe — " +
      "which is nearly empty when Vault order ≠ seed order.",
  };
}

async function reExtractCompare(input: {
  slug: string;
  sourcePath: string;
  reference: PlayArtReference;
  manifestEntries: PlayArtManifestRecord[];
}): Promise<{
  slug: string;
  compared: number;
  exact: number;
  mismatches: number;
  sampleMismatches: Array<{
    formation: string;
    simulatedPlay: string;
    publishedPlay: string | null;
    assetId: string;
  }>;
}> {
  const extracted = await extractPlayArtDocx(input.sourcePath, input.reference, {
    skipFormationOcr: true,
  });
  const effective = extracted.effectiveReference ?? input.reference;
  const positional = mapPlayArtPositionally(effective, extracted);
  const hashed = assignContentHashedAssets(
    effective,
    positional.mapped,
    extracted.mediaFiles,
  );

  const byAsset = new Map<string, { formation: string; play: string }>();
  for (const e of input.manifestEntries) {
    byAsset.set(e.asset_id.toLowerCase(), {
      formation: e.formation.trim(),
      play: normalizePlayName(e.play_name),
    });
  }

  let exact = 0;
  let mismatches = 0;
  const sampleMismatches: Array<{
    formation: string;
    simulatedPlay: string;
    publishedPlay: string | null;
    assetId: string;
  }> = [];

  for (const row of hashed.mapped) {
    const published = byAsset.get(row.assetId.toLowerCase());
    const simPlay = normalizePlayName(row.playName);
    if (
      published &&
      published.formation === row.formation.trim() &&
      published.play === simPlay
    ) {
      exact += 1;
    } else {
      mismatches += 1;
      if (sampleMismatches.length < 12) {
        sampleMismatches.push({
          formation: row.formation,
          simulatedPlay: simPlay,
          publishedPlay: published?.play ?? null,
          assetId: row.assetId.slice(0, 12),
        });
      }
    }
  }

  return {
    slug: input.slug,
    compared: hashed.mapped.length,
    exact,
    mismatches,
    sampleMismatches,
  };
}

async function analyzeUnpublished(
  limit?: number,
): Promise<UnpublishedFormationRow[]> {
  const manifest = loadManifest();
  const published = new Set(
    manifest.map((e) => e.playbook.trim().toLowerCase()),
  );
  const discovered = discoverAndResolveSources();
  const unpublished = discovered.filter((r) => {
    if (r.status !== "MATCH" && r.status !== "ALIAS") return false;
    return !published.has((r.resolvedPlaybook ?? "").trim().toLowerCase());
  });

  const rows: UnpublishedFormationRow[] = [];
  const targets = limit != null ? unpublished.slice(0, limit) : unpublished;

  for (const hit of targets) {
    const sourcePath = join(SOURCE_ROOT, hit.sourcePath);
    const seedSlug = hit.resolvedSeed ?? "";
    const teamSlug = seedSlug.replace(/^cfb\d+-/, "");
    const refPath = join(referencesDir(), `cfb27-offense-${teamSlug}.json`);
    if (!existsSync(refPath)) {
      rows.push({
        playbook: hit.resolvedPlaybook ?? hit.fileName,
        formation: "(all)",
        classification: "FORMATION_FAILURE",
        canonicalPlayCount: 0,
        vaultCropCount: 0,
        notes: [`Missing reference: ${refPath}`],
      });
      continue;
    }
    if (!existsSync(sourcePath)) {
      rows.push({
        playbook: hit.resolvedPlaybook ?? hit.fileName,
        formation: "(all)",
        classification: "FORMATION_FAILURE",
        canonicalPlayCount: 0,
        vaultCropCount: 0,
        notes: [`DOCX missing: ${sourcePath}`],
      });
      continue;
    }

    const reference = loadPlayArtReference(refPath);
    const omits = loadMatchingOmits(defaultOmitsPath(reference));
    console.log(`  Unpublished structural: ${reference.playbook}…`);

    try {
      const extracted = await extractPlayArtDocx(sourcePath, reference, {
        skipFormationOcr: true,
      });
      const effective = extracted.effectiveReference ?? reference;
      const per = extracted.structure.perFormation ?? [];

      for (const f of effective.formations) {
        const row = per.find((p) => p.formation === f.name);
        const cropCount = row?.extractedPlays ?? 0;
        const notes: string[] = [];
        const omitCrops = Object.keys(omits[f.name] ?? {}).length;
        if (omitCrops > 0) notes.push(`${omitCrops} known matching-omit(s)`);

        let classification: UnpublishedFormationRow["classification"] =
          "POSITIONAL_SAFE_CANDIDATE";
        if (cropCount !== f.plays.length) {
          classification = "STRUCTURAL_REVIEW";
          notes.push(`crop count ${cropCount} ≠ canonical ${f.plays.length}`);
        }
        if (omitCrops > 0) {
          classification = "STRUCTURAL_REVIEW";
        }

        rows.push({
          playbook: reference.playbook,
          formation: f.name,
          classification,
          canonicalPlayCount: f.plays.length,
          vaultCropCount: cropCount,
          notes,
        });
      }

      for (const omitted of extracted.structure.omittedFormations ?? []) {
        rows.push({
          playbook: reference.playbook,
          formation: omitted.formation,
          classification: "POSITIONAL_SAFE_CANDIDATE",
          canonicalPlayCount: omitted.expectedPlays,
          vaultCropCount: 0,
          notes: ["optional formation absent from DOCX"],
        });
      }
    } catch (err) {
      rows.push({
        playbook: hit.resolvedPlaybook ?? hit.fileName,
        formation: "(all)",
        classification: "FORMATION_FAILURE",
        canonicalPlayCount: 0,
        vaultCropCount: 0,
        notes: [err instanceof Error ? err.message : String(err)],
      });
    }
  }

  return rows;
}

function printOperatorSummary(input: {
  playbooks: PlaybookRow[];
  formations: FormationRow[];
  mappings: MappingRow[];
  human: ReturnType<typeof analyzeHumanReviewImpact>;
  causeCounts: Record<MismatchCause, number>;
  classCounts: Record<MappingClass, number>;
  recommendation: string;
  reExtract?: Awaited<ReturnType<typeof reExtractCompare>>[];
  unpublished?: UnpublishedFormationRow[];
}): void {
  const ownedFormations = input.formations.filter(
    (f) => !f.notes.some((n) => n.startsWith("OPTIONAL_FORMATION_OMITTED")),
  );
  const safeFormations = ownedFormations.filter((f) => f.safePositional);
  const comparable = input.mappings.filter(
    (m) =>
      m.classification === "EXACT_POSITIONAL_MATCH" ||
      m.classification === "POSITIONAL_MISMATCH",
  );
  const exact = comparable.filter(
    (m) => m.classification === "EXACT_POSITIONAL_MATCH",
  ).length;
  const fullySafe = input.playbooks.filter((p) => p.fullySafe);

  console.log("");
  console.log("═".repeat(72));
  console.log("POSITIONAL-FIRST VALIDATION — OPERATOR REPORT");
  console.log("═".repeat(72));
  console.log("");
  console.log("Coverage");
  console.log(`  Playbooks analyzed:     ${input.playbooks.length}`);
  console.log(`  Formations analyzed:    ${ownedFormations.length}`);
  console.log(`  Mappings analyzed:      ${comparable.length}`);
  console.log("");
  console.log("Agreement");
  console.log(`  Exact positional mappings: ${exact}`);
  console.log(`  Mapping agreement:         ${pct(exact, comparable.length)}%`);
  console.log(
    `  Safe formations:           ${safeFormations.length} / ${ownedFormations.length}`,
  );
  console.log(
    `  Formation safe rate:       ${pct(safeFormations.length, ownedFormations.length)}%`,
  );
  console.log(
    `  Fully-safe playbooks:      ${fullySafe.length} / ${input.playbooks.length}`,
  );
  console.log("");
  console.log("Exceptions (formation-level primary causes)");
  console.log(`  Different play order:    ${input.causeCounts.DIFFERENT_PLAY_ORDER}`);
  console.log(`  Vault duplicate:         ${input.causeCounts.VAULT_DUPLICATE}`);
  console.log(`  Missing Vault card:      ${input.causeCounts.MISSING_VAULT_CARD}`);
  console.log(`  Extra Vault card:        ${input.causeCounts.EXTRA_VAULT_CARD}`);
  console.log(`  Formation OCR failure:   ${input.causeCounts.FORMATION_OCR_MISMATCH}`);
  console.log(`  Operator transfer:       ${input.causeCounts.OPERATOR_TRANSFER}`);
  console.log(`  cfb.fan disagreement:    ${input.causeCounts.CFB_FAN_DISAGREEMENT_ONLY}`);
  console.log(`  Unknown:                 ${input.causeCounts.UNKNOWN}`);
  console.log("");
  console.log("Mapping classifications");
  for (const [k, v] of Object.entries(input.classCounts).sort()) {
    console.log(`  ${k}: ${v}`);
  }
  console.log("");
  console.log("Human review impact");
  console.log(`  Historical REVIEWs (state reviewCount): ${input.human.historicalReviewCount}`);
  console.log(`  Historical reviewed crop keys:          ${input.human.historicalReviewed}`);
  console.log(`  Positionally correct overrides:         ${input.human.positionallyCorrectReviews}`);
  console.log(`  Estimated reviews avoidable (safe fm):  ${input.human.estimatedReviewsAvoidable}`);
  console.log(`  Estimated reduction:                    ${input.human.estimatedReductionPct}%`);
  console.log(`  Note: ${input.human.note}`);
  console.log("");

  const worst = [...ownedFormations]
    .filter((f) => !f.safePositional)
    .sort((a, b) => b.mismatches - a.mismatches || a.playbook.localeCompare(b.playbook))
    .slice(0, 15);
  console.log("Worst offenders (by mismatch count)");
  for (const f of worst) {
    console.log(
      `  ${f.playbook} / ${f.formation}: exact ${f.exactMatches}/${f.mappedPositionalCount}` +
        ` cause=${f.cause ?? "n/a"}`,
    );
  }
  console.log("");

  const wins = input.mappings
    .filter(
      (m) =>
        m.matchMethod === "operator-override" &&
        m.classification === "EXACT_POSITIONAL_MATCH",
    )
    .slice(0, 12);
  console.log("Representative wins (operator override sealed to positional name)");
  if (wins.length === 0) {
    console.log("  (none in corpus — overrides rarely restore seed-order positional names)");
  } else {
    for (const w of wins) {
      console.log(
        `  ${w.playbook} / ${w.formation} / ${w.cropId} → ${w.publishedPlay}`,
      );
    }
  }
  console.log("");
  console.log(`Recommendation: ${input.recommendation}`);
  console.log("");

  if (input.reExtract && input.reExtract.length > 0) {
    console.log("Re-extract asset-identity checks");
    for (const r of input.reExtract) {
      console.log(
        `  ${r.slug}: exact ${r.exact}/${r.compared} (${pct(r.exact, r.compared)}%)`,
      );
    }
    console.log("");
  }

  if (input.unpublished) {
    const cand = input.unpublished.filter(
      (u) => u.classification === "POSITIONAL_SAFE_CANDIDATE",
    ).length;
    const review = input.unpublished.filter(
      (u) => u.classification === "STRUCTURAL_REVIEW",
    ).length;
    const fail = input.unpublished.filter(
      (u) => u.classification === "FORMATION_FAILURE",
    ).length;
    console.log("Unpublished structural scan");
    console.log(`  POSITIONAL_SAFE_CANDIDATE: ${cand}`);
    console.log(`  STRUCTURAL_REVIEW:        ${review}`);
    console.log(`  FORMATION_FAILURE:        ${fail}`);
    console.log(
      "  (Candidates are structural only — no operator ground truth.)",
    );
    console.log("");
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (hasFlag(argv, "--help") || hasFlag(argv, "-h")) {
    console.log(`validate-positional-mapping.ts

Read-only simulation of positional-first mapping vs published ground truth.

  npm run play-art:validate-positional
  npm run play-art:validate-positional -- --playbook=usc
  npm run play-art:validate-positional -- --re-extract=air-force
  npm run play-art:validate-positional -- --include-unpublished
  npm run play-art:validate-positional -- --include-unpublished --unpublished-limit=3
`);
    process.exit(0);
  }

  const playbookFilter = readFlag(argv, "--playbook")?.trim().toLowerCase();
  const reExtractFlag = hasFlag(argv, "--re-extract");
  const reExtractSlug =
    readFlag(argv, "--re-extract")?.trim().toLowerCase() || undefined;
  const includeUnpublished = hasFlag(argv, "--include-unpublished");
  const unpublishedLimitRaw = readFlag(argv, "--unpublished-limit");
  const unpublishedLimit = unpublishedLimitRaw
    ? Number(unpublishedLimitRaw)
    : undefined;

  mkdirSync(OUT_DIR, { recursive: true });

  console.log("Positional-first validation (read-only)");
  console.log("  Evidence: matching reports ↔ published manifest (1:1 verified)");
  console.log(
    "  Simulation: crop[i] → seed play[i] via positionalPlayName (mapPlayArtPositionally)",
  );
  console.log("  Visual matcher / overrides / omits are NOT used for the simulated assignment.");

  const manifest = loadManifest();
  const byPlaybook = new Map<string, PlayArtManifestRecord[]>();
  for (const e of manifest) {
    const key = e.playbook.trim();
    const list = byPlaybook.get(key) ?? [];
    list.push(e);
    byPlaybook.set(key, list);
  }

  const reportFiles = readdirSync(REPORTS_DIR)
    .filter((f) => f.endsWith("-matching.json"))
    .sort();

  const allFormations: FormationRow[] = [];
  const allMappings: MappingRow[] = [];
  const playbookRows: PlaybookRow[] = [];
  const skipped: string[] = [];
  const manifestMismatchedReports: string[] = [];

  for (const file of reportFiles) {
    const slug = slugFromMatchingReportFile(file);
    if (!slug) continue;
    if (playbookFilter && slug !== playbookFilter && !slug.includes(playbookFilter)) {
      continue;
    }

    const report = JSON.parse(
      readFileSync(join(REPORTS_DIR, file), "utf8"),
    ) as PlayArtMatchingReport;

    const entries = byPlaybook.get(report.playbook.trim()) ?? [];
    if (entries.length === 0) {
      skipped.push(`${report.playbook}: no manifest entries`);
      continue;
    }

    const check = verifyReportAgainstManifest(report, entries);
    if (!check.ok) {
      manifestMismatchedReports.push(
        `${report.playbook}: missing=${check.missing} extra=${check.extra}`,
      );
      // Still analyze — but flag.
    }

    const refPath = join(referencesDir(), `cfb27-offense-${slug}.json`);
    const reference = existsSync(refPath) ? loadPlayArtReference(refPath) : null;

    const analyzed = analyzePlaybookFromReport(report, reference);
    playbookRows.push(analyzed.playbook);
    allFormations.push(...analyzed.formations);
    allMappings.push(...analyzed.mappings);
  }

  const causeCounts: Record<MismatchCause, number> = {
    VAULT_DUPLICATE: 0,
    MISSING_VAULT_CARD: 0,
    EXTRA_VAULT_CARD: 0,
    DIFFERENT_PLAY_ORDER: 0,
    FORMATION_EXTRACTION: 0,
    FORMATION_OCR_MISMATCH: 0,
    OPERATOR_TRANSFER: 0,
    CFB_FAN_DISAGREEMENT_ONLY: 0,
    UNKNOWN: 0,
  };
  for (const f of allFormations) {
    if (f.notes.some((n) => n.startsWith("OPTIONAL_FORMATION_OMITTED"))) continue;
    if (f.safePositional) continue;
    if (f.cause) causeCounts[f.cause] += 1;
    else causeCounts.UNKNOWN += 1;
  }

  const classCounts = {
    EXACT_POSITIONAL_MATCH: 0,
    POSITIONAL_MISMATCH: 0,
    COUNT_MISMATCH: 0,
    DUPLICATE_VAULT_CARD: 0,
    MISSING_VAULT_CARD: 0,
    OPTIONAL_FORMATION_OMITTED: 0,
    FORMATION_ASSIGNMENT_FAILURE: 0,
    UNKNOWN_EXCEPTION: 0,
  } as Record<MappingClass, number>;
  for (const m of allMappings) {
    classCounts[m.classification] += 1;
  }
  for (const f of allFormations) {
    if (f.notes.some((n) => n.startsWith("OPTIONAL_FORMATION_OMITTED"))) {
      classCounts.OPTIONAL_FORMATION_OMITTED += 1;
    }
  }

  const human = analyzeHumanReviewImpact(allMappings, allFormations);

  const ownedFormations = allFormations.filter(
    (f) => !f.notes.some((n) => n.startsWith("OPTIONAL_FORMATION_OMITTED")),
  );
  const safeFormations = ownedFormations.filter((f) => f.safePositional).length;
  const comparable = allMappings.filter(
    (m) =>
      m.classification === "EXACT_POSITIONAL_MATCH" ||
      m.classification === "POSITIONAL_MISMATCH",
  );
  const exact = comparable.filter(
    (m) => m.classification === "EXACT_POSITIONAL_MATCH",
  ).length;
  const mappingAgreement = pct(exact, comparable.length);
  const formationSafeRate = pct(safeFormations, ownedFormations.length);
  const fullySafePlaybooks = playbookRows.filter((p) => p.fullySafe).length;
  const differentOrderDominant =
    causeCounts.DIFFERENT_PLAY_ORDER >= ownedFormations.length * 0.5;

  let recommendation:
    | "ADOPT POSITIONAL-FIRST"
    | "HYBRID POSITIONAL-FIRST"
    | "KEEP VISUAL-FIRST" = "KEEP VISUAL-FIRST";
  let recommendationWhy = "";

  if (
    mappingAgreement >= 99 &&
    formationSafeRate >= 99 &&
    causeCounts.DIFFERENT_PLAY_ORDER <= ownedFormations.length * 0.01
  ) {
    recommendation = "ADOPT POSITIONAL-FIRST";
    recommendationWhy =
      "≥99% mapping agreement and different-order mismatches are extremely rare; " +
      "remaining exceptions are structurally detectable (omits / count / OCR).";
  } else if (
    mappingAgreement >= 90 ||
    (formationSafeRate >= 50 && !differentOrderDominant)
  ) {
    recommendation = "HYBRID POSITIONAL-FIRST";
    recommendationWhy =
      "A material share of formations is positional-safe, and exceptions look structurally gated.";
  } else {
    recommendation = "KEEP VISUAL-FIRST";
    recommendationWhy =
      `Mapping agreement is only ${mappingAgreement}% and ${causeCounts.DIFFERENT_PLAY_ORDER}/` +
      `${ownedFormations.length} unsafe formations are DIFFERENT_PLAY_ORDER — Vault DOCX card order ` +
      `within an OCR-correct formation does not match canonical seed play order. ` +
      `Positional-first would systematically mislabel plays. Keep visual matching as the ` +
      `primary identity mechanism; retain OCR for formation assignment only.`;
  }

  let reExtractResults: Awaited<ReturnType<typeof reExtractCompare>>[] | undefined;
  if (reExtractFlag) {
    reExtractResults = [];
    const discovered = discoverAndResolveSources();
    const slugs =
      reExtractSlug && reExtractSlug !== "true" && reExtractSlug !== "1"
        ? [reExtractSlug]
        : ["air-force", "usc", "california"].filter((s) =>
            existsSync(matchingReportPath(s)),
          );

    console.log(`Re-extract sample: ${slugs.join(", ")}`);
    for (const slug of slugs) {
      const hit = discovered.find((r) => {
        if (r.status !== "MATCH" && r.status !== "ALIAS") return false;
        return (r.resolvedSeed ?? "").toLowerCase() === `cfb27-${slug}`;
      });
      const refPath = join(referencesDir(), `cfb27-offense-${slug}.json`);
      if (!hit || !existsSync(refPath)) {
        console.warn(`  skip ${slug}: missing source or reference`);
        continue;
      }
      const reference = loadPlayArtReference(refPath);
      const sourcePath = join(SOURCE_ROOT, hit.sourcePath);
      const entries = byPlaybook.get(reference.playbook.trim()) ?? [];
      console.log(`  Extracting ${reference.playbook}…`);
      const result = await reExtractCompare({
        slug,
        sourcePath,
        reference,
        manifestEntries: entries,
      });
      reExtractResults.push(result);
      console.log(
        `  ${slug}: asset-exact ${result.exact}/${result.compared} (${pct(result.exact, result.compared)}%)`,
      );
    }
  }

  let unpublishedRows: UnpublishedFormationRow[] | undefined;
  if (includeUnpublished) {
    console.log("Scanning unpublished DOCXs (structural only)…");
    unpublishedRows = await analyzeUnpublished(unpublishedLimit);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: "read-only",
    evidencePath:
      "matching reports (OCR formation + DOCX crop order + positionalPlayName) verified against manifest",
    coverage: {
      playbooksAnalyzed: playbookRows.length,
      formationsAnalyzed: ownedFormations.length,
      mappingsAnalyzed: comparable.length,
      optionalFormationsNoted: allFormations.length - ownedFormations.length,
      skipped,
      manifestMismatchedReports,
    },
    agreement: {
      exactPositionalMappings: exact,
      mappingAgreementPct: mappingAgreement,
      safeFormations: safeFormations,
      formationSafeRatePct: formationSafeRate,
      fullySafePlaybooks,
      playbookFullySafeRatePct: pct(fullySafePlaybooks, playbookRows.length),
    },
    exceptions: {
      formationCauses: causeCounts,
      mappingClasses: classCounts,
    },
    humanReviewImpact: human,
    recommendation,
    recommendationWhy,
    failClosedEligibilityRulesIfHybridOrAdopt: [
      "Formation header OCR must resolve uniquely (existing fail-closed gates).",
      "Vault crop count must equal canonical play count after optional-formation omission.",
      "No matching-omit / duplicate-name-band signals unless explicitly classified.",
      "Positional assignment allowed ONLY when formation is structural-safe AND prior corpus evidence shows order agreement for that scheme — currently almost never true.",
      "Otherwise keep visual matcher + operator REVIEW.",
      "Never invent assets for missing cards; never dual-publish vault duplicates.",
    ],
    playbooks: playbookRows.sort((a, b) =>
      a.positionalAgreementPct - b.positionalAgreementPct ||
      a.playbook.localeCompare(b.playbook),
    ),
    reExtract: reExtractResults,
    unpublished: unpublishedRows
      ? {
          formations: unpublishedRows,
          counts: {
            POSITIONAL_SAFE_CANDIDATE: unpublishedRows.filter(
              (u) => u.classification === "POSITIONAL_SAFE_CANDIDATE",
            ).length,
            STRUCTURAL_REVIEW: unpublishedRows.filter(
              (u) => u.classification === "STRUCTURAL_REVIEW",
            ).length,
            FORMATION_FAILURE: unpublishedRows.filter(
              (u) => u.classification === "FORMATION_FAILURE",
            ).length,
          },
        }
      : undefined,
  };

  const mismatchesOut = {
    generatedAt: summary.generatedAt,
    note: "Per-crop positional mismatches and known duplicate omits",
    rows: allMappings.filter(
      (m) => m.classification !== "EXACT_POSITIONAL_MATCH",
    ),
    representativeWins: allMappings
      .filter(
        (m) =>
          m.matchMethod === "operator-override" &&
          m.classification === "EXACT_POSITIONAL_MATCH",
      )
      .slice(0, 50),
  };

  const formationsOut = {
    generatedAt: summary.generatedAt,
    formations: allFormations,
  };

  writeFileSync(
    join(OUT_DIR, "positional-validation-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    join(OUT_DIR, "positional-validation-mismatches.json"),
    `${JSON.stringify(mismatchesOut, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    join(OUT_DIR, "positional-validation-formations.json"),
    `${JSON.stringify(formationsOut, null, 2)}\n`,
    "utf8",
  );

  printOperatorSummary({
    playbooks: playbookRows,
    formations: allFormations,
    mappings: allMappings,
    human,
    causeCounts,
    classCounts,
    recommendation: `${recommendation} — ${recommendationWhy}`,
    reExtract: reExtractResults,
    unpublished: unpublishedRows,
  });

  console.log(`Wrote:`);
  console.log(`  ${join(OUT_DIR, "positional-validation-summary.json")}`);
  console.log(`  ${join(OUT_DIR, "positional-validation-mismatches.json")}`);
  console.log(`  ${join(OUT_DIR, "positional-validation-formations.json")}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
