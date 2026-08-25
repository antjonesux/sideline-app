import { readFileSync } from "node:fs";
import JSZip from "jszip";
import sharp from "sharp";
import { classifyStripKind, PLAY_CARD_REGIONS } from "../extract-docx";
import { matchSectionHeaderToFormation, ocrPlayCardHeader } from "../formation-ocr";
import type { PlayArtReference } from "../types";

const CONFIG: Record<string, { reference: string; source: string }> = {
  california: {
    reference: "scripts/play-art/references/cfb27-offense-california.json",
    source: "scripts/play-art/source/Multiple & Pro Style/California.docx",
  },
  "air-force": {
    reference: "scripts/play-art/references/cfb27-offense-air-force.json",
    source: "scripts/play-art/source/Option & Spread Option/Air Force.docx",
  },
  usc: {
    reference: "scripts/play-art/references/cfb27-offense-usc.json",
    source: "scripts/play-art/source/Air Raid/cfb27-offense-USC.docx",
  },
};

async function main(): Promise<void> {
  const playbook = process.argv[2] ?? "california";
  const cfg = CONFIG[playbook];
  if (!cfg) throw new Error(`Unknown playbook ${playbook}`);

  console.log(`Probing ${playbook}: ${cfg.source}`);
  const ref = JSON.parse(readFileSync(cfg.reference, "utf8")) as PlayArtReference;
  const known = ref.formations.map((f) => f.name);
  const playCount = new Map(ref.formations.map((f) => [f.name, f.plays.length] as const));
  const zip = await JSZip.loadAsync(readFileSync(cfg.source));
  const documentXml = await zip.file("word/document.xml")!.async("string");
  const relsXml = await zip.file("word/_rels/document.xml.rels")!.async("string");
  const embedTargets = new Map<string, string>();
  for (const m of relsXml.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/gi)) {
    let t = m[2];
    if (t.startsWith("../")) t = t.replace(/^\.\.\//, "word/");
    else if (!t.startsWith("word/")) t = `word/${t}`;
    embedTargets.set(m[1], t);
  }
  const embeds = [...documentXml.matchAll(/\br:embed="([^"]+)"/g)].map((m) => m[1]);

  let docPos = 0;
  let i = 0;
  const used = new Set<string>();
  while (i < embeds.length) {
    const mediaPath = embedTargets.get(embeds[i])!;
    const buffer = Buffer.from(await zip.file(mediaPath)!.async("arraybuffer"));
    const image = sharp(buffer);
    const meta = await image.metadata();
    const { data } = await image.removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const kind = classifyStripKind(Buffer.from(data), meta.width!, meta.height!);
    if (kind !== "formation-header") {
      i += 1;
      continue;
    }
    docPos += 1;
    let cards = 0;
    let j = i + 1;
    while (j < embeds.length) {
      const mp2 = embedTargets.get(embeds[j])!;
      const buf2 = Buffer.from(await zip.file(mp2)!.async("arraybuffer"));
      const img2 = sharp(buf2);
      const meta2 = await img2.metadata();
      const { data: d2 } = await img2.removeAlpha().raw().toBuffer({ resolveWithObject: true });
      if (classifyStripKind(Buffer.from(d2), meta2.width!, meta2.height!) === "formation-header") {
        break;
      }
      cards += 3;
      j += 1;
    }
    const region = PLAY_CARD_REGIONS[1];
    const panel = await sharp(buffer)
      .extract({ left: region.x, top: region.y, width: region.width, height: region.height })
      .jpeg()
      .toBuffer();
    const ocr = await ocrPlayCardHeader(panel);
    const label = ocr.formationText || ocr.playNameText || ocr.rawText;
    const match = matchSectionHeaderToFormation(label, known, playCount, cards);
    const status = match.matchedFormation
      ? used.has(match.matchedFormation)
        ? "DUP"
        : "OK"
      : "FAIL";
    if (match.matchedFormation) used.add(match.matchedFormation);
    if (status !== "OK") {
      console.log(
        `#${docPos} cards=${cards} cleaned=${JSON.stringify(match.cleanedText)} → ${match.matchedFormation ?? "null"} (${match.matchConfidence}) ${status} raw=${JSON.stringify(ocr.rawText.replace(/\n/g, " | "))}`,
      );
    }
    i = j;
  }
  const missing = known.filter((n) => !used.has(n) && !/^hail mary/i.test(n));
  console.log(`Sections: ${docPos}; matched: ${used.size}; missing required: ${missing.length}`);
  if (missing.length) console.log("Missing required:", missing);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
