import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePlayName } from "../../../lib/utils";
import { hashPlayArtBytes } from "../content-hash";
import { extractPlayArtDocx } from "../extract-docx";
import {
  collectFormationCrops,
  formationTypesFromSeed,
  loadSeedForReference,
} from "../match-play-art";
import {
  defaultOmitsPath,
  loadMatchingOmits,
} from "../matching-omits";
import {
  defaultOverridesPath,
  loadMatchingOverrides,
} from "../matching-overrides";
import { loadPlayArtReference, referenceSlug } from "../reference";
import { buildReferencePlayArtUrl } from "../reference-image";
import {
  SOURCE_ROOT,
  discoverAndResolveSources,
} from "../source-discovery";
import type {
  PlayArtMatchAssignment,
  PlayArtMatchingReport,
  PlayArtReference,
} from "../types";
import { caseKey } from "./state";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLAY_ART_ROOT = join(__dirname, "..");
const REPORTS_DIR = join(PLAY_ART_ROOT, "reports");
const REFERENCES_DIR = join(PLAY_ART_ROOT, "references");
const CROP_CACHE_DIR = join(__dirname, ".crop-cache");

/** Operator CLI slug, e.g. `air-force`, `california`, `usc`. */
export type PlaybookSlug = string;

/**
 * Matcher reports for the current offense-first pipeline.
 * Narrowed to cfb27 offense so team slugs stay unique (no cfb26/defense collisions).
 */
const MATCHING_REPORT_RE = /^(cfb27-offense-(.+))-matching\.json$/i;

export type DiscoveredPlaybook = {
  slug: string;
  reportSlug: string;
  matchingReportPath: string;
  playCount: number | null;
};

export type ReviewCandidate = {
  playName: string;
  playId: string;
  referenceUrl: string;
  v3Score: number | null;
  v3Margin: number | null;
  geometryScore: number | null;
  geometryMargin: number | null;
  perHueMargin: number | null;
  isAssigned: boolean;
};

export type ReviewCase = {
  caseKey: string;
  cropId: string;
  formation: string;
  cropPath: string;
  cropSha256: string;
  mediaPath: string;
  candidates: ReviewCandidate[];
  reviewReason: string;
  formationPlays: string[];
  /**
   * Set when this crop lost a play to another crop (transfer). That play is
   * locked out of top-3 and the N picker so confirm doesn't ping-pong.
   * Undo (←) on the prior confirm is the path to reverse the transfer.
   */
  lockedPlay?: { playName: string; ownerCropId: string };
};

export type LoadedReviewData = {
  playbook: PlaybookSlug;
  displayName: string;
  reference: PlayArtReference;
  reportSlug: string;
  overridesSlug: string;
  matchingReportPath: string;
  cases: ReviewCase[];
  cropBytesByKey: Map<string, Buffer>;
  formationTypes: Map<string, string>;
  /** Full matcher report — used to re-queue crops after override transfer. */
  matchingReport: PlayArtMatchingReport;
};

function matchingReportPath(reference: PlayArtReference): string {
  return join(REPORTS_DIR, `${referenceSlug(reference)}-matching.json`);
}

function readPlayCount(reportPath: string): number | null {
  try {
    const report = JSON.parse(readFileSync(reportPath, "utf8")) as {
      playCount?: unknown;
    };
    return typeof report.playCount === "number" ? report.playCount : null;
  } catch {
    return null;
  }
}

/**
 * Discover ingested playbooks from matcher reports on disk.
 * Signal: `cfb27-offense-{slug}-matching.json` (offense-first pipeline only).
 */
export function discoverIngestedPlaybooks(): DiscoveredPlaybook[] {
  if (!existsSync(REPORTS_DIR)) return [];

  const bySlug = new Map<string, DiscoveredPlaybook>();
  for (const name of readdirSync(REPORTS_DIR)) {
    const match = name.match(MATCHING_REPORT_RE);
    if (!match) continue;
    const reportSlug = match[1].toLowerCase();
    const slug = match[2].toLowerCase();
    if (!slug || slug.includes("/")) {
      console.warn(`Skipping malformed matching report filename: ${name}`);
      continue;
    }
    const reportPath = join(REPORTS_DIR, name);
    bySlug.set(slug, {
      slug,
      reportSlug,
      matchingReportPath: reportPath,
      playCount: readPlayCount(reportPath),
    });
  }

  return [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

function formatAvailablePlaybooks(playbooks: DiscoveredPlaybook[]): string {
  return playbooks.map((p) => p.slug).join(", ");
}

function unknownPlaybookError(raw: string, available: DiscoveredPlaybook[]): Error {
  if (available.length === 0) {
    return new Error(
      [
        "No playbooks have been ingested yet.",
        "",
        "Ingest a playbook first with:",
        '  npm run play-art:ingest -- --source="path/to/{Name}.docx"',
      ].join("\n"),
    );
  }
  return new Error(
    [
      `Unknown playbook "${raw}".`,
      `Available playbooks: ${formatAvailablePlaybooks(available)}`,
      "",
      "Ingest a new playbook with:",
      '  npm run play-art:ingest -- --source="path/to/{Name}.docx"',
    ].join("\n"),
  );
}

function normalizePlaybookSlug(raw: string): string {
  let v = raw.trim().toLowerCase().replace(/\s+/g, "-");
  // Backward-compat alias used by existing operators / docs.
  if (v === "airforce") v = "air-force";
  return v;
}

/** Resolve owned Vault DOCX for a playbook slug via source-discovery (same as ingest). */
function resolveSourceDocxForSlug(slug: string): string | null {
  const results = discoverAndResolveSources();
  const hit = results.find((r) => {
    if (r.status !== "MATCH" && r.status !== "ALIAS") return false;
    // Offense-first: seed modules are `cfb27-{team-slug}`.
    const seed = (r.resolvedSeed ?? "").toLowerCase();
    return seed === `cfb27-${slug}`;
  });
  if (!hit) return null;
  return join(SOURCE_ROOT, hit.sourcePath);
}

function resolveReferencePath(discovered: DiscoveredPlaybook): string {
  return join(REFERENCES_DIR, `${discovered.reportSlug}.json`);
}

export function printPlaybookList(): void {
  const playbooks = discoverIngestedPlaybooks();
  if (playbooks.length === 0) {
    console.log("No playbooks have been ingested yet.");
    console.log("");
    console.log("Ingest a playbook first with:");
    console.log('  npm run play-art:ingest -- --source="path/to/{Name}.docx"');
    return;
  }
  const width = Math.max(...playbooks.map((p) => p.slug.length));
  console.log("Available playbooks:");
  for (const p of playbooks) {
    const count =
      p.playCount != null ? ` (${p.playCount} mappings)` : "";
    console.log(`  ${p.slug.padEnd(width)}${count}`);
  }
}

function reviewReasonFromAssignment(a: PlayArtMatchAssignment): string {
  if (a.geometry?.reason) return a.geometry.reason;
  if (a.margin != null && a.margin < 0.035) {
    return `V3 margin ${a.margin.toFixed(4)} below passMinMargin`;
  }
  if (!a.isLocalBest) return "Assigned play is not local V3 best";
  return "Matcher REVIEW (ambiguous confidence)";
}

function buildCandidates(
  assignment: PlayArtMatchAssignment,
  reference: PlayArtReference,
  formationType: string,
  formationPlays: string[],
): ReviewCandidate[] {
  const out: ReviewCandidate[] = [];
  const seen = new Set<string>();

  const push = (
    playName: string | null | undefined,
    scores: {
      v3Score: number | null;
      v3Margin: number | null;
      geometryScore: number | null;
      geometryMargin: number | null;
      perHueMargin: number | null;
      isAssigned: boolean;
      referenceUrl?: string;
    },
  ) => {
    if (!playName?.trim()) return;
    const id = normalizePlayName(playName);
    if (seen.has(id)) return;
    seen.add(id);
    const url =
      scores.referenceUrl ||
      buildReferencePlayArtUrl(reference, assignment.formation, formationType, playName) ||
      "";
    out.push({
      playName,
      playId: id,
      referenceUrl: url,
      v3Score: scores.v3Score,
      v3Margin: scores.v3Margin,
      geometryScore: scores.geometryScore,
      geometryMargin: scores.geometryMargin,
      perHueMargin: scores.perHueMargin,
      isAssigned: scores.isAssigned,
    });
  };

  push(assignment.playName, {
    v3Score: assignment.similarity,
    v3Margin: assignment.margin,
    geometryScore: assignment.geometry?.score ?? null,
    geometryMargin: assignment.geometry?.margin ?? null,
    perHueMargin: assignment.geometry?.maxPerHueMargin ?? null,
    isAssigned: true,
    referenceUrl: assignment.referenceUrl,
  });

  push(assignment.runnerUpPlay, {
    v3Score: assignment.runnerUpSimilarity,
    v3Margin:
      assignment.margin != null && assignment.runnerUpSimilarity != null
        ? assignment.runnerUpSimilarity - assignment.similarity
        : null,
    geometryScore: assignment.geometry?.runnerUpScore ?? null,
    geometryMargin: null,
    perHueMargin: null,
    isAssigned: false,
  });

  const geoRunner = assignment.geometry?.runnerUpPlay;
  const v3Runner = assignment.geometry?.v3RunnerUpPlay;
  for (const name of [geoRunner, v3Runner, assignment.positionalPlayName]) {
    if (out.length >= 3) break;
    push(name, {
      v3Score: null,
      v3Margin: null,
      geometryScore: null,
      geometryMargin: null,
      perHueMargin: null,
      isAssigned: false,
    });
  }

  // Fill to 3 from formation list if still short (rare — small formations).
  for (const play of formationPlays) {
    if (out.length >= 3) break;
    push(play, {
      v3Score: null,
      v3Margin: null,
      geometryScore: null,
      geometryMargin: null,
      perHueMargin: null,
      isAssigned: false,
    });
  }

  return out.slice(0, 3);
}

export function parsePlaybookArg(raw: string | undefined): PlaybookSlug {
  const available = discoverIngestedPlaybooks();
  const v = normalizePlaybookSlug(raw ?? "");
  if (!v) {
    throw unknownPlaybookError(raw ?? "", available);
  }
  if (!available.some((p) => p.slug === v)) {
    throw unknownPlaybookError(raw ?? v, available);
  }
  return v;
}

export async function loadReviewData(playbook: PlaybookSlug): Promise<LoadedReviewData> {
  const available = discoverIngestedPlaybooks();
  const discovered = available.find((p) => p.slug === playbook);
  if (!discovered) {
    throw unknownPlaybookError(playbook, available);
  }

  const referencePath = resolveReferencePath(discovered);
  if (!existsSync(referencePath)) {
    throw new Error(
      `Reference file missing for "${playbook}": ${referencePath}\n` +
        `Matching report exists at ${discovered.matchingReportPath}, but the reference JSON was not found.`,
    );
  }

  const sourcePath = resolveSourceDocxForSlug(playbook);
  if (!sourcePath || !existsSync(sourcePath)) {
    throw new Error(
      `Owned Vault DOCX missing for "${playbook}".` +
        (sourcePath ? `\nLooked for: ${sourcePath}` : "") +
        `\nPlace the purchased DOCX under scripts/play-art/source/ (or run ingest with --source).`,
    );
  }

  const reference = loadPlayArtReference(referencePath);
  const reportPath = matchingReportPath(reference);

  if (!existsSync(reportPath)) {
    throw new Error(
      `Matcher REVIEW output missing: ${reportPath}\nRun play-art ingest/match for this playbook first.`,
    );
  }

  const report = JSON.parse(readFileSync(reportPath, "utf8")) as PlayArtMatchingReport;
  const seed = await loadSeedForReference(reference);
  const formationTypes = formationTypesFromSeed(seed);

  console.log("Extracting owned crops from DOCX…");
  const extracted = await extractPlayArtDocx(sourcePath, reference);
  const cropsByFormation = collectFormationCrops(reference, extracted);
  const existingOverrides = loadMatchingOverrides(defaultOverridesPath(reference));
  const existingOmits = loadMatchingOmits(defaultOmitsPath(reference));

  mkdirSync(CROP_CACHE_DIR, { recursive: true });
  const cropBytesByKey = new Map<string, Buffer>();
  const cases: ReviewCase[] = [];

  // Cache bytes for REVIEW crops and any override crops so transfer re-queue can
  // immediately present the displaced crop without re-extracting the DOCX.
  for (const formationReport of report.formations) {
    const formationName = formationReport.formation;
    const crops = cropsByFormation.get(formationName) ?? [];
    const overrideCrops = new Set(Object.keys(existingOverrides[formationName] ?? {}));
    for (const assignment of formationReport.assignments) {
      const needsCache =
        assignment.status === "REVIEW" || overrideCrops.has(assignment.cropId);
      if (!needsCache) continue;
      const crop =
        crops.find((c) => c.cropId === assignment.cropId) ??
        crops.find((c) => c.mediaPath === assignment.mediaPath);
      const buffer = crop ? extracted.mediaFiles.get(crop.mediaPath) : undefined;
      if (!buffer) continue;
      const key = caseKey(formationName, assignment.cropId);
      cropBytesByKey.set(key, buffer);
    }
  }

  for (const formationReport of report.formations) {
    const formationName = formationReport.formation;
    const refFormation = reference.formations.find((f) => f.name === formationName);
    const formationPlays = refFormation?.plays ?? [];
    const formationType = formationTypes.get(formationName.trim()) ?? "";
    const crops = cropsByFormation.get(formationName) ?? [];
    for (const assignment of formationReport.assignments) {
      if (assignment.status !== "REVIEW") continue;
      // Already confirmed via overrides — skip (session state may also track these).
      if (existingOverrides[formationName]?.[assignment.cropId]) continue;
      // Vault duplicate omitted — not a REVIEW.
      if (existingOmits[formationName]?.[assignment.cropId]) continue;

      const crop =
        crops.find((c) => c.cropId === assignment.cropId) ??
        crops.find((c) => c.mediaPath === assignment.mediaPath);
      if (!crop) {
        console.warn(`Skipping REVIEW ${formationName}/${assignment.cropId}: crop not in DOCX`);
        continue;
      }
      const buffer =
        cropBytesByKey.get(caseKey(formationName, assignment.cropId)) ??
        extracted.mediaFiles.get(crop.mediaPath);
      if (!buffer) {
        console.warn(`Skipping REVIEW ${formationName}/${assignment.cropId}: missing bytes`);
        continue;
      }

      const key = caseKey(formationName, assignment.cropId);
      const sha = hashPlayArtBytes(buffer);
      const cropFile = join(CROP_CACHE_DIR, `${playbook}-${sha.slice(0, 16)}.jpg`);
      if (!existsSync(cropFile)) {
        writeFileSync(cropFile, buffer);
      }
      cropBytesByKey.set(key, buffer);

      const claimedByOther = new Set<string>();
      for (const [otherCrop, otherPlay] of Object.entries(
        existingOverrides[formationName] ?? {},
      )) {
        if (otherCrop === assignment.cropId) continue;
        claimedByOther.add(normalizePlayName(otherPlay));
      }

      // Prefer unclaimed plays in top-3. Claimed-by-other plays stay in the N
      // picker so the operator can transfer ownership when this crop is correct.
      const candidates = buildCandidates(
        assignment,
        reference,
        formationType,
        formationPlays,
      ).filter((c) => c.isAssigned || !claimedByOther.has(c.playId));

      while (candidates.length < 3) {
        const filler = formationPlays.find(
          (p) =>
            !claimedByOther.has(normalizePlayName(p)) &&
            !candidates.some((c) => c.playId === normalizePlayName(p)),
        );
        if (!filler) break;
        const url =
          buildReferencePlayArtUrl(reference, formationName, formationType, filler) || "";
        candidates.push({
          playName: filler,
          playId: normalizePlayName(filler),
          referenceUrl: url,
          v3Score: null,
          v3Margin: null,
          geometryScore: null,
          geometryMargin: null,
          perHueMargin: null,
          isAssigned: false,
        });
      }

      cases.push({
        caseKey: key,
        cropId: assignment.cropId,
        formation: formationName,
        cropPath: `/crops/${encodeURIComponent(playbook)}/${encodeURIComponent(assignment.cropId)}?f=${encodeURIComponent(formationName)}`,
        cropSha256: sha,
        mediaPath: crop.mediaPath,
        candidates: candidates.slice(0, 3),
        reviewReason: reviewReasonFromAssignment(assignment),
        formationPlays: [...formationPlays],
      });
    }
  }

  cases.sort((a, b) => {
    const f = a.formation.localeCompare(b.formation);
    if (f !== 0) return f;
    return a.cropId.localeCompare(b.cropId);
  });

  console.log(`Loaded ${cases.length} REVIEW cases for ${reference.playbook}`);

  const data: LoadedReviewData = {
    playbook,
    displayName: reference.playbook,
    reference,
    reportSlug: referenceSlug(reference),
    overridesSlug: referenceSlug(reference),
    matchingReportPath: reportPath,
    cases,
    cropBytesByKey,
    formationTypes,
    matchingReport: report,
  };

  // If an override now owns a play that another crop previously held (or still
  // scores as), re-queue that crop so the operator can assign its correct art.
  for (const [formationName, cropMap] of Object.entries(existingOverrides)) {
    for (const [ownerCropId, playName] of Object.entries(cropMap)) {
      const formationReport = report.formations.find((f) => f.formation === formationName);
      if (!formationReport) continue;
      const playId = normalizePlayName(playName);
      const crops = cropsByFormation.get(formationName) ?? [];
      for (const assignment of formationReport.assignments) {
        if (assignment.cropId === ownerCropId) continue;
        if (existingOverrides[formationName]?.[assignment.cropId]) continue;
        if (data.cases.some((c) => c.formation === formationName && c.cropId === assignment.cropId)) {
          continue;
        }
        const wasPriorOwner =
          assignment.overridden === true &&
          normalizePlayName(assignment.playName ?? "") === playId;
        if (!wasPriorOwner) continue;
        const crop =
          crops.find((c) => c.cropId === assignment.cropId) ??
          crops.find((c) => c.mediaPath === assignment.mediaPath);
        const buffer = crop ? extracted.mediaFiles.get(crop.mediaPath) : undefined;
        const requeued = enqueueDisplacedCropForReview(data, {
          formation: formationName,
          cropId: assignment.cropId,
          transferredPlay: playName,
          newOwnerCropId: ownerCropId,
          cropBuffer: buffer,
        });
        if (requeued) {
          console.log(
            `Re-queued ${formationName}/${assignment.cropId} after "${playName}" claimed by ${ownerCropId}`,
          );
        }
      }
    }
  }

  return data;
}

/**
 * Build (or refresh) a review case for a crop after its override was transferred away.
 * Puts the case at the front of `data.cases` so it is the next pending item.
 */
export function enqueueDisplacedCropForReview(
  data: LoadedReviewData,
  input: {
    formation: string;
    cropId: string;
    /** Play that was moved onto another crop — deprioritize in top-3. */
    transferredPlay: string;
    /** Crop that now owns transferredPlay. */
    newOwnerCropId: string;
    mediaPath?: string;
    cropBuffer?: Buffer;
  },
): ReviewCase | null {
  const formationReport = data.matchingReport.formations.find(
    (f) => f.formation === input.formation,
  );
  const assignment = formationReport?.assignments.find((a) => a.cropId === input.cropId);
  if (!assignment) {
    console.warn(
      `Cannot re-queue ${input.formation}/${input.cropId}: not in matching report`,
    );
    return null;
  }

  const key = caseKey(input.formation, input.cropId);
  const formationPlays =
    data.reference.formations.find((f) => f.name === input.formation)?.plays ?? [];
  const formationType = data.formationTypes.get(input.formation.trim()) ?? "";
  const transferredId = normalizePlayName(input.transferredPlay);

  let buffer = input.cropBuffer ?? data.cropBytesByKey.get(key);
  if (!buffer && input.mediaPath) {
    // Caller may not have bytes; leave missing and fail closed below.
  }
  if (!buffer) {
    console.warn(
      `Cannot re-queue ${input.formation}/${input.cropId}: crop bytes not cached`,
    );
    return null;
  }

  const sha = hashPlayArtBytes(buffer);
  const cropFile = join(CROP_CACHE_DIR, `${data.playbook}-${sha.slice(0, 16)}.jpg`);
  if (!existsSync(cropFile)) {
    writeFileSync(cropFile, buffer);
  }
  data.cropBytesByKey.set(key, buffer);

  const candidates = buildCandidates(
    assignment,
    data.reference,
    formationType,
    formationPlays,
  ).filter((c) => c.playId !== transferredId);

  while (candidates.length < 3) {
    const filler = formationPlays.find(
      (p) =>
        normalizePlayName(p) !== transferredId &&
        !candidates.some((c) => c.playId === normalizePlayName(p)),
    );
    if (!filler) break;
    const url =
      buildReferencePlayArtUrl(data.reference, input.formation, formationType, filler) ||
      "";
    candidates.push({
      playName: filler,
      playId: normalizePlayName(filler),
      referenceUrl: url,
      v3Score: null,
      v3Margin: null,
      geometryScore: null,
      geometryMargin: null,
      perHueMargin: null,
      isAssigned: false,
    });
  }

  // Lock the transferred play out of the picker — re-selecting it only ping-pongs
  // ownership and feels like the prior confirm was ignored. Undo reverses transfer.
  const unlockedPlays = formationPlays.filter(
    (p) => normalizePlayName(p) !== transferredId,
  );

  const reviewCase: ReviewCase = {
    caseKey: key,
    cropId: input.cropId,
    formation: input.formation,
    cropPath: `/crops/${encodeURIComponent(data.playbook)}/${encodeURIComponent(input.cropId)}?f=${encodeURIComponent(input.formation)}`,
    cropSha256: sha,
    mediaPath: assignment.mediaPath,
    candidates: candidates.slice(0, 3),
    reviewReason:
      `Different crop — "${input.transferredPlay}" already on ${input.newOwnerCropId}. Pick this crop's play (not "${input.transferredPlay}").`,
    formationPlays: unlockedPlays,
    lockedPlay: {
      playName: input.transferredPlay,
      ownerCropId: input.newOwnerCropId,
    },
  };

  data.cases = data.cases.filter((c) => c.caseKey !== key);
  // Append (don't jump to front) so a successful confirm advances past the
  // current crop before the twin reappears — feels like the match stuck.
  data.cases.push(reviewCase);
  return reviewCase;
}

export function cropCacheDir(): string {
  return CROP_CACHE_DIR;
}

export function referenceUrlForPlay(
  data: LoadedReviewData,
  formation: string,
  playName: string,
): string {
  const formationType = data.formationTypes.get(formation.trim()) ?? "";
  return (
    buildReferencePlayArtUrl(data.reference, formation, formationType, playName) || ""
  );
}
