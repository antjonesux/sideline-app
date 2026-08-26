/**
 * Formation assignment via OCR (formation labels only — not play identity).
 *
 * Section headers are OCR'd to pair DOCX sections to seed formations (no positional
 * pairing). Per-crop header OCR validates that each card agrees with its section.
 * OCR is not used for play identity — that remains the visual matcher.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import type {
  ExtractedPlayArtDoc,
  FormationCropId,
  FormationOwnedCrop,
  PlayArtReference,
} from "./types";

function cropMetaFromMediaPath(mediaPath: string): {
  cropId: FormationCropId;
  extension: string;
} {
  const match = /^crop:\/\/(\d+)\/(\d+)\.(jpg|jpeg|png)$/i.exec(mediaPath);
  if (!match) {
    throw new Error(`Invalid crop media path: ${mediaPath}`);
  }
  const sourceIndex = Number(match[1]);
  const cardIndex = Number(match[2]);
  const extension = match[3].toLowerCase();
  const cardPosition: FormationOwnedCrop["cardPosition"] =
    cardIndex === 0 ? "left" : cardIndex === 1 ? "middle" : "right";
  if (cardIndex > 2) {
    throw new Error(`Invalid crop media path card index: ${mediaPath}`);
  }
  return {
    cropId: `source-${sourceIndex}:${cardPosition}`,
    extension,
  };
}

/** Walk positional extraction blocks → formation-labeled play cards. */
function collectPositionalCrops(
  reference: PlayArtReference,
  extracted: ExtractedPlayArtDoc,
): Array<{
  positionalFormation: string;
  mediaPath: string;
  blockIndex: number;
  cropId: FormationCropId;
  extension: string;
}> {
  const out: Array<{
    positionalFormation: string;
    mediaPath: string;
    blockIndex: number;
    cropId: FormationCropId;
    extension: string;
  }> = [];
  let formationIndex = -1;
  for (const block of extracted.blocks) {
    if (block.kind === "formation_header") {
      formationIndex += 1;
      continue;
    }
    const refFormation = reference.formations[formationIndex];
    if (!refFormation) {
      throw new Error(`Play card at block ${block.index} appears before any formation header`);
    }
    const meta = cropMetaFromMediaPath(block.mediaPath);
    out.push({
      positionalFormation: refFormation.name,
      mediaPath: block.mediaPath,
      blockIndex: block.index,
      cropId: meta.cropId,
      extension: block.extension || meta.extension,
    });
  }
  return out;
}

/** Top chrome containing formation + play name (626×355 cards). */
export const FORMATION_HEADER_REGION = {
  left: 0,
  top: 0,
  width: 626,
  height: 70,
} as const;

const OCR_UPSCALE = 3;
/** Absolute Levenshtein ceiling before length-aware rules (typo-scale edits only). */
const MAX_LEVENSHTEIN_DISTANCE = 2;
/**
 * Length-aware fuzzy / containment accept rules (see DECISIONS / CHANGELOG 2026-08-25):
 * 1. distance ≤ max(4, floor(seedLen * 0.25))
 * 2. ocrLen ≥ max(4, floor(seedLen * 0.5))
 * 3. unique among candidates that pass (1)+(2)
 *
 * Min distance 4 (not 3) so legitimate personnel-prefix drops like
 * OCR "GREEN" → "Gun Green" (delta 4 for "GUN ") still pass when proportional.
 * Short fragments like "ACE" → "Gun Ace Rip 4WR" (delta 12) are rejected.
 */
const FUZZY_DISTANCE_SEED_FRACTION = 0.25;
const FUZZY_MIN_DISTANCE_CAP = 4;
const OCR_MIN_SEED_FRACTION = 0.5;
const OCR_MIN_LENGTH_FLOOR = 4;
const DEFAULT_OCR_CONCURRENCY = 6;

export type FuzzyRejectReason =
  | "distance_vs_seed"
  | "ocr_too_short"
  | "ambiguous"
  | "no_candidates";

export function maxAllowedFuzzyDistance(seedNormLength: number): number {
  return Math.max(FUZZY_MIN_DISTANCE_CAP, Math.floor(seedNormLength * FUZZY_DISTANCE_SEED_FRACTION));
}

export function minOcrLengthForSeed(seedNormLength: number): number {
  return Math.max(OCR_MIN_LENGTH_FLOOR, Math.floor(seedNormLength * OCR_MIN_SEED_FRACTION));
}

/** Whether a candidate distance/OCR length pair passes length-aware gates (rules 1–2). */
export function passesLengthAwareFuzzyThreshold(
  ocrNorm: string,
  seedNorm: string,
  distance: number,
): { ok: true } | { ok: false; reason: FuzzyRejectReason; detail: string } {
  const maxDist = maxAllowedFuzzyDistance(seedNorm.length);
  if (distance > maxDist) {
    return {
      ok: false,
      reason: "distance_vs_seed",
      detail: `distance > 25% of seed name length (max ${maxDist})`,
    };
  }
  const minLen = minOcrLengthForSeed(seedNorm.length);
  if (ocrNorm.length < minLen) {
    return {
      ok: false,
      reason: "ocr_too_short",
      detail: `OCR too short relative to seed name (min ${minLen} chars)`,
    };
  }
  return { ok: true };
}

function rejectDetailLabel(reason: FuzzyRejectReason, detail: string): string {
  if (reason === "ocr_too_short") return `rejected: OCR too short relative to seed name`;
  if (reason === "distance_vs_seed") return `rejected: ${detail}`;
  if (reason === "ambiguous") return `rejected: ambiguous (multiple seeds within threshold)`;
  return `rejected: ${detail}`;
}

export type FormationOcrMatchConfidence = "exact" | "fuzzy" | "none";

/** Section OCR is authoritative; crop OCR only validates. */
export type FormationAssignmentSource = "section_ocr" | "crop_ocr_validated";

export type CropFormationOcrResult = {
  cropId: FormationCropId;
  mediaPath: string;
  blockIndex: number;
  /** Formation assigned by section-header OCR (authoritative). */
  positionalFormation: string;
  ocrRawText: string;
  ocrFormationText: string;
  ocrPlayNameText: string | null;
  matchedFormation: string | null;
  matchConfidence: FormationOcrMatchConfidence;
  matchDistance: number | null;
  assignedFormation: string;
  formationAssignmentSource: FormationAssignmentSource;
  fallbackReason?: string;
};

export type SectionOcrAssignment = {
  docPosition: number;
  headerSourceIndex: number;
  ocrRawText: string;
  ocrFormationText: string;
  matchedFormation: string;
  matchConfidence: FormationOcrMatchConfidence;
  matchDistance: number | null;
};

export type FormationOcrRebucketStats = {
  sectionCount: number;
  sectionExactMatches: number;
  sectionFuzzyMatches: number;
  sectionUnidentified: number;
  sectionUnidentifiedRate: number;
  cropCount: number;
  cropValidationAgreements: number;
  cropValidationDisagreements: number;
  cropValidationFailures: number;
  exactMatches: number;
  fuzzyMatches: number;
  /** @deprecated Positional fallback removed; always 0. */
  ocrAssigned: number;
  /** @deprecated Positional fallback removed; always 0. */
  positionalFallback: number;
  /** @deprecated Positional fallback removed; always 0. */
  fallbackRate: number;
  countMismatches: Array<{ formation: string; expected: number; actual: number }>;
};

export type FormationOcrRebucketResult = {
  extracted: ExtractedPlayArtDoc;
  assignments: CropFormationOcrResult[];
  sectionAssignments: SectionOcrAssignment[];
  stats: FormationOcrRebucketStats;
};

function whichTesseract(): string {
  const fromEnv = process.env.TESSERACT_PATH?.trim();
  if (fromEnv) return fromEnv;
  for (const candidate of ["tesseract", "/opt/homebrew/bin/tesseract", "/usr/local/bin/tesseract"]) {
    const probe = spawnSync(candidate, ["--version"], { encoding: "utf8" });
    if (probe.status === 0) return candidate;
  }
  throw new Error(
    "formation OCR requires tesseract on PATH (brew install tesseract). " +
      "Set TESSERACT_PATH to override.",
  );
}

export function normalizeFormationOcrText(input: string): string {
  return input
    .toUpperCase()
    .replace(/[®©™@]/g, " ")
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\b\d{1,3}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j];
  }
  return prev[b.length];
}

/** Strip controller / chrome noise lines that are not formation or play names. */
function cleanOcrLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/[®©™]/g, "")
        .replace(/^[\s@*|\\/_=.-]+/, "")
        .replace(/[\s@*|\\/_=.-]+$/, "")
        .trim(),
    )
    .map((line) => line.replace(/^(IF|TF|FI)\s+/i, "").trim())
    .filter((line) => line.length >= 2)
    .filter((line) => !/^[^\w]+$/.test(line));
}

export function parseHeaderOcrText(raw: string): {
  formationText: string;
  playNameText: string | null;
} {
  const lines = cleanOcrLines(raw);
  if (lines.length === 0) {
    return { formationText: "", playNameText: null };
  }

  if (lines.length === 1) {
    const parts = lines[0].split(/\s*\/\s*/);
    if (parts.length >= 2) {
      return {
        formationText: normalizeFormationOcrText(parts[0]),
        playNameText: normalizeFormationOcrText(parts.slice(1).join(" ")),
      };
    }
    return { formationText: normalizeFormationOcrText(lines[0]), playNameText: null };
  }

  return {
    formationText: normalizeFormationOcrText(lines[0]),
    playNameText: normalizeFormationOcrText(lines[1]),
  };
}

export function matchKnownFormation(
  ocrFormationText: string,
  knownFormations: string[],
): {
  matchedFormation: string | null;
  matchConfidence: FormationOcrMatchConfidence;
  matchDistance: number | null;
} {
  return matchKnownFormationConstrained(ocrFormationText, knownFormations, null);
}

/**
 * Strip section-header chrome ("15 PLAYS b", trailing junk) before formation match.
 */
export function cleanSectionHeaderOcrText(input: string): string {
  const stripped = input
    // Drop "15 PLAYS …" / "PLAYS …" and everything after (OCR junk after PLAYS).
    .replace(/\b\d+\s*PLAYS?\b[\s\S]*$/gi, " ")
    .replace(/\bPLAYS?\b[\s\S]*$/gi, " ")
    .replace(/\bKEY\s+PLAYERS\b/gi, " ");
  // Common Vault header OCR glues / confusions vs seed spellings.
  const deconfused = stripped
    .replace(/\bJWR\b/gi, "5WR")
    .replace(/\bHEAUY\b/gi, "HEAVY")
    .replace(/\bYFLEX\b/gi, "Y FLEX")
    .replace(/\bYSLOT\b/gi, "Y SLOT")
    .replace(/\bXNASTY\b/gi, "X NASTY")
    .replace(/\bHBSTR\b/gi, "HB STR");
  let cleaned = normalizeFormationOcrText(deconfused);
  // Leading 1–2 letter OCR crumbs ("A TWINS…", "Q SPLIT…", "CL TREY…") — not real tokens.
  cleaned = cleaned.replace(/^(A|Q|CL)\s+/i, "").trim();
  return cleaned;
}

const PERSONNEL_HINTS = [
  "GOAL LINE",
  "SINGLEBACK",
  "FLEXBONE",
  "WINGBONE",
  "MARYLAND I",
  "MARYLAND",
  "POWER I",
  "PISTOL",
  "GUN",
] as const;

/** Longest-first personnel prefixes for suffix / disambiguation checks. */
const PERSONNEL_PREFIXES_DESC = [...PERSONNEL_HINTS]
  .map((h) => normalizeFormationOcrText(h))
  .sort((a, b) => b.length - a.length);

/** Strip a leading known personnel/scheme token from a normalized formation name. */
export function stripPersonnelPrefix(seedNorm: string): string {
  for (const prefix of PERSONNEL_PREFIXES_DESC) {
    if (seedNorm === prefix) return "";
    if (seedNorm.startsWith(`${prefix} `)) {
      return seedNorm.slice(prefix.length + 1).trim();
    }
  }
  return seedNorm;
}

/** Pull scheme/personnel hint from the left header panel when middle-only match is ambiguous. */
export function extractPersonnelHint(leftOcrText: string): string {
  const n = normalizeFormationOcrText(leftOcrText);
  if (!n) return "";
  for (const hint of PERSONNEL_HINTS) {
    if (n.includes(hint)) return hint;
  }
  return "";
}

/**
 * Match OCR text to a known formation, optionally restricting to size-compatible names.
 * When `compatibleFormations` is set, only those names are considered (play-count filter).
 */
export function matchKnownFormationConstrained(
  ocrFormationText: string,
  knownFormations: string[],
  compatibleFormations: string[] | null,
): {
  matchedFormation: string | null;
  matchConfidence: FormationOcrMatchConfidence;
  matchDistance: number | null;
} {
  const pool =
    compatibleFormations && compatibleFormations.length > 0
      ? knownFormations.filter((n) => compatibleFormations.includes(n))
      : knownFormations;
  if (pool.length === 0) {
    return { matchedFormation: null, matchConfidence: "none", matchDistance: null };
  }

  const needle = normalizeFormationOcrText(ocrFormationText);
  if (!needle) {
    return { matchedFormation: null, matchConfidence: "none", matchDistance: null };
  }

  const normalizedKnown = pool.map((name) => ({
    name,
    norm: normalizeFormationOcrText(name),
  }));

  const exact = normalizedKnown.find((k) => k.norm === needle);
  if (exact) {
    return { matchedFormation: exact.name, matchConfidence: "exact", matchDistance: 0 };
  }

  // Prefer closest-length known name contained in OCR (or vice versa), including
  // compact (space-stripped) form so YFLEX↔Y FLEX style glues still match.
  // Length-aware gates reject short fragments (e.g. "ACE" ⊂ "GUN ACE RIP 4WR").
  const containmentRaw = normalizedKnown.filter((k) => {
    if (k.norm.length < 6 && needle.length < 6) return false;
    // Reject proper-prefix extensions: OCR "SINGLEBACK WING" must not claim
    // "Singleback Wing Slot" (missing trailing modifier). Suffix / personnel-drop
    // matches (OCR "GREEN" ⊂ "GUN GREEN") remain allowed.
    if (k.norm.startsWith(`${needle} `)) return false;
    if (needle.includes(k.norm) || k.norm.includes(needle)) return true;
    const nc = needle.replace(/\s+/g, "");
    const kc = k.norm.replace(/\s+/g, "");
    if (kc.startsWith(nc) && kc.length > nc.length) return false;
    return nc.length >= 6 && kc.length >= 6 && (nc.includes(kc) || kc.includes(nc));
  });
  const containmentPassing = containmentRaw
    .map((k) => {
      const distance = Math.abs(k.norm.length - needle.length);
      const gate = passesLengthAwareFuzzyThreshold(needle, k.norm, distance);
      return { ...k, distance, gate };
    })
    .filter((k) => k.gate.ok)
    .sort(
      (a, b) =>
        a.distance - b.distance ||
        Math.abs(a.norm.length - needle.length) - Math.abs(b.norm.length - needle.length) ||
        b.norm.length - a.norm.length,
    );

  // Personnel-suffix ambiguity: OCR "DEUCE CLOSE" matches the stripped suffix of both
  // "Gun Deuce Close" and "Singleback Deuce Close". Only one may pass the length-aware
  // distance gate (Gun is closer), but guessing personnel is unsafe — fail closed so
  // left-panel hint / crop-vote can disambiguate.
  const suffixHits = normalizedKnown.filter((k) => {
    const rest = stripPersonnelPrefix(k.norm);
    return rest.length >= 4 && rest === needle;
  });
  if (suffixHits.length > 1) {
    return {
      matchedFormation: null,
      matchConfidence: "none",
      matchDistance: Math.abs(suffixHits[0].norm.length - needle.length),
    };
  }

  if (containmentPassing.length === 1) {
    return {
      matchedFormation: containmentPassing[0].name,
      matchConfidence: "fuzzy",
      matchDistance: containmentPassing[0].distance,
    };
  }
  if (containmentPassing.length > 1) {
    // Rule 3: multiple seeds within threshold → fail closed (do not guess personnel).
    return {
      matchedFormation: null,
      matchConfidence: "none",
      matchDistance: containmentPassing[0].distance,
    };
  }

  let best: { name: string; distance: number; norm: string } | null = null;
  for (const k of normalizedKnown) {
    const distance = levenshtein(needle, k.norm);
    if (distance > MAX_LEVENSHTEIN_DISTANCE) continue;
    const gate = passesLengthAwareFuzzyThreshold(needle, k.norm, distance);
    if (!gate.ok) continue;
    if (
      !best ||
      distance < best.distance ||
      (distance === best.distance && k.norm.length > best.norm.length)
    ) {
      best = { name: k.name, distance, norm: k.norm };
    }
  }

  if (!best) {
    return { matchedFormation: null, matchConfidence: "none", matchDistance: null };
  }

  const ties = normalizedKnown.filter((k) => {
    const distance = levenshtein(needle, k.norm);
    if (distance !== best!.distance) return false;
    return passesLengthAwareFuzzyThreshold(needle, k.norm, distance).ok;
  });
  if (ties.length > 1) {
    return { matchedFormation: null, matchConfidence: "none", matchDistance: best.distance };
  }

  return {
    matchedFormation: best.name,
    matchConfidence: best.distance === 0 ? "exact" : "fuzzy",
    matchDistance: best.distance,
  };
}

/**
 * Section-header match: clean PLAYS chrome, prefer exact play-count candidates,
 * then size-compatible (section cards ≥ expected plays).
 */
export function matchSectionHeaderToFormation(
  ocrFormationText: string,
  knownFormations: string[],
  playCountByFormation: Map<string, number>,
  sectionCardCount: number,
): {
  matchedFormation: string | null;
  matchConfidence: FormationOcrMatchConfidence;
  matchDistance: number | null;
  cleanedText: string;
} {
  const cleanedText = cleanSectionHeaderOcrText(ocrFormationText);
  const exactCount = knownFormations.filter(
    (n) => playCountByFormation.get(n) === sectionCardCount,
  );
  const compatible = knownFormations.filter(
    (n) => (playCountByFormation.get(n) ?? Number.POSITIVE_INFINITY) <= sectionCardCount,
  );

  let match = matchKnownFormationConstrained(cleanedText, knownFormations, exactCount);
  if (match.matchedFormation) {
    return { ...match, cleanedText };
  }

  match = matchKnownFormationConstrained(cleanedText, knownFormations, compatible);
  return { ...match, cleanedText };
}

/** Top fuzzy candidates for fail-closed error messages (not limited to accept threshold). */
export function topFuzzyFormationCandidates(
  ocrFormationText: string,
  knownFormations: string[],
  limit = 3,
): Array<{ name: string; distance: number; rejectDetail: string | null }> {
  const needle = normalizeFormationOcrText(ocrFormationText);
  if (!needle) {
    return knownFormations.slice(0, limit).map((name) => ({
      name,
      distance: normalizeFormationOcrText(name).length,
      rejectDetail: "rejected: empty OCR text",
    }));
  }
  return knownFormations
    .map((name) => {
      const seedNorm = normalizeFormationOcrText(name);
      const distance = levenshtein(needle, seedNorm);
      const gate = passesLengthAwareFuzzyThreshold(needle, seedNorm, distance);
      return {
        name,
        distance,
        rejectDetail: gate.ok ? null : rejectDetailLabel(gate.reason, gate.detail),
      };
    })
    .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function formatSectionOcrFailure(input: {
  docPosition: number;
  ocrRawText: string;
  ocrFormationText: string;
  knownFormations: string[];
}): string {
  const cleaned = cleanSectionHeaderOcrText(input.ocrFormationText || input.ocrRawText);
  const needle = normalizeFormationOcrText(cleaned || input.ocrRawText);
  const candidates = topFuzzyFormationCandidates(cleaned || input.ocrRawText, input.knownFormations, 3);
  const candidateLines =
    candidates.length === 0
      ? "    (none)"
      : candidates
          .map((c) => {
            const reason = c.rejectDetail ?? "within threshold (ambiguous or exhausted fallbacks)";
            return `    ${c.name.padEnd(28)} distance=${c.distance}  (${reason})`;
          })
          .join("\n");
  return (
    `Error: Section at DOCX position #${input.docPosition} — could not confidently identify formation.\n` +
    `  OCR text: "${needle}" (${needle.length} chars)\n` +
    `  Raw: "${input.ocrRawText.replace(/\s+/g, " ").trim()}"\n` +
    `  Top 3 candidates:\n${candidateLines}\n` +
    `  Action: Investigate DOCX position #${input.docPosition} — OCR may need enhancement or seed may be missing this formation.`
  );
}

async function preprocessHeaderForOcr(cardBuffer: Buffer): Promise<Buffer> {
  const meta = await sharp(cardBuffer).metadata();
  const width = meta.width ?? 626;
  const height = meta.height ?? 355;
  const region = {
    left: 0,
    top: 0,
    width,
    height: Math.min(height, Math.round(height * (FORMATION_HEADER_REGION.height / 355))),
  };

  return sharp(cardBuffer)
    .extract(region)
    .grayscale()
    .normalize()
    .resize(region.width * OCR_UPSCALE, region.height * OCR_UPSCALE, {
      kernel: "lanczos3",
      fit: "fill",
    })
    .png()
    .toBuffer();
}

export async function ocrPlayCardHeader(
  cardBuffer: Buffer,
  tesseractPath = whichTesseract(),
): Promise<{ rawText: string; formationText: string; playNameText: string | null }> {
  const prepared = await preprocessHeaderForOcr(cardBuffer);
  const dir = mkdtempSync(join(tmpdir(), "sideline-formation-ocr-"));
  const imagePath = join(dir, "header.png");
  try {
    writeFileSync(imagePath, prepared);
    const result = spawnSync(
      tesseractPath,
      [imagePath, "stdout", "--psm", "6", "-c", "tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 /"],
      { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 },
    );
    if (result.status !== 0) {
      const err = (result.stderr || result.stdout || "tesseract failed").trim();
      throw new Error(`tesseract failed: ${err}`);
    }
    const rawText = (result.stdout ?? "").trim();
    const parsed = parseHeaderOcrText(rawText);
    return {
      rawText,
      formationText: parsed.formationText,
      playNameText: parsed.playNameText,
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function run(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  }
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => run());
  await Promise.all(runners);
  return results;
}

/**
 * OCR each owned crop header and confirm it agrees with the section-OCR assignment.
 * Does not reassign formations — section OCR is authoritative. Fail closed when
 * disagreement rate is structurally high (>20%).
 */
export async function validateCropHeadersAgainstSections(
  reference: PlayArtReference,
  extracted: ExtractedPlayArtDoc,
  sectionAssignments: SectionOcrAssignment[],
  options?: { concurrency?: number; skipOcr?: boolean },
): Promise<FormationOcrRebucketResult> {
  const knownFormations = reference.formations.map((f) => f.name);
  const positionalCrops = collectPositionalCrops(reference, extracted);

  if (options?.skipOcr) {
    const assignments: CropFormationOcrResult[] = positionalCrops.map((crop) => ({
      cropId: crop.cropId,
      mediaPath: crop.mediaPath,
      blockIndex: crop.blockIndex,
      positionalFormation: crop.positionalFormation,
      ocrRawText: "",
      ocrFormationText: "",
      ocrPlayNameText: null,
      matchedFormation: null,
      matchConfidence: "none" as const,
      matchDistance: null,
      assignedFormation: crop.positionalFormation,
      formationAssignmentSource: "section_ocr" as const,
      fallbackReason: "crop_ocr_skipped",
    }));
    return {
      extracted,
      assignments,
      sectionAssignments,
      stats: emptySectionOcrStats(sectionAssignments, assignments.length),
    };
  }

  const tesseractPath = whichTesseract();
  const flat = positionalCrops.map((crop) => {
    const buffer = extracted.mediaFiles.get(crop.mediaPath);
    if (!buffer) {
      throw new Error(`formation OCR: missing bytes for ${crop.mediaPath}`);
    }
    return { ...crop, buffer };
  });

  const concurrency = options?.concurrency ?? DEFAULT_OCR_CONCURRENCY;
  const assignments: CropFormationOcrResult[] = await mapPool(flat, concurrency, async (item) => {
    let ocrRawText = "";
    let ocrFormationText = "";
    let ocrPlayNameText: string | null = null;
    let matchedFormation: string | null = null;
    let matchConfidence: FormationOcrMatchConfidence = "none";
    let matchDistance: number | null = null;
    let fallbackReason: string | undefined;

    try {
      const ocr = await ocrPlayCardHeader(item.buffer, tesseractPath);
      ocrRawText = ocr.rawText;
      ocrFormationText = ocr.formationText;
      ocrPlayNameText = ocr.playNameText;
      const match = matchKnownFormation(ocrFormationText, knownFormations);
      matchedFormation = match.matchedFormation;
      matchConfidence = match.matchConfidence;
      matchDistance = match.matchDistance;
      if (!matchedFormation) {
        fallbackReason = ocrFormationText
          ? `no_formation_match:${ocrFormationText}`
          : "empty_ocr_formation";
      }
    } catch (err) {
      fallbackReason = `ocr_error:${err instanceof Error ? err.message : String(err)}`;
    }

    const agrees =
      matchedFormation !== null && matchedFormation === item.positionalFormation;
    return {
      cropId: item.cropId,
      mediaPath: item.mediaPath,
      blockIndex: item.blockIndex,
      positionalFormation: item.positionalFormation,
      ocrRawText,
      ocrFormationText,
      ocrPlayNameText,
      matchedFormation,
      matchConfidence,
      matchDistance,
      assignedFormation: item.positionalFormation,
      formationAssignmentSource: agrees
        ? ("crop_ocr_validated" as const)
        : ("section_ocr" as const),
      fallbackReason: agrees ? undefined : fallbackReason ?? "crop_section_disagreement",
    };
  });

  const agreements = assignments.filter(
    (a) => a.formationAssignmentSource === "crop_ocr_validated",
  ).length;
  const failures = assignments.filter((a) => a.matchConfidence === "none").length;
  const disagreements = assignments.length - agreements;
  const disagreementRate =
    assignments.length === 0 ? 0 : disagreements / assignments.length;

  if (disagreementRate > 0.2) {
    const samples = assignments
      .filter((a) => a.formationAssignmentSource === "section_ocr")
      .slice(0, 8)
      .map(
        (a) =>
          `  - ${a.cropId}: section=${a.assignedFormation} cropOCR=${a.matchedFormation ?? "none"} raw="${a.ocrFormationText}"`,
      )
      .join("\n");
    throw new Error(
      `Crop-header OCR disagrees with section OCR on ${(disagreementRate * 100).toFixed(1)}% of crops ` +
        `(threshold 20%). Section assignments may be wrong.\n${samples}`,
    );
  }

  if (disagreements > 0) {
    console.warn(
      `  Crop OCR validation: ${agreements}/${assignments.length} agree with section; ` +
        `${disagreements} disagreement(s) kept on section assignment (section OCR authoritative)`,
    );
  }

  const exactMatches = assignments.filter((a) => a.matchConfidence === "exact").length;
  const fuzzyMatches = assignments.filter((a) => a.matchConfidence === "fuzzy").length;
  const sectionExact = sectionAssignments.filter((s) => s.matchConfidence === "exact").length;
  const sectionFuzzy = sectionAssignments.filter((s) => s.matchConfidence === "fuzzy").length;

  return {
    extracted,
    assignments,
    sectionAssignments,
    stats: {
      sectionCount: sectionAssignments.length,
      sectionExactMatches: sectionExact,
      sectionFuzzyMatches: sectionFuzzy,
      sectionUnidentified: 0,
      sectionUnidentifiedRate: 0,
      cropCount: assignments.length,
      cropValidationAgreements: agreements,
      cropValidationDisagreements: disagreements,
      cropValidationFailures: failures,
      exactMatches,
      fuzzyMatches,
      ocrAssigned: agreements,
      positionalFallback: 0,
      fallbackRate: 0,
      countMismatches: [],
    },
  };
}

function emptySectionOcrStats(
  sectionAssignments: SectionOcrAssignment[],
  cropCount: number,
): FormationOcrRebucketStats {
  const sectionExact = sectionAssignments.filter((s) => s.matchConfidence === "exact").length;
  const sectionFuzzy = sectionAssignments.filter((s) => s.matchConfidence === "fuzzy").length;
  return {
    sectionCount: sectionAssignments.length,
    sectionExactMatches: sectionExact,
    sectionFuzzyMatches: sectionFuzzy,
    sectionUnidentified: 0,
    sectionUnidentifiedRate: 0,
    cropCount,
    cropValidationAgreements: 0,
    cropValidationDisagreements: 0,
    cropValidationFailures: cropCount,
    exactMatches: 0,
    fuzzyMatches: 0,
    ocrAssigned: 0,
    positionalFallback: 0,
    fallbackRate: 0,
    countMismatches: [],
  };
}

/**
 * @deprecated Positional section pairing + OCR rebucket. Use section-header OCR in
 * extractPlayArtDocx + validateCropHeadersAgainstSections instead.
 */
export async function rebucketExtractedByFormationOcr(
  reference: PlayArtReference,
  extracted: ExtractedPlayArtDoc,
  options?: { concurrency?: number; skipOcr?: boolean },
): Promise<FormationOcrRebucketResult> {
  // Legacy path kept only for older diagnostic callers — reconstruct section
  // assignments from positional labels and validate crops (no remap).
  const sectionAssignments: SectionOcrAssignment[] = [];
  let formationIndex = -1;
  for (const block of extracted.blocks) {
    if (block.kind !== "formation_header") continue;
    formationIndex += 1;
    const formation = reference.formations[formationIndex];
    if (!formation) break;
    sectionAssignments.push({
      docPosition: formationIndex + 1,
      headerSourceIndex: -1,
      ocrRawText: "",
      ocrFormationText: formation.name,
      matchedFormation: formation.name,
      matchConfidence: "exact",
      matchDistance: 0,
    });
  }
  return validateCropHeadersAgainstSections(reference, extracted, sectionAssignments, options);
}
