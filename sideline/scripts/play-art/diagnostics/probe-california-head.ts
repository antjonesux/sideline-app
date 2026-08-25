/**
 * One-off probe: OCR California strips 0–11 to identify Bunch X Nasty missing row.
 */
import JSZip from "jszip";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import {
  classifyStripKind,
  PLAY_CARD_REGIONS,
} from "../extract-docx";
import { ocrPlayCardHeader } from "../formation-ocr";

const DOCUMENT_EMBED_ATTR_RE = /\br:embed="([^"]+)"/g;
const MIN = 70;
const GMAX = 25;

function resolveEmbedTargets(relsXml: string): Map<string, string> {
  const map = new Map<string, string>();
  const relRe = /Id="(rId\d+)"[^>]*Target="([^"]+)"/gi;
  let match: RegExpExecArray | null;
  while ((match = relRe.exec(relsXml)) !== null) {
    let resolved = match[2];
    if (resolved.startsWith("../")) resolved = resolved.replace(/^\.\.\//, "word/");
    else if (!resolved.startsWith("word/")) resolved = `word/${resolved}`;
    map.set(match[1], resolved);
  }
  return map;
}

function orderedImageEmbedIds(documentXml: string): string[] {
  const ids: string[] = [];
  const blipRe = new RegExp(DOCUMENT_EMBED_ATTR_RE.source, "g");
  let match: RegExpExecArray | null;
  while ((match = blipRe.exec(documentXml)) !== null) ids.push(match[1]);
  return ids;
}

function meanLuminance(
  raw: Buffer,
  width: number,
  height: number,
  x: number,
  y0: number,
  y1: number,
): number {
  let s = 0;
  let c = 0;
  for (let y = y0; y < y1; y += 1) {
    const i = (y * width + x) * 3;
    s += (raw[i] + raw[i + 1] + raw[i + 2]) / 3;
    c += 1;
  }
  return s / c;
}

function wideGutterRuns(raw: Buffer, width: number, height: number) {
  const y0 = Math.floor(height / 3);
  const y1 = Math.floor((2 * height) / 3);
  const dark: number[] = [];
  for (let x = 0; x < width; x += 1) {
    if (meanLuminance(raw, width, height, x, y0, y1) < GMAX) dark.push(x);
  }
  const runs: Array<{ start: number; end: number; width: number }> = [];
  if (!dark.length) return runs;
  let start = dark[0];
  let prev = dark[0];
  for (const x of dark.slice(1)) {
    if (x === prev + 1) {
      prev = x;
      continue;
    }
    runs.push({ start, end: prev, width: prev - start + 1 });
    start = x;
    prev = x;
  }
  runs.push({ start, end: prev, width: prev - start + 1 });
  return runs.filter((r) => r.width >= MIN);
}

async function main(): Promise<void> {
  const path = "scripts/play-art/source/Multiple & Pro Style/California.docx";
  const zip = await JSZip.loadAsync(readFileSync(path));
  const documentXml = await zip.file("word/document.xml")!.async("string");
  const relsXml = await zip.file("word/_rels/document.xml.rels")!.async("string");
  const embedTargets = resolveEmbedTargets(relsXml);
  const ordered = orderedImageEmbedIds(documentXml);

  for (const sourceIndex of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
    const rId = ordered[sourceIndex];
    const mediaPath = embedTargets.get(rId)!;
    const buffer = Buffer.from(await zip.file(mediaPath)!.async("arraybuffer"));
    const image = sharp(buffer);
    const meta = await image.metadata();
    const { data } = await image.removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const raw = Buffer.from(data);
    const gutters = wideGutterRuns(raw, meta.width!, meta.height!);
    const kind = classifyStripKind(raw, meta.width!, meta.height!);
    console.log(
      `\n=== src#${sourceIndex} ${rId} ${mediaPath} kind=${kind} gutters=${gutters.length} ${JSON.stringify(gutters)}`,
    );
    for (let cardIndex = 0; cardIndex < 3; cardIndex += 1) {
      const region = PLAY_CARD_REGIONS[cardIndex];
      const card = await sharp(buffer)
        .extract({
          left: region.x,
          top: region.y,
          width: region.width,
          height: region.height,
        })
        .jpeg()
        .toBuffer();
      const ocr = await ocrPlayCardHeader(card);
      console.log(
        `  card${cardIndex}: play=${JSON.stringify(ocr.playNameText)} formation=${JSON.stringify(ocr.formationText)} raw=${JSON.stringify(ocr.rawText.replace(/\n/g, " | "))}`,
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
