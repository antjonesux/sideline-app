/**
 * OCR every formation-header strip; print document order vs seed/reference order.
 */
import JSZip from "jszip";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { classifyStripKind, PLAY_CARD_REGIONS } from "../extract-docx";
import { ocrPlayCardHeader } from "../formation-ocr";
import type { PlayArtReference } from "../types";

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
  const playbook = process.argv[2] ?? "california";
  const configs: Record<string, { source: string; reference: string; out: string }> = {
    california: {
      source: "scripts/play-art/source/Multiple & Pro Style/California.docx",
      reference: "scripts/play-art/references/cfb27-offense-california.json",
      out: "scripts/play-art/diagnostics/reports/california-header-order.md",
    },
    usc: {
      source: "scripts/play-art/source/Air Raid/cfb27-offense-USC.docx",
      reference: "scripts/play-art/references/cfb27-offense-usc.json",
      out: "scripts/play-art/diagnostics/reports/usc-header-order.md",
    },
    "air-force": {
      source: "scripts/play-art/source/Option & Spread Option/Air Force.docx",
      reference: "scripts/play-art/references/cfb27-offense-air-force.json",
      out: "scripts/play-art/diagnostics/reports/air-force-header-order.md",
    },
  };
  const cfg = configs[playbook];
  if (!cfg) throw new Error(`Unknown playbook ${playbook}`);

  const reference = JSON.parse(readFileSync(resolve(cfg.reference), "utf8")) as PlayArtReference;
  const zip = await JSZip.loadAsync(readFileSync(resolve(cfg.source)));
  const documentXml = await zip.file("word/document.xml")!.async("string");
  const relsXml = await zip.file("word/_rels/document.xml.rels")!.async("string");
  const embedTargets = resolveEmbedTargets(relsXml);
  const ordered = orderedImageEmbedIds(documentXml);

  type HeaderRow = {
    docHeaderIndex: number;
    sourceIndex: number;
    rId: string;
    mediaPath: string;
    playStripCountAfter: number;
    rawCards: number;
    ocrLabel: string;
    rawOcr: string;
  };

  const headers: HeaderRow[] = [];
  let i = 0;
  let docHeaderIndex = 0;
  while (i < ordered.length) {
    const rId = ordered[i];
    const mediaPath = embedTargets.get(rId)!;
    const buffer = Buffer.from(await zip.file(mediaPath)!.async("arraybuffer"));
    const image = sharp(buffer);
    const meta = await image.metadata();
    const { data } = await image.removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const raw = Buffer.from(data);
    const kind = classifyStripKind(raw, meta.width!, meta.height!);
    if (kind !== "formation-header") {
      i += 1;
      continue;
    }

    // OCR middle panel of header for formation name (card1 region often has title)
    const region = PLAY_CARD_REGIONS[1];
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
    const ocrLabel = (ocr.formationText || ocr.playNameText || ocr.rawText.split("\n")[0] || "")
      .replace(/\s+/g, " ")
      .trim();

    let j = i + 1;
    let playStripCountAfter = 0;
    while (j < ordered.length) {
      const rId2 = ordered[j];
      const mediaPath2 = embedTargets.get(rId2)!;
      const buffer2 = Buffer.from(await zip.file(mediaPath2)!.async("arraybuffer"));
      const image2 = sharp(buffer2);
      const meta2 = await image2.metadata();
      const { data: data2 } = await image2.removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const kind2 = classifyStripKind(Buffer.from(data2), meta2.width!, meta2.height!);
      if (kind2 === "formation-header") break;
      playStripCountAfter += 1;
      j += 1;
    }

    headers.push({
      docHeaderIndex,
      sourceIndex: i,
      rId,
      mediaPath,
      playStripCountAfter,
      rawCards: playStripCountAfter * 3,
      ocrLabel,
      rawOcr: ocr.rawText.replace(/\n/g, " | "),
    });
    console.log(
      `#${docHeaderIndex} src=${i} cards=${playStripCountAfter * 3} OCR=${JSON.stringify(ocrLabel)}`,
    );
    docHeaderIndex += 1;
    i = j;
  }

  const lines: string[] = [];
  lines.push(`# ${playbook} DOCX header order vs seed/reference`);
  lines.push("");
  lines.push("## DOCX document order (geometry headers + OCR label)");
  lines.push("");
  lines.push("| Doc# | src# | Raw cards | OCR label | Raw OCR |");
  lines.push("|-----:|-----:|----------:|-----------|---------|");
  for (const h of headers) {
    lines.push(
      `| ${h.docHeaderIndex} | ${h.sourceIndex} | ${h.rawCards} | ${h.ocrLabel} | ${h.rawOcr.replace(/\|/g, "/")} |`,
    );
  }
  lines.push("");
  lines.push("## Seed/reference order");
  lines.push("");
  lines.push("| Ref# | Formation | Seed plays |");
  lines.push("|-----:|-----------|----------:|");
  reference.formations.forEach((f, idx) => {
    lines.push(`| ${idx} | ${f.name} | ${f.plays.length} |`);
  });
  lines.push("");
  lines.push("## Alignment check (positional)");
  lines.push("");
  lines.push("| Ref# | Seed formation | Seed n | Doc# | OCR label | Doc n | Δ |");
  lines.push("|-----:|----------------|-------:|-----:|-----------|------:|--:|");
  const n = Math.max(reference.formations.length, headers.length);
  for (let idx = 0; idx < n; idx += 1) {
    const ref = reference.formations[idx];
    const doc = headers[idx];
    const delta =
      ref && doc ? doc.rawCards - ref.plays.length : ref ? -ref.plays.length : doc?.rawCards ?? 0;
    lines.push(
      `| ${idx} | ${ref?.name ?? "—"} | ${ref?.plays.length ?? "—"} | ${doc?.docHeaderIndex ?? "—"} | ${doc?.ocrLabel ?? "—"} | ${doc?.rawCards ?? "—"} | ${delta} |`,
    );
  }
  lines.push("");

  writeFileSync(resolve(cfg.out), lines.join("\n"), "utf8");
  console.log(`Wrote ${cfg.out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
