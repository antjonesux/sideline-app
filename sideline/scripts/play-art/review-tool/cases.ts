import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
import { PLAYBOOK_PATHS } from "../matcher-v3-sample-set";
import {
  defaultOverridesPath,
  loadMatchingOverrides,
} from "../matching-overrides";
import { loadPlayArtReference, referenceSlug } from "../reference";
import { buildReferencePlayArtUrl } from "../reference-image";
import type {
  PlayArtMatchAssignment,
  PlayArtMatchingReport,
  PlayArtReference,
} from "../types";
import { caseKey } from "./state";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLAY_ART_ROOT = join(__dirname, "..");
const CROP_CACHE_DIR = join(__dirname, ".crop-cache");

export type PlaybookSlug = keyof typeof PLAYBOOK_PATHS;

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
};

function resolvePath(relativeFromSideline: string): string {
  return join(PLAY_ART_ROOT, "..", "..", relativeFromSideline);
}

function matchingReportPath(reference: PlayArtReference): string {
  return join(PLAY_ART_ROOT, "reports", `${referenceSlug(reference)}-matching.json`);
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
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "air-force" || v === "airforce") return "air-force";
  if (v === "usc") return "usc";
  throw new Error(`Unknown playbook "${raw}". Use --playbook=air-force or --playbook=usc`);
}

export async function loadReviewData(playbook: PlaybookSlug): Promise<LoadedReviewData> {
  const paths = PLAYBOOK_PATHS[playbook];
  const referencePath = resolvePath(paths.reference);
  const sourcePath = resolvePath(paths.source);
  const reference = loadPlayArtReference(referencePath);
  const reportPath = matchingReportPath(reference);

  if (!existsSync(reportPath)) {
    throw new Error(
      `Matcher REVIEW output missing: ${reportPath}\nRun play-art ingest/match for this playbook first.`,
    );
  }
  if (!existsSync(sourcePath)) {
    throw new Error(`Owned Vault DOCX missing: ${sourcePath}`);
  }

  const report = JSON.parse(readFileSync(reportPath, "utf8")) as PlayArtMatchingReport;
  const seed = await loadSeedForReference(reference);
  const formationTypes = formationTypesFromSeed(seed);

  console.log("Extracting owned crops from DOCX…");
  const extracted = await extractPlayArtDocx(sourcePath, reference);
  const cropsByFormation = collectFormationCrops(reference, extracted);
  const existingOverrides = loadMatchingOverrides(defaultOverridesPath(reference));

  mkdirSync(CROP_CACHE_DIR, { recursive: true });
  const cropBytesByKey = new Map<string, Buffer>();
  const cases: ReviewCase[] = [];

  for (const formationReport of report.formations) {
    const formationName = formationReport.formation;
    const refFormation = reference.formations.find((f) => f.name === formationName);
    const formationPlays = refFormation?.plays ?? [];
    const formationType = formationTypes.get(formationName.trim()) ?? "";
    const crops = cropsByFormation.get(formationName) ?? [];
    const claimedPlays = new Set(
      Object.values(existingOverrides[formationName] ?? {}).map((p) => normalizePlayName(p)),
    );

    for (const assignment of formationReport.assignments) {
      if (assignment.status !== "REVIEW") continue;
      // Already confirmed via overrides — skip (session state may also track these).
      if (existingOverrides[formationName]?.[assignment.cropId]) continue;

      const crop =
        crops.find((c) => c.cropId === assignment.cropId) ??
        crops.find((c) => c.mediaPath === assignment.mediaPath);
      if (!crop) {
        console.warn(`Skipping REVIEW ${formationName}/${assignment.cropId}: crop not in DOCX`);
        continue;
      }
      const buffer = extracted.mediaFiles.get(crop.mediaPath);
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

      const candidates = buildCandidates(
        assignment,
        reference,
        formationType,
        formationPlays,
      ).filter((c) => c.isAssigned || !claimedPlays.has(c.playId));

      // Keep assigned even if somehow claimed; ensure up to 3 unique plays.
      while (candidates.length < 3) {
        const filler = formationPlays.find(
          (p) =>
            !candidates.some((c) => c.playId === normalizePlayName(p)) &&
            !claimedPlays.has(normalizePlayName(p)),
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
        formationPlays: formationPlays.filter((p) => !claimedPlays.has(normalizePlayName(p))),
      });
    }
  }

  cases.sort((a, b) => {
    const f = a.formation.localeCompare(b.formation);
    if (f !== 0) return f;
    return a.cropId.localeCompare(b.cropId);
  });

  console.log(`Loaded ${cases.length} REVIEW cases for ${reference.playbook}`);

  return {
    playbook,
    displayName: reference.playbook,
    reference,
    reportSlug: referenceSlug(reference),
    overridesSlug: referenceSlug(reference),
    matchingReportPath: reportPath,
    cases,
    cropBytesByKey,
    formationTypes,
  };
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
