import JSZip from "jszip";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  extractPersonnelHint,
  formatSectionOcrFailure,
  matchSectionHeaderToFormation,
  ocrPlayCardHeader,
  validateCropHeadersAgainstSections,
  type CropFormationOcrResult,
  type FormationOcrRebucketStats,
  type SectionOcrAssignment,
} from "./formation-ocr";
import type { ClassifiedDocxBlock, ExtractedPlayArtDoc, PlayArtReference } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCX_OPTIONAL_FORMATIONS_PATH = join(__dirname, "docx-optional-formations.json");

/** All USC pilot strips are 2048×355 with three equal cards and two ~85px gutters. */
export const PLAY_STRIP_WIDTH = 2048;
export const PLAY_STRIP_HEIGHT = 355;
export const PLAY_CARD_REGIONS = [
  { x: 0, y: 0, width: 626, height: PLAY_STRIP_HEIGHT },
  { x: 711, y: 0, width: 626, height: PLAY_STRIP_HEIGHT },
  { x: 1422, y: 0, width: 626, height: PLAY_STRIP_HEIGHT },
] as const;

const DOCUMENT_EMBED_ATTR_RE = /\br:embed="([^"]+)"/g;
const MIN_WIDE_GUTTER_PX = 70;
const GUTTER_LUMINANCE_MAX = 25;
/** Fail if more than 5% of sections cannot be OCR-identified (structural problem). */
const MAX_SECTION_UNIDENTIFIED_RATE = 0.05;

function normalizeFormationKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

let docxOptionalByPlaybook: Map<string, Set<string>> | null = null;

function loadDocxOptionalByPlaybook(): Map<string, Set<string>> {
  if (docxOptionalByPlaybook) return docxOptionalByPlaybook;
  const map = new Map<string, Set<string>>();
  if (!existsSync(DOCX_OPTIONAL_FORMATIONS_PATH)) {
    docxOptionalByPlaybook = map;
    return map;
  }
  const parsed = JSON.parse(readFileSync(DOCX_OPTIONAL_FORMATIONS_PATH, "utf8")) as Record<
    string,
    string[]
  >;
  for (const [playbook, formations] of Object.entries(parsed)) {
    if (!Array.isArray(formations)) continue;
    map.set(
      normalizeFormationKey(playbook),
      new Set(formations.map((f) => normalizeFormationKey(f))),
    );
  }
  docxOptionalByPlaybook = map;
  return map;
}

/**
 * Formations that may be absent from Vault DOCX exports (cfb.fan fallback).
 * Hail Mary is always optional; playbook-specific vault gaps live in
 * `docx-optional-formations.json`.
 */
export function isDocxOptionalFormation(name: string, playbook?: string): boolean {
  const n = normalizeFormationKey(name);
  if (n === "hail mary" || n === "hail mary hail mary" || n.startsWith("hail mary ")) {
    return true;
  }
  if (playbook) {
    const extras = loadDocxOptionalByPlaybook().get(normalizeFormationKey(playbook));
    if (extras?.has(n)) return true;
  }
  return false;
}

/**
 * Reference with DOCX-optional formations removed (for map / match / validate).
 */
export function referenceWithoutOmittedFormations(
  reference: PlayArtReference,
  omittedNames: Iterable<string>,
): PlayArtReference {
  const omit = new Set([...omittedNames].map((n) => n.trim().toLowerCase()));
  if (omit.size === 0) return reference;
  return {
    ...reference,
    formations: reference.formations.filter((f) => !omit.has(f.name.trim().toLowerCase())),
  };
}

type SourceStripKind = "formation-header" | "play-strip";

type SourceStrip = {
  sourceIndex: number;
  kind: SourceStripKind;
  mediaPath: string;
  buffer: Buffer;
  width: number;
  height: number;
};

type CardCrop = {
  buffer: Buffer;
  extension: "jpg";
  sourceIndex: number;
  cardIndex: 0 | 1 | 2;
};

type AnonymousDocxSection = {
  /** 1-based DOCX section position for operator messages. */
  docPosition: number;
  headerSourceIndex: number;
  headerBuffer: Buffer;
  cards: CardCrop[];
};

export type PlayArtStructureReport = {
  embeddedImages: number;
  formationHeaders: number;
  playStrips: number;
  generatedPlayCards: number;
  expectedFormations?: number;
  expectedPlays?: number;
  mappedFormations?: number;
  mappedPlays?: number;
  stripDimensions?: { width: number; height: number };
  classificationMethod: string;
  cropGeometry: typeof PLAY_CARD_REGIONS;
  perFormation?: Array<{
    formation: string;
    expectedPlays: number;
    extractedPlays: number;
  }>;
  /** Present when section-header OCR assigned formations. */
  formationOcr?: FormationOcrRebucketStats;
  /** Seed formations omitted because they have no DOCX section (e.g. Hail Mary). */
  omittedFormations?: Array<{ formation: string; reason: string; expectedPlays: number }>;
};

function extensionFromMediaPath(mediaPath: string): string {
  const dot = mediaPath.lastIndexOf(".");
  if (dot < 0) return "jpg";
  return mediaPath.slice(dot + 1).toLowerCase();
}

function resolveEmbedTargets(relsXml: string): Map<string, string> {
  const map = new Map<string, string>();
  const relRe = /Id="(rId\d+)"[^>]*Target="([^"]+)"/gi;
  let match: RegExpExecArray | null;
  while ((match = relRe.exec(relsXml)) !== null) {
    const id = match[1];
    let resolved = match[2];
    if (resolved.startsWith("../")) {
      resolved = resolved.replace(/^\.\.\//, "word/");
    } else if (!resolved.startsWith("word/")) {
      resolved = `word/${resolved}`;
    }
    map.set(id, resolved);
  }
  return map;
}

function orderedImageEmbedIds(documentXml: string): string[] {
  const ids: string[] = [];
  const blipRe = new RegExp(DOCUMENT_EMBED_ATTR_RE.source, "g");
  let match: RegExpExecArray | null;
  while ((match = blipRe.exec(documentXml)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

function meanLuminance(raw: Buffer, width: number, height: number, x: number, y0: number, y1: number): number {
  let sum = 0;
  let count = 0;
  for (let y = y0; y < y1; y += 1) {
    const i = (y * width + x) * 3;
    sum += (raw[i] + raw[i + 1] + raw[i + 2]) / 3;
    count += 1;
  }
  return count === 0 ? 0 : sum / count;
}

function wideGutterRuns(
  raw: Buffer,
  width: number,
  height: number,
): Array<{ start: number; end: number; width: number }> {
  const y0 = Math.floor(height / 3);
  const y1 = Math.floor((2 * height) / 3);
  const darkCols: number[] = [];
  for (let x = 0; x < width; x += 1) {
    if (meanLuminance(raw, width, height, x, y0, y1) < GUTTER_LUMINANCE_MAX) {
      darkCols.push(x);
    }
  }
  const runs: Array<{ start: number; end: number; width: number }> = [];
  if (darkCols.length === 0) return runs;
  let start = darkCols[0];
  let prev = darkCols[0];
  for (const x of darkCols.slice(1)) {
    if (x === prev + 1) {
      prev = x;
      continue;
    }
    runs.push({ start, end: prev, width: prev - start + 1 });
    start = x;
    prev = x;
  }
  runs.push({ start, end: prev, width: prev - start + 1 });
  return runs.filter((r) => r.width >= MIN_WIDE_GUTTER_PX);
}

/**
 * Play strips have exactly two wide black gutters between three cards.
 * Formation headers have a different multi-panel layout (sidebar + diagram + key players).
 */
export function classifyStripKind(rawRgb: Buffer, width: number, height: number): SourceStripKind {
  const wide = wideGutterRuns(rawRgb, width, height);
  return wide.length === 2 ? "play-strip" : "formation-header";
}

async function decodeRgb(buffer: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
  const image = sharp(buffer);
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) {
    throw new Error("DOCX extraction failed: could not read image dimensions");
  }
  const { data } = await image.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: Buffer.from(data), width, height };
}

async function cropPlayCards(stripBuffer: Buffer, sourceIndex: number): Promise<CardCrop[]> {
  const crops: CardCrop[] = [];
  for (let cardIndex = 0; cardIndex < PLAY_CARD_REGIONS.length; cardIndex += 1) {
    const region = PLAY_CARD_REGIONS[cardIndex];
    const buffer = await sharp(stripBuffer)
      .extract({
        left: region.x,
        top: region.y,
        width: region.width,
        height: region.height,
      })
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();
    crops.push({
      buffer,
      extension: "jpg",
      sourceIndex,
      cardIndex: cardIndex as 0 | 1 | 2,
    });
  }
  return crops;
}

/** Downsample of the play-title band (not OCR — pixel equality only). */
const NAME_BAND = { left: 70, top: 28, width: 500, height: 42 } as const;
const NAME_FP_WIDTH = 100;
const NAME_FP_HEIGHT = 16;
/** Same play-title chrome (e.g. mirrored DIY REVERSE) sits well below this. */
const NAME_BAND_DUP_MEAN_ABS_MAX = 4;

async function nameBandFingerprint(buffer: Buffer): Promise<Buffer> {
  const { data } = await sharp(buffer)
    .extract({ ...NAME_BAND })
    .removeAlpha()
    .resize(NAME_FP_WIDTH, NAME_FP_HEIGHT, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return Buffer.from(data);
}

function meanAbsDelta(a: Buffer, b: Buffer): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return Number.POSITIVE_INFINITY;
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    sum += Math.abs(a[i] - b[i]);
  }
  return sum / n;
}

async function isDuplicateNameBand(a: CardCrop, b: CardCrop): Promise<boolean> {
  const [aFp, bFp] = await Promise.all([
    nameBandFingerprint(a.buffer),
    nameBandFingerprint(b.buffer),
  ]);
  return meanAbsDelta(aFp, bFp) <= NAME_BAND_DUP_MEAN_ABS_MAX;
}

/**
 * When a formation's strips yield more card regions than reference plays,
 * drop extras in this order (fail closed if still over):
 * 1) later card of a near-identical play-title band (game flip / duplicate slot)
 * 2) trailing card regions
 */
async function selectPlayCardsForFormation(
  cards: CardCrop[],
  expectedPlays: number,
  formationName: string,
): Promise<CardCrop[]> {
  if (cards.length < expectedPlays) {
    throw new Error(
      `DOCX segmentation failed: formation "${formationName}" has ${cards.length} card region(s) ` +
        `but reference expects ${expectedPlays}`,
    );
  }

  const selected = [...cards];
  let extras = selected.length - expectedPlays;

  while (extras > 0) {
    let removedDup = false;
    outer: for (let i = 0; i < selected.length; i += 1) {
      for (let j = i + 1; j < selected.length; j += 1) {
        if (await isDuplicateNameBand(selected[i], selected[j])) {
          selected.splice(j, 1);
          extras -= 1;
          removedDup = true;
          break outer;
        }
      }
    }
    if (!removedDup) break;
  }

  while (selected.length > expectedPlays) {
    selected.pop();
  }

  if (selected.length !== expectedPlays) {
    throw new Error(
      `DOCX segmentation failed: formation "${formationName}" could not reduce ` +
        `${cards.length} card region(s) to ${expectedPlays} expected play(s)`,
    );
  }

  return selected;
}

async function loadOrderedSourceStrips(docxPath: string): Promise<SourceStrip[]> {
  const zip = await JSZip.loadAsync(readFileSync(docxPath));
  const documentFile = zip.file("word/document.xml");
  const relsFile = zip.file("word/_rels/document.xml.rels");
  if (!documentFile || !relsFile) {
    throw new Error(
      "DOCX extraction failed: missing word/document.xml or word/_rels/document.xml.rels",
    );
  }

  const documentXml = await documentFile.async("string");
  const relsXml = await relsFile.async("string");
  const embedTargets = resolveEmbedTargets(relsXml);
  const orderedEmbeds = orderedImageEmbedIds(documentXml);

  if (orderedEmbeds.length === 0) {
    throw new Error("DOCX extraction failed: no embedded images found");
  }

  const strips: SourceStrip[] = [];
  for (let sourceIndex = 0; sourceIndex < orderedEmbeds.length; sourceIndex += 1) {
    const embedId = orderedEmbeds[sourceIndex];
    const mediaPath = embedTargets.get(embedId);
    if (!mediaPath) {
      throw new Error(`DOCX extraction failed: unresolved rId=${embedId}`);
    }
    const mediaFile = zip.file(mediaPath);
    if (!mediaFile) {
      throw new Error(`DOCX extraction failed: missing media ${mediaPath}`);
    }
    const buffer = Buffer.from(await mediaFile.async("arraybuffer"));
    const { data, width, height } = await decodeRgb(buffer);
    if (width !== PLAY_STRIP_WIDTH || height !== PLAY_STRIP_HEIGHT) {
      throw new Error(
        `DOCX extraction failed: unexpected strip size ${width}x${height} at sourceIndex=${sourceIndex} ` +
          `(expected ${PLAY_STRIP_WIDTH}x${PLAY_STRIP_HEIGHT})`,
      );
    }
    const kind = classifyStripKind(data, width, height);
    strips.push({ sourceIndex, kind, mediaPath, buffer, width, height });
  }

  return strips;
}

/**
 * Segment DOCX strips into formation headers + ordered play-card crops.
 * Section → seed formation pairing uses OCR of each section header (not position).
 * Reference play counts decide how many crops belong to each matched formation.
 * Extra card regions between headers are dropped by: flip-mirror duplicates first,
 * then trailing unused slots (never published).
 */
export async function extractPlayArtDocx(
  docxPath: string,
  reference: PlayArtReference,
  options?: { skipFormationOcr?: boolean },
): Promise<
  ExtractedPlayArtDoc & {
    structure: PlayArtStructureReport;
    formationOcrAssignments?: CropFormationOcrResult[];
    sectionOcrAssignments?: SectionOcrAssignment[];
    /** Reference with DOCX-optional omissions applied (use for map/match/validate). */
    effectiveReference: PlayArtReference;
  }
> {
  const strips = await loadOrderedSourceStrips(docxPath);
  const headerCount = strips.filter((s) => s.kind === "formation-header").length;
  const playStripCount = strips.filter((s) => s.kind === "play-strip").length;

  if (headerCount === 0) {
    throw new Error(
      "DOCX classification failed: no formation-header strips detected via gutter geometry.",
    );
  }
  if (playStripCount === 0) {
    throw new Error("DOCX classification failed: no play-strip images detected.");
  }

  const sections = await segmentAnonymousSections(strips);
  const requiredFormations = reference.formations.filter(
    (f) => !isDocxOptionalFormation(f.name, reference.playbook),
  );
  const optionalFormations = reference.formations.filter((f) =>
    isDocxOptionalFormation(f.name, reference.playbook),
  );

  if (sections.length !== requiredFormations.length) {
    throw new Error(
      `DOCX segmentation failed: found ${sections.length} formation section(s) but reference ` +
        `expects ${requiredFormations.length} required formation(s)` +
        (optionalFormations.length > 0
          ? ` (+ ${optionalFormations.length} optional: ${optionalFormations.map((f) => f.name).join(", ")})`
          : "") +
        `. Do not fall back to positional pairing.`,
    );
  }

  const knownFormations = reference.formations.map((f) => f.name);
  const playCountByFormation = new Map(
    reference.formations.map((f) => [f.name, f.plays.length] as const),
  );

  // Section OCR is mandatory — positional pairing is not a fallback.
  if (options?.skipFormationOcr || process.env.PLAY_ART_SKIP_FORMATION_OCR === "1") {
    console.warn(
      "  PLAY_ART_SKIP_FORMATION_OCR / skipFormationOcr: skipping per-crop validation only; " +
        "section-header OCR still required (positional pairing removed).",
    );
  }

  const sectionMatched = await matchSectionsByHeaderOcr(
    sections,
    knownFormations,
    playCountByFormation,
  );
  const unidentified = sectionMatched.filter((s) => !s.matchedFormation);
  const unidentifiedRate =
    sectionMatched.length === 0 ? 0 : unidentified.length / sectionMatched.length;
  if (unidentifiedRate > MAX_SECTION_UNIDENTIFIED_RATE) {
    throw new Error(
      `Section OCR unidentified rate ${(unidentifiedRate * 100).toFixed(1)}% exceeds ` +
        `${(MAX_SECTION_UNIDENTIFIED_RATE * 100).toFixed(0)}% — investigate OCR config or seed list drift before continuing.`,
    );
  }
  for (const failed of unidentified) {
    throw new Error(
      formatSectionOcrFailure({
        docPosition: failed.docPosition,
        ocrRawText: failed.ocrRawText,
        ocrFormationText: failed.ocrFormationText,
        knownFormations,
      }),
    );
  }

  const usedFormations = new Set<string>();
  const cardsByFormation = new Map<string, CardCrop[]>();
  const sectionAssignments: SectionOcrAssignment[] = [];

  for (const row of sectionMatched) {
    const formation = row.matchedFormation!;
    if (usedFormations.has(formation)) {
      throw new Error(
        `Section OCR assigned formation "${formation}" twice ` +
          `(DOCX positions include #${row.docPosition}). Headers must map 1:1 to seed formations.`,
      );
    }
    usedFormations.add(formation);
    cardsByFormation.set(formation, row.cards);
    sectionAssignments.push({
      docPosition: row.docPosition,
      headerSourceIndex: row.headerSourceIndex,
      ocrRawText: row.ocrRawText,
      ocrFormationText: row.ocrFormationText,
      matchedFormation: formation,
      matchConfidence: row.matchConfidence,
      matchDistance: row.matchDistance,
    });
    if (row.matchConfidence === "fuzzy") {
      console.log(
        `  Section #${row.docPosition}: fuzzy OCR "${row.ocrFormationText}" → ${formation} ` +
          `(distance ${row.matchDistance})`,
      );
    }
  }

  const omittedFormations: NonNullable<PlayArtStructureReport["omittedFormations"]> = [];
  for (const formation of reference.formations) {
    if (usedFormations.has(formation.name)) continue;
    if (isDocxOptionalFormation(formation.name, reference.playbook)) {
      omittedFormations.push({
        formation: formation.name,
        reason: "absent_from_docx",
        expectedPlays: formation.plays.length,
      });
      console.log(
        `  Omitting optional formation "${formation.name}" (${formation.plays.length} plays) — ` +
          "no DOCX section (cfb.fan fallback for catalog plays)",
      );
      continue;
    }
    throw new Error(
      `Section OCR incomplete; required seed formation with no DOCX section: ${formation.name}`,
    );
  }

  const effectiveFormations = reference.formations.filter((f) => usedFormations.has(f.name));

  const blocks: ClassifiedDocxBlock[] = [];
  const mediaFiles = new Map<string, Buffer>();
  const perFormation: PlayArtStructureReport["perFormation"] = [];
  let blockIndex = 0;
  let generatedPlayCards = 0;

  // Emit in reference formation order (skipping omitted optionals) so map-positional stays aligned.
  for (const formation of effectiveFormations) {
    const expectedPlays = formation.plays.length;
    const formationCards = cardsByFormation.get(formation.name) ?? [];
    if (formationCards.length === 0) {
      throw new Error(
        `DOCX segmentation failed: no play cards for OCR-matched formation "${formation.name}"`,
      );
    }

    const selected = await selectPlayCardsForFormation(
      formationCards,
      expectedPlays,
      formation.name,
    );

    blocks.push({ kind: "formation_header", index: blockIndex });
    blockIndex += 1;

    for (const card of selected) {
      const mediaPath = `crop://${card.sourceIndex}/${card.cardIndex}.jpg`;
      mediaFiles.set(mediaPath, card.buffer);
      blocks.push({
        kind: "play_card",
        index: blockIndex,
        mediaPath,
        extension: card.extension,
      });
      blockIndex += 1;
      generatedPlayCards += 1;
    }

    perFormation.push({
      formation: formation.name,
      expectedPlays,
      extractedPlays: selected.length,
    });
  }

  const structure: PlayArtStructureReport = {
    embeddedImages: strips.length,
    formationHeaders: headerCount,
    playStrips: playStripCount,
    generatedPlayCards,
    expectedFormations: effectiveFormations.length,
    expectedPlays: effectiveFormations.reduce((sum, f) => sum + f.plays.length, 0),
    mappedFormations: effectiveFormations.length,
    mappedPlays: generatedPlayCards,
    stripDimensions: { width: PLAY_STRIP_WIDTH, height: PLAY_STRIP_HEIGHT },
    classificationMethod:
      "wide black gutter geometry: exactly 2 gutters ≥70px → play-strip; otherwise formation-header; " +
      "section→seed via header OCR (no positional pairing)",
    cropGeometry: PLAY_CARD_REGIONS,
    perFormation,
    omittedFormations: omittedFormations.length > 0 ? omittedFormations : undefined,
  };

  const extracted: ExtractedPlayArtDoc = { docxPath, blocks, mediaFiles };
  const skipCropValidation =
    options?.skipFormationOcr === true || process.env.PLAY_ART_SKIP_FORMATION_OCR === "1";

  const effectiveReference: PlayArtReference = {
    ...reference,
    formations: effectiveFormations,
  };

  const ocr = await validateCropHeadersAgainstSections(
    effectiveReference,
    extracted,
    sectionAssignments,
    { skipOcr: skipCropValidation },
  );

  console.log(
    `  Section OCR: ${sectionAssignments.length}/${sectionAssignments.length} sections identified ` +
      `(exact ${ocr.stats.sectionExactMatches}, fuzzy ${ocr.stats.sectionFuzzyMatches})` +
      (omittedFormations.length > 0 ? `; omitted ${omittedFormations.length} optional` : ""),
  );
  if (!skipCropValidation) {
    console.log(
      `  Crop OCR validation: ${ocr.stats.cropValidationAgreements}/${ocr.stats.cropCount} agree with section`,
    );
  }

  return {
    ...extracted,
    structure: {
      ...structure,
      formationOcr: ocr.stats,
    },
    formationOcrAssignments: ocr.assignments,
    sectionOcrAssignments: sectionAssignments,
    effectiveReference,
  };
}

async function segmentAnonymousSections(strips: SourceStrip[]): Promise<AnonymousDocxSection[]> {
  const sections: AnonymousDocxSection[] = [];
  let i = 0;
  let docPosition = 0;

  while (i < strips.length) {
    const header = strips[i];
    if (header.kind !== "formation-header") {
      throw new Error(
        `DOCX segmentation failed: expected formation header at sourceIndex=${header.sourceIndex} ` +
          `but found play-strip (trailing/leading strips without a header are not supported)`,
      );
    }
    docPosition += 1;
    i += 1;

    const cards: CardCrop[] = [];
    while (i < strips.length && strips[i].kind === "play-strip") {
      const strip = strips[i];
      cards.push(...(await cropPlayCards(strip.buffer, strip.sourceIndex)));
      i += 1;
    }

    if (cards.length === 0) {
      throw new Error(
        `DOCX segmentation failed: no play strips found after header at DOCX position #${docPosition} ` +
          `(sourceIndex=${header.sourceIndex})`,
      );
    }

    sections.push({
      docPosition,
      headerSourceIndex: header.sourceIndex,
      headerBuffer: header.buffer,
      cards,
    });
  }

  return sections;
}

type SectionMatchRow = {
  docPosition: number;
  headerSourceIndex: number;
  cards: CardCrop[];
  ocrRawText: string;
  ocrFormationText: string;
  matchedFormation: string | null;
  matchConfidence: "exact" | "fuzzy" | "none";
  matchDistance: number | null;
};

/**
 * OCR the middle panel of each formation-header strip and match against the seed list.
 * Fail-closed: unmatched sections leave matchedFormation null (caller errors).
 */
async function matchSectionsByHeaderOcr(
  sections: AnonymousDocxSection[],
  knownFormations: string[],
  playCountByFormation: Map<string, number>,
): Promise<SectionMatchRow[]> {
  const out: SectionMatchRow[] = [];

  for (const section of sections) {
    const midRegion = PLAY_CARD_REGIONS[1];
    const leftRegion = PLAY_CARD_REGIONS[0];
    const [midPanel, leftPanel] = await Promise.all([
      sharp(section.headerBuffer)
        .extract({
          left: midRegion.x,
          top: midRegion.y,
          width: midRegion.width,
          height: midRegion.height,
        })
        .jpeg({ quality: 92, mozjpeg: true })
        .toBuffer(),
      sharp(section.headerBuffer)
        .extract({
          left: leftRegion.x,
          top: leftRegion.y,
          width: leftRegion.width,
          height: leftRegion.height,
        })
        .jpeg({ quality: 92, mozjpeg: true })
        .toBuffer(),
    ]);

    let ocrRawText = "";
    let ocrFormationText = "";
    let leftRaw = "";
    try {
      const [midOcr, leftOcr] = await Promise.all([
        ocrPlayCardHeader(midPanel),
        ocrPlayCardHeader(leftPanel),
      ]);
      ocrRawText = midOcr.rawText;
      leftRaw = leftOcr.rawText;
      ocrFormationText =
        midOcr.formationText ||
        (midOcr.playNameText ?? "") ||
        (midOcr.rawText.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length >= 2) ?? "");
    } catch (err) {
      ocrRawText = `ocr_error:${err instanceof Error ? err.message : String(err)}`;
      ocrFormationText = "";
    }

    let match = matchSectionHeaderToFormation(
      ocrFormationText,
      knownFormations,
      playCountByFormation,
      section.cards.length,
    );

    // Ambiguous/short section titles — crop-header majority vote before left-panel hint
    // (left panel OCR can misread Flexbone/Wingbone).
    if (!match.matchedFormation && section.cards.length > 0) {
      const cropVote = await majorityVoteFormationFromCrops(
        section.cards,
        knownFormations,
        playCountByFormation,
        section.cards.length,
      );
      if (cropVote.matchedFormation) {
        match = cropVote;
        ocrRawText = `crop-vote: ${cropVote.cleanedText} | ${ocrRawText}`;
      }
    }

    // Still ambiguous — prepend left-panel personnel hint (Flexbone/Gun/…).
    if (!match.matchedFormation) {
      const hint = extractPersonnelHint(leftRaw);
      if (hint) {
        const combined = `${hint} ${match.cleanedText || ocrFormationText}`.trim();
        match = matchSectionHeaderToFormation(
          combined,
          knownFormations,
          playCountByFormation,
          section.cards.length,
        );
        if (match.matchedFormation) {
          ocrRawText = `${leftRaw} | ${ocrRawText}`;
        }
      }
    }

    out.push({
      docPosition: section.docPosition,
      headerSourceIndex: section.headerSourceIndex,
      cards: section.cards,
      ocrRawText,
      ocrFormationText: match.cleanedText || ocrFormationText,
      matchedFormation: match.matchedFormation,
      matchConfidence: match.matchConfidence,
      matchDistance: match.matchDistance,
    });
  }

  return out;
}

/** OCR up to 6 crops and take the majority size-compatible formation vote. */
async function majorityVoteFormationFromCrops(
  cards: CardCrop[],
  knownFormations: string[],
  playCountByFormation: Map<string, number>,
  sectionCardCount: number,
): Promise<{
  matchedFormation: string | null;
  matchConfidence: "exact" | "fuzzy" | "none";
  matchDistance: number | null;
  cleanedText: string;
}> {
  const sample = cards.slice(0, Math.min(6, cards.length));
  const votes = new Map<string, number>();
  const labels: string[] = [];

  for (const card of sample) {
    try {
      const ocr = await ocrPlayCardHeader(card.buffer);
      const label = ocr.formationText || ocr.playNameText || "";
      labels.push(label);
      const match = matchSectionHeaderToFormation(
        label,
        knownFormations,
        playCountByFormation,
        sectionCardCount,
      );
      if (!match.matchedFormation) continue;
      votes.set(match.matchedFormation, (votes.get(match.matchedFormation) ?? 0) + 1);
    } catch {
      // ignore single-crop OCR failures
    }
  }

  let best: { name: string; count: number } | null = null;
  for (const [name, count] of votes) {
    if (!best || count > best.count) best = { name, count };
  }
  if (!best || best.count < 2) {
    return {
      matchedFormation: null,
      matchConfidence: "none",
      matchDistance: null,
      cleanedText: labels[0] ?? "",
    };
  }
  const ties = [...votes.entries()].filter(([, c]) => c === best!.count);
  if (ties.length > 1) {
    return {
      matchedFormation: null,
      matchConfidence: "none",
      matchDistance: null,
      cleanedText: labels[0] ?? "",
    };
  }

  return {
    matchedFormation: best.name,
    matchConfidence: "fuzzy",
    matchDistance: null,
    cleanedText: labels[0] ?? best.name,
  };
}

export async function summarizeDocxStructure(
  docxPath: string,
  reference?: PlayArtReference,
): Promise<PlayArtStructureReport> {
  if (reference) {
    const extracted = await extractPlayArtDocx(docxPath, reference);
    return extracted.structure;
  }

  const strips = await loadOrderedSourceStrips(docxPath);
  const formationHeaders = strips.filter((s) => s.kind === "formation-header").length;
  const playStrips = strips.filter((s) => s.kind === "play-strip").length;
  return {
    embeddedImages: strips.length,
    formationHeaders,
    playStrips,
    generatedPlayCards: playStrips * PLAY_CARD_REGIONS.length,
    stripDimensions: { width: PLAY_STRIP_WIDTH, height: PLAY_STRIP_HEIGHT },
    classificationMethod:
      "wide black gutter geometry: exactly 2 gutters ≥70px → play-strip; otherwise formation-header",
    cropGeometry: PLAY_CARD_REGIONS,
  };
}
