import JSZip from "jszip";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import type { ClassifiedDocxBlock, ExtractedPlayArtDoc, PlayArtReference } from "./types";

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
 * Reference play counts decide how many crops belong to each formation.
 * Extra card regions between headers are dropped by: flip-mirror duplicates first,
 * then trailing unused slots (never published).
 */
export async function extractPlayArtDocx(
  docxPath: string,
  reference: PlayArtReference,
): Promise<ExtractedPlayArtDoc & { structure: PlayArtStructureReport }> {
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

  type QueueItem =
    | { kind: "formation-header"; sourceIndex: number }
    | { kind: "play-strip"; sourceIndex: number; cards: CardCrop[] };

  const queue: QueueItem[] = [];
  for (const strip of strips) {
    if (strip.kind === "formation-header") {
      queue.push({ kind: "formation-header", sourceIndex: strip.sourceIndex });
      continue;
    }
    const cards = await cropPlayCards(strip.buffer, strip.sourceIndex);
    queue.push({ kind: "play-strip", sourceIndex: strip.sourceIndex, cards });
  }

  const blocks: ClassifiedDocxBlock[] = [];
  const mediaFiles = new Map<string, Buffer>();
  const perFormation: PlayArtStructureReport["perFormation"] = [];
  let queueIndex = 0;
  let blockIndex = 0;
  let generatedPlayCards = 0;

  for (let formationIndex = 0; formationIndex < reference.formations.length; formationIndex += 1) {
    const formation = reference.formations[formationIndex];
    const expectedPlays = formation.plays.length;
    const item = queue[queueIndex];
    if (!item || item.kind !== "formation-header") {
      throw new Error(
        `DOCX segmentation failed: expected formation header for "${formation.name}" ` +
          `(formation ${formationIndex + 1}/${reference.formations.length}) but found ` +
          `${item?.kind ?? "end of document"} at queue index ${queueIndex}`,
      );
    }
    blocks.push({ kind: "formation_header", index: blockIndex });
    blockIndex += 1;
    queueIndex += 1;

    const formationCards: CardCrop[] = [];
    while (queueIndex < queue.length && queue[queueIndex].kind === "play-strip") {
      const stripItem = queue[queueIndex];
      if (stripItem.kind !== "play-strip") break;
      formationCards.push(...stripItem.cards);
      queueIndex += 1;
    }

    if (formationCards.length === 0) {
      throw new Error(
        `DOCX segmentation failed: no play strips found after header for "${formation.name}"`,
      );
    }

    const selected = await selectPlayCardsForFormation(
      formationCards,
      expectedPlays,
      formation.name,
    );

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

  if (queueIndex < queue.length) {
    const leftover = queue.length - queueIndex;
    throw new Error(
      `DOCX segmentation failed: ${leftover} source strip(s) remain after consuming all ` +
        `${reference.formations.length} reference formations. ` +
        "Reference/source alignment is incomplete — do not shift mapping.",
    );
  }

  const structure: PlayArtStructureReport = {
    embeddedImages: strips.length,
    formationHeaders: headerCount,
    playStrips: playStripCount,
    generatedPlayCards,
    expectedFormations: reference.formations.length,
    expectedPlays: reference.formations.reduce((sum, f) => sum + f.plays.length, 0),
    mappedFormations: reference.formations.length,
    mappedPlays: generatedPlayCards,
    stripDimensions: { width: PLAY_STRIP_WIDTH, height: PLAY_STRIP_HEIGHT },
    classificationMethod:
      "wide black gutter geometry: exactly 2 gutters ≥70px → play-strip; otherwise formation-header",
    cropGeometry: PLAY_CARD_REGIONS,
    perFormation,
  };

  return { docxPath, blocks, mediaFiles, structure };
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
