/**
 * Instrumented extraction audit — shadows extract-docx strip loading / classification
 * without modifying production code.
 *
 * Reports:
 *   california-extraction-trace.md
 *   air-force-extraction-audit.md
 *   usc-extraction-audit.md
 *   extraction-audit-summary.md
 *
 *   npx tsx scripts/play-art/diagnostics/extraction-audit.ts
 *   npx tsx scripts/play-art/diagnostics/extraction-audit.ts --playbook=california
 */
import JSZip from "jszip";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import sharp from "sharp";
import {
  classifyStripKind,
  PLAY_CARD_REGIONS,
  PLAY_STRIP_HEIGHT,
  PLAY_STRIP_WIDTH,
} from "../extract-docx";
import { ocrPlayCardHeader } from "../formation-ocr";
import type { PlayArtReference } from "../types";

const DOCUMENT_EMBED_ATTR_RE = /\br:embed="([^"]+)"/g;
const MIN_WIDE_GUTTER_PX = 70;
const GUTTER_LUMINANCE_MAX = 25;

const REPORT_DIR = resolve("scripts/play-art/diagnostics/reports");

const PLAYBOOKS = {
  california: {
    label: "California",
    source: "scripts/play-art/source/Multiple & Pro Style/California.docx",
    reference: "scripts/play-art/references/cfb27-offense-california.json",
    focusFormation: "Singleback Bunch X Nasty",
    knownDocxPlayNames: [
      "MTN X Whip",
      "MTN HB Dive",
      "MTN PA Deep X Over",
      "PA Drag Wheel",
      "HB Slam",
      "PA Boot",
      "Inside Zone Split",
      "PA Boot Slide",
      "Crack Toss",
      "Spacing",
      "Counter Y",
      "PA Counter",
      "Verticals",
      "HB Dive",
      "PA Cross",
    ],
  },
  "air-force": {
    label: "Air Force",
    source: "scripts/play-art/source/Option & Spread Option/Air Force.docx",
    reference: "scripts/play-art/references/cfb27-offense-air-force.json",
    focusFormation: null as string | null,
    knownDocxPlayNames: [] as string[],
  },
  usc: {
    label: "USC",
    source: "scripts/play-art/source/Air Raid/cfb27-offense-USC.docx",
    reference: "scripts/play-art/references/cfb27-offense-usc.json",
    focusFormation: null as string | null,
    knownDocxPlayNames: [] as string[],
  },
} as const;

type PlaybookKey = keyof typeof PLAYBOOKS;
type StripKind = "formation-header" | "play-strip";

type AuditStrip = {
  sourceIndex: number;
  rId: string;
  mediaPath: string;
  kind: StripKind;
  wideGutterCount: number;
  wideGutters: Array<{ start: number; end: number; width: number }>;
  width: number;
  height: number;
  byteLength: number;
};

type FormationSection = {
  formationIndex: number;
  formationName: string;
  expectedPlays: number;
  headerStrip: AuditStrip | null;
  playStrips: AuditStrip[];
  rawCardRegions: number;
  delta: number;
  status: "ok" | "under" | "over" | "missing-header" | "no-strips";
  /** Strips after this section's play strips that would start the next section. */
  terminatingStrip: AuditStrip | null;
};

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

function meanLuminance(
  raw: Buffer,
  width: number,
  height: number,
  x: number,
  y0: number,
  y1: number,
): number {
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

async function decodeRgb(buffer: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
  const image = sharp(buffer);
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) {
    throw new Error("Could not read image dimensions");
  }
  const { data } = await image.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: Buffer.from(data), width, height };
}

async function loadAuditStrips(docxPath: string): Promise<{
  strips: AuditStrip[];
  buffers: Map<number, Buffer>;
  mediaCount: number;
  embedCount: number;
}> {
  const zip = await JSZip.loadAsync(readFileSync(docxPath));
  const mediaCount = Object.keys(zip.files).filter(
    (p) => p.startsWith("word/media/") && !p.endsWith("/"),
  ).length;
  const documentFile = zip.file("word/document.xml");
  const relsFile = zip.file("word/_rels/document.xml.rels");
  if (!documentFile || !relsFile) {
    throw new Error("Missing document.xml or document.xml.rels");
  }
  const documentXml = await documentFile.async("string");
  const relsXml = await relsFile.async("string");
  const embedTargets = resolveEmbedTargets(relsXml);
  const orderedEmbeds = orderedImageEmbedIds(documentXml);

  const strips: AuditStrip[] = [];
  const buffers = new Map<number, Buffer>();

  for (let sourceIndex = 0; sourceIndex < orderedEmbeds.length; sourceIndex += 1) {
    const rId = orderedEmbeds[sourceIndex];
    const mediaPath = embedTargets.get(rId);
    if (!mediaPath) throw new Error(`Unresolved ${rId}`);
    const mediaFile = zip.file(mediaPath);
    if (!mediaFile) throw new Error(`Missing ${mediaPath}`);
    const buffer = Buffer.from(await mediaFile.async("arraybuffer"));
    const { data, width, height } = await decodeRgb(buffer);
    if (width !== PLAY_STRIP_WIDTH || height !== PLAY_STRIP_HEIGHT) {
      throw new Error(
        `Unexpected strip size ${width}x${height} at sourceIndex=${sourceIndex} (${mediaPath})`,
      );
    }
    const gutters = wideGutterRuns(data, width, height);
    const kind = classifyStripKind(data, width, height);
    strips.push({
      sourceIndex,
      rId,
      mediaPath,
      kind,
      wideGutterCount: gutters.length,
      wideGutters: gutters,
      width,
      height,
      byteLength: buffer.length,
    });
    buffers.set(sourceIndex, buffer);
  }

  return { strips, buffers, mediaCount, embedCount: orderedEmbeds.length };
}

/**
 * Mirror extractPlayArtDocx segmentation: consume reference formations in order,
 * each taking one formation-header then consecutive play-strips.
 */
function segmentAgainstReference(
  strips: AuditStrip[],
  reference: PlayArtReference,
): { sections: FormationSection[]; leftoverStrips: AuditStrip[]; queueExhaustedEarly: boolean } {
  const sections: FormationSection[] = [];
  let i = 0;

  for (let formationIndex = 0; formationIndex < reference.formations.length; formationIndex += 1) {
    const formation = reference.formations[formationIndex];
    const expectedPlays = formation.plays.length;

    if (i >= strips.length || strips[i].kind !== "formation-header") {
      sections.push({
        formationIndex,
        formationName: formation.name,
        expectedPlays,
        headerStrip: null,
        playStrips: [],
        rawCardRegions: 0,
        delta: -expectedPlays,
        status: "missing-header",
        terminatingStrip: i < strips.length ? strips[i] : null,
      });
      return { sections, leftoverStrips: strips.slice(i), queueExhaustedEarly: true };
    }

    const headerStrip = strips[i];
    i += 1;
    const playStrips: AuditStrip[] = [];
    while (i < strips.length && strips[i].kind === "play-strip") {
      playStrips.push(strips[i]);
      i += 1;
    }

    const rawCardRegions = playStrips.length * PLAY_CARD_REGIONS.length;
    const delta = rawCardRegions - expectedPlays;
    let status: FormationSection["status"] = "ok";
    if (playStrips.length === 0) status = "no-strips";
    else if (delta < 0) status = "under";
    else if (delta > 0) status = "over";

    sections.push({
      formationIndex,
      formationName: formation.name,
      expectedPlays,
      headerStrip,
      playStrips,
      rawCardRegions,
      delta,
      status,
      terminatingStrip: i < strips.length ? strips[i] : null,
    });
  }

  return { sections, leftoverStrips: strips.slice(i), queueExhaustedEarly: false };
}

function normalizePlayName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[®©™@]/g, " ")
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fuzzyIncludes(haystack: string[], needle: string): boolean {
  const n = normalizePlayName(needle);
  return haystack.some((h) => {
    const hn = normalizePlayName(h);
    return hn === n || hn.includes(n) || n.includes(hn);
  });
}

async function cropStripCards(stripBuffer: Buffer): Promise<Buffer[]> {
  const out: Buffer[] = [];
  for (const region of PLAY_CARD_REGIONS) {
    const buffer = await sharp(stripBuffer)
      .extract({
        left: region.x,
        top: region.y,
        width: region.width,
        height: region.height,
      })
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();
    out.push(buffer);
  }
  return out;
}

async function ocrCardNames(
  stripBuffer: Buffer,
): Promise<Array<{ cardIndex: number; playName: string | null; formationText: string; raw: string }>> {
  const cards = await cropStripCards(stripBuffer);
  const results: Array<{
    cardIndex: number;
    playName: string | null;
    formationText: string;
    raw: string;
  }> = [];
  for (let cardIndex = 0; cardIndex < cards.length; cardIndex += 1) {
    try {
      const ocr = await ocrPlayCardHeader(cards[cardIndex]);
      results.push({
        cardIndex,
        playName: ocr.playNameText,
        formationText: ocr.formationText,
        raw: ocr.rawText,
      });
    } catch (err) {
      results.push({
        cardIndex,
        playName: null,
        formationText: "",
        raw: `OCR_ERROR: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }
  return results;
}

function parsePlaybookFilter(argv: string[]): PlaybookKey[] | null {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--playbook=")) {
      const key = arg.slice("--playbook=".length) as PlaybookKey;
      if (!(key in PLAYBOOKS)) throw new Error(`Unknown playbook: ${key}`);
      return [key];
    }
    if (arg === "--playbook" && argv[i + 1]) {
      const key = argv[++i] as PlaybookKey;
      if (!(key in PLAYBOOKS)) throw new Error(`Unknown playbook: ${key}`);
      return [key];
    }
  }
  return null;
}

type PlaybookAudit = {
  key: PlaybookKey;
  label: string;
  mediaCount: number;
  embedCount: number;
  headerCount: number;
  playStripCount: number;
  sections: FormationSection[];
  leftoverStrips: AuditStrip[];
  underFormations: FormationSection[];
  overFormations: FormationSection[];
  totalUnderCards: number;
  totalOverCards: number;
  strips: AuditStrip[];
  buffers: Map<number, Buffer>;
  reference: PlayArtReference;
  focusDeepDive?: FocusDeepDive;
};

type FocusDeepDive = {
  formationName: string;
  section: FormationSection;
  capturedOcrNames: string[];
  knownVisibleNames: readonly string[];
  missingKnownNames: string[];
  /** If terminator looks like a misclassified play strip, OCR its "cards". */
  terminatorAsPlayStripOcr: Array<{
    cardIndex: number;
    playName: string | null;
    formationText: string;
    raw: string;
  }> | null;
  terminatorAnalysis: string;
  pattern: string;
  hypotheses: Array<{ id: string; verdict: string; evidence: string }>;
};

async function auditPlaybook(key: PlaybookKey): Promise<PlaybookAudit> {
  const cfg = PLAYBOOKS[key];
  const source = resolve(cfg.source);
  const reference = JSON.parse(readFileSync(resolve(cfg.reference), "utf8")) as PlayArtReference;

  console.log(`\n=== ${cfg.label} ===`);
  console.log(`Loading strips from ${source}…`);
  const { strips, buffers, mediaCount, embedCount } = await loadAuditStrips(source);
  const headerCount = strips.filter((s) => s.kind === "formation-header").length;
  const playStripCount = strips.filter((s) => s.kind === "play-strip").length;
  console.log(
    `  embeds=${embedCount} media=${mediaCount} headers=${headerCount} playStrips=${playStripCount}`,
  );

  const { sections, leftoverStrips } = segmentAgainstReference(strips, reference);
  const underFormations = sections.filter((s) => s.status === "under" || s.status === "no-strips");
  const overFormations = sections.filter((s) => s.status === "over");
  const totalUnderCards = underFormations.reduce((sum, s) => sum + Math.max(0, -s.delta), 0);
  const totalOverCards = overFormations.reduce((sum, s) => sum + Math.max(0, s.delta), 0);

  console.log(
    `  sections under=${underFormations.length} over=${overFormations.length} ` +
      `cardsDroppedAsTrailingExtras=${totalOverCards} cardsMissingVsSeed=${totalUnderCards}`,
  );

  let focusDeepDive: FocusDeepDive | undefined;
  if (cfg.focusFormation) {
    focusDeepDive = await buildFocusDeepDive(
      cfg.focusFormation,
      sections,
      strips,
      buffers,
      cfg.knownDocxPlayNames,
    );
  }

  return {
    key,
    label: cfg.label,
    mediaCount,
    embedCount,
    headerCount,
    playStripCount,
    sections,
    leftoverStrips,
    underFormations,
    overFormations,
    totalUnderCards,
    totalOverCards,
    strips,
    buffers,
    reference,
    focusDeepDive,
  };
}

async function buildFocusDeepDive(
  formationName: string,
  sections: FormationSection[],
  strips: AuditStrip[],
  buffers: Map<number, Buffer>,
  knownVisibleNames: readonly string[],
): Promise<FocusDeepDive> {
  const section = sections.find((s) => s.formationName === formationName);
  if (!section) {
    throw new Error(`Focus formation not found in segmented sections: ${formationName}`);
  }

  console.log(`  Deep dive: ${formationName} (raw=${section.rawCardRegions} expected=${section.expectedPlays})`);

  const capturedOcrNames: string[] = [];
  for (const strip of section.playStrips) {
    const buf = buffers.get(strip.sourceIndex);
    if (!buf) continue;
    const ocrRows = await ocrCardNames(buf);
    for (const row of ocrRows) {
      if (row.playName) capturedOcrNames.push(row.playName);
      else capturedOcrNames.push(`(unreadable card ${strip.sourceIndex}/${row.cardIndex})`);
    }
  }

  const missingKnownNames = knownVisibleNames.filter((n) => !fuzzyIncludes(capturedOcrNames, n));

  let terminatorAsPlayStripOcr: FocusDeepDive["terminatorAsPlayStripOcr"] = null;
  let terminatorAnalysis = "No terminating strip (end of document).";
  const term = section.terminatingStrip;
  if (term) {
    terminatorAnalysis =
      `Next strip after section: sourceIndex=${term.sourceIndex} rId=${term.rId} ` +
      `kind=${term.kind} wideGutters=${term.wideGutterCount} ` +
      `[${term.wideGutters.map((g) => `${g.start}-${g.end}(${g.width}px)`).join(", ")}] ` +
      `media=${term.mediaPath} bytes=${term.byteLength}`;

    if (term.kind === "formation-header" && term.wideGutterCount !== 2) {
      // Suspect misclassified play strip — try cropping as 3 cards anyway.
      const buf = buffers.get(term.sourceIndex);
      if (buf) {
        terminatorAsPlayStripOcr = await ocrCardNames(buf);
        const names = terminatorAsPlayStripOcr
          .map((r) => r.playName ?? "(unreadable)")
          .join(", ");
        terminatorAnalysis +=
          `\n\nForced play-strip OCR on terminator (even though classified as formation-header): ${names}`;
      }
    }
  }

  // Look ahead: how many consecutive play-strips exist if we ignored this terminator?
  let wouldBeExtraPlayStrips = 0;
  if (term) {
    let j = term.sourceIndex + 1;
    // If terminator were play-strip, count it + following play-strips until real header
    // First check if forcing terminator as play-strip would recover cards.
    const afterTermPlayStrips: AuditStrip[] = [];
    // Start from terminator index in strips array
    const termArrIdx = strips.findIndex((s) => s.sourceIndex === term.sourceIndex);
    if (termArrIdx >= 0) {
      // pretend term is play-strip; count until next true header after it
      for (let k = termArrIdx; k < strips.length; k += 1) {
        if (k === termArrIdx) {
          afterTermPlayStrips.push(strips[k]);
          continue;
        }
        if (strips[k].kind === "formation-header") break;
        afterTermPlayStrips.push(strips[k]);
      }
      wouldBeExtraPlayStrips = afterTermPlayStrips.length;
    }
    void j;
  }

  const recoveredIfTerminatorIsPlay =
    section.rawCardRegions + (term?.kind === "formation-header" ? 3 : 0);
  const pattern =
    section.delta === -3 && term?.kind === "formation-header"
      ? `Exactly one strip (3 cards) short. Section terminates on sourceIndex=${term.sourceIndex} ` +
        `classified as formation-header with ${term.wideGutterCount} wide gutter(s) ` +
        `(play-strip requires exactly 2). Likely misclassification of a play strip as a header ` +
        `(or a true early header). Recovered card count if terminator counted as play-strip: ` +
        `${recoveredIfTerminatorIsPlay} (need ${section.expectedPlays}).`
      : section.delta < 0
        ? `Under by ${-section.delta} card region(s) across ${section.playStrips.length} play strip(s).`
        : `No under-count on focus formation.`;

  const hypotheses: FocusDeepDive["hypotheses"] = [
    {
      id: "A — Filename vs relationship order",
      verdict: "Ruled out for production path",
      evidence:
        "extract-docx.ts orders via orderedImageEmbedIds(document.xml) + document.xml.rels; " +
        "this audit uses the same order. Filename sort is not used for strip sequencing.",
    },
    {
      id: "B — Page-break truncation",
      verdict: "Unlikely as primary cause",
      evidence:
        "DOCX embeds are a flat ordered list of strips; there is no page-scoped crop loop. " +
        "A page break would only matter if Google Docs omitted embeds (media/embed counts should show that).",
    },
    {
      id: "C — Layout-based termination (fixed rows)",
      verdict: "Partially related",
      evidence:
        "Segmentation stops at the next formation-header classification, not at a fixed 5-row layout. " +
        "A misclassified mid-section strip acts like early layout termination.",
    },
    {
      id: "D — Dedup by image hash / name band",
      verdict: "Ruled out for California under-count",
      evidence:
        "Name-band dedup and trailing pop only run when rawCards > expected. " +
        `Focus has raw=${section.rawCardRegions} < expected=${section.expectedPlays} — fail-closed path.`,
    },
    {
      id: "E — Image dimension filtering",
      verdict: "Ruled out",
      evidence:
        "Non-2048×355 strips throw hard; this audit loaded all embeds at expected dimensions.",
    },
    {
      id: "F — Section boundary / misclassification",
      verdict:
        term?.kind === "formation-header" && section.delta === -3
          ? "CONFIRMED as leading hypothesis"
          : "Possible",
      evidence:
        pattern +
        (terminatorAsPlayStripOcr
          ? ` Terminator forced-OCR play names: ${terminatorAsPlayStripOcr.map((r) => r.playName ?? "?").join(", ")}.`
          : "") +
        (wouldBeExtraPlayStrips
          ? ` If terminator treated as play-strip, ${wouldBeExtraPlayStrips} strip(s) would join before next header.`
          : ""),
    },
  ];

  return {
    formationName,
    section,
    capturedOcrNames,
    knownVisibleNames,
    missingKnownNames,
    terminatorAsPlayStripOcr,
    terminatorAnalysis,
    pattern,
    hypotheses,
  };
}

function renderFormationTable(sections: FormationSection[]): string[] {
  const lines: string[] = [];
  lines.push("| # | Formation | Seed | Raw cards | Δ | Status | Header src | Play strips (src#) | Terminator |");
  lines.push("|--:|-----------|-----:|----------:|--:|:-------|------------|--------------------|------------|");
  for (const s of sections) {
    const header = s.headerStrip ? String(s.headerStrip.sourceIndex) : "—";
    const plays = s.playStrips.map((p) => p.sourceIndex).join(",") || "—";
    const term = s.terminatingStrip
      ? `${s.terminatingStrip.sourceIndex}:${s.terminatingStrip.kind}(g=${s.terminatingStrip.wideGutterCount})`
      : "EOF";
    const flag =
      s.status === "under"
        ? "**UNDER**"
        : s.status === "over"
          ? "**OVER**"
          : s.status === "ok"
            ? "ok"
            : s.status;
    lines.push(
      `| ${s.formationIndex} | ${s.formationName} | ${s.expectedPlays} | ${s.rawCardRegions} | ${s.delta} | ${flag} | ${header} | ${plays} | ${term} |`,
    );
  }
  return lines;
}

function writeCaliforniaTrace(audit: PlaybookAudit): void {
  const lines: string[] = [];
  lines.push("# California Extraction Trace");
  lines.push("");
  lines.push(`Generated by \`diagnostics/extraction-audit.ts\` (shadow instrumentation).`);
  lines.push("");
  lines.push("## Document strip summary");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|------:|`);
  lines.push(`| word/media files | ${audit.mediaCount} |`);
  lines.push(`| document-order embeds | ${audit.embedCount} |`);
  lines.push(`| Classified formation-headers | ${audit.headerCount} |`);
  lines.push(`| Classified play-strips | ${audit.playStripCount} |`);
  lines.push(`| Reference formations | ${audit.reference.formations.length} |`);
  lines.push(`| Leftover strips after consume | ${audit.leftoverStrips.length} |`);
  lines.push("");

  lines.push("## Per-formation segmentation (mirrors extract-docx)");
  lines.push("");
  lines.push(...renderFormationTable(audit.sections));
  lines.push("");

  const focus = audit.focusDeepDive;
  if (focus) {
    lines.push(`## Focus: ${focus.formationName}`);
    lines.push("");
    lines.push(
      `- Seed expects: **${focus.section.expectedPlays}**`,
    );
    lines.push(
      `- Raw card regions between headers: **${focus.section.rawCardRegions}** ` +
        `(${focus.section.playStrips.length} play strips × 3)`,
    );
    lines.push(`- Delta: **${focus.section.delta}** (${focus.section.status})`);
    lines.push(
      `- Header strip: sourceIndex=${focus.section.headerStrip?.sourceIndex} ` +
        `rId=${focus.section.headerStrip?.rId} media=\`${focus.section.headerStrip?.mediaPath}\``,
    );
    lines.push("");
    lines.push("### Play strips captured for this formation");
    lines.push("");
    lines.push("| src# | rId | media | gutters | bytes |");
    lines.push("|-----:|-----|-------|--------:|------:|");
    for (const p of focus.section.playStrips) {
      lines.push(
        `| ${p.sourceIndex} | \`${p.rId}\` | \`${p.mediaPath}\` | ${p.wideGutterCount} | ${p.byteLength} |`,
      );
    }
    lines.push("");

    lines.push("### Terminator (strip that ended the section)");
    lines.push("");
    lines.push(focus.terminatorAnalysis);
    lines.push("");

    lines.push("### OCR play names on captured cards");
    lines.push("");
    for (let i = 0; i < focus.capturedOcrNames.length; i += 1) {
      lines.push(`${i + 1}. ${focus.capturedOcrNames[i]}`);
    }
    lines.push("");

    lines.push("### Operator-visible DOCX names (15)");
    lines.push("");
    for (let i = 0; i < focus.knownVisibleNames.length; i += 1) {
      const name = focus.knownVisibleNames[i];
      const hit = fuzzyIncludes(focus.capturedOcrNames, name);
      lines.push(`${i + 1}. ${name}${hit ? "" : " — **MISSING from captured OCR set**"}`);
    }
    lines.push("");

    lines.push("### Missing card names (known − captured OCR)");
    lines.push("");
    if (focus.missingKnownNames.length === 0) {
      lines.push("_Could not isolate by OCR (OCR may have failed or names differ). See terminator OCR._");
    } else {
      for (const n of focus.missingKnownNames) {
        lines.push(`- **${n}**`);
      }
    }
    lines.push("");

    if (focus.terminatorAsPlayStripOcr) {
      lines.push("### Forced OCR on terminator strip (treated as 3 play cards)");
      lines.push("");
      for (const row of focus.terminatorAsPlayStripOcr) {
        lines.push(
          `- card ${row.cardIndex}: play=\`${row.playName ?? "?"}\` formation=\`${row.formationText}\``,
        );
      }
      lines.push("");
      lines.push(
        "If these three names match the missing set, the terminator is a **misclassified play strip**.",
      );
      lines.push("");
    }

    lines.push("### Pattern");
    lines.push("");
    lines.push(focus.pattern);
    lines.push("");

    lines.push("### Hypothesis tests");
    lines.push("");
    for (const h of focus.hypotheses) {
      lines.push(`#### ${h.id}`);
      lines.push("");
      lines.push(`- **Verdict:** ${h.verdict}`);
      lines.push(`- **Evidence:** ${h.evidence}`);
      lines.push("");
    }
  }

  const out = join(REPORT_DIR, "california-extraction-trace.md");
  writeFileSync(out, lines.join("\n"), "utf8");
  console.log(`Wrote ${out}`);
}

function writeTeamAudit(audit: PlaybookAudit, filename: string): void {
  const lines: string[] = [];
  lines.push(`# ${audit.label} Extraction Audit`);
  lines.push("");
  lines.push("Per-formation raw card regions (3 × play-strip count between headers) vs seed.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|------:|`);
  lines.push(`| Embeds | ${audit.embedCount} |`);
  lines.push(`| Headers / play strips | ${audit.headerCount} / ${audit.playStripCount} |`);
  lines.push(`| Formations UNDER (raw < seed) | ${audit.underFormations.length} |`);
  lines.push(`| Formations OVER (raw > seed) | ${audit.overFormations.length} |`);
  lines.push(`| Total cards missing vs seed (under) | ${audit.totalUnderCards} |`);
  lines.push(
    `| Total cards silently dropped as trailing extras (over) | ${audit.totalOverCards} |`,
  );
  lines.push(`| Leftover strips | ${audit.leftoverStrips.length} |`);
  lines.push("");

  if (audit.underFormations.length > 0) {
    lines.push("## UNDER — fail-closed misses (would throw in extract-docx)");
    lines.push("");
    for (const s of audit.underFormations) {
      lines.push(
        `- **${s.formationName}**: seed ${s.expectedPlays}, raw ${s.rawCardRegions} (Δ ${s.delta})`,
      );
    }
    lines.push("");
  }

  if (audit.overFormations.length > 0) {
    lines.push("## OVER — silent trailing drops in production");
    lines.push("");
    lines.push(
      "When `rawCards > expected`, `selectPlayCardsForFormation` removes name-band duplicates " +
        "then **pops trailing card regions**. Those popped cards never publish.",
    );
    lines.push("");
    for (const s of audit.overFormations) {
      lines.push(
        `- **${s.formationName}**: seed ${s.expectedPlays}, raw ${s.rawCardRegions} ` +
          `(**${s.delta} silent drop(s)**) — play strips src# ${s.playStrips.map((p) => p.sourceIndex).join(",")}`,
      );
    }
    lines.push("");
  } else {
    lines.push("## OVER — silent trailing drops");
    lines.push("");
    lines.push("None — no formation had more raw card regions than the seed.");
    lines.push("");
  }

  lines.push("## Full table");
  lines.push("");
  lines.push(...renderFormationTable(audit.sections));
  lines.push("");

  if (audit.leftoverStrips.length > 0) {
    lines.push("## Leftover strips after reference consume");
    lines.push("");
    for (const s of audit.leftoverStrips.slice(0, 40)) {
      lines.push(
        `- src#${s.sourceIndex} ${s.kind} g=${s.wideGutterCount} \`${s.mediaPath}\``,
      );
    }
    lines.push("");
  }

  const out = join(REPORT_DIR, filename);
  writeFileSync(out, lines.join("\n"), "utf8");
  console.log(`Wrote ${out}`);
}

function writeSummary(audits: PlaybookAudit[]): void {
  const lines: string[] = [];
  lines.push("# Extraction Audit Summary");
  lines.push("");
  lines.push("| Playbook | Formations with under-count | Cards missing (under) | Formations with over-count | Cards silently dropped (over) | Formations affected |");
  lines.push("|----------|----------------------------:|----------------------:|---------------------------:|------------------------------:|---------------------|");

  for (const a of audits) {
    const affected = [
      ...a.underFormations.map((s) => `${s.formationName} (under ${-s.delta})`),
      ...a.overFormations.map((s) => `${s.formationName} (over ${s.delta})`),
    ];
    lines.push(
      `| ${a.label} | ${a.underFormations.length} | ${a.totalUnderCards} | ${a.overFormations.length} | ${a.totalOverCards} | ${affected.join("; ") || "—"} |`,
    );
  }
  lines.push("");

  const cal = audits.find((a) => a.key === "california");
  if (cal?.focusDeepDive) {
    const f = cal.focusDeepDive;
    lines.push("## California Singleback Bunch X Nasty");
    lines.push("");
    lines.push(
      `- Seed 15 / raw extracted card regions ${f.section.rawCardRegions} / missing ${-f.section.delta}`,
    );
    lines.push(
      `- Missing known names: ${f.missingKnownNames.length ? f.missingKnownNames.join(", ") : "(see trace OCR)"}`,
    );
    if (f.terminatorAsPlayStripOcr) {
      lines.push(
        `- Terminator forced-OCR: ${f.terminatorAsPlayStripOcr.map((r) => r.playName ?? "?").join(", ")}`,
      );
    }
    lines.push(`- Pattern: ${f.pattern}`);
    lines.push("");
  }

  lines.push("## Root cause (working)");
  lines.push("");
  lines.push(
    "Production segmentation (`extract-docx.ts`) walks document-ordered strips classified by " +
      "**wide black gutter geometry** (`exactly 2` gutters ≥70px → play-strip; else formation-header). " +
      "Each reference formation consumes one header + following play-strips until the next header. " +
      "If a play strip is classified as a header mid-section, the formation ends early → under-count → fail closed. " +
      "If a section has extra play strips (or a header misclassified as play-strip feeding prior section), " +
      "extras are **silently** reduced via name-band dup removal then trailing `pop()`.",
  );
  lines.push("");

  const anyOver = audits.some((a) => a.totalOverCards > 0);
  const anyUnder = audits.some((a) => a.totalUnderCards > 0);
  lines.push("## Re-ingestion after fix?");
  lines.push("");
  for (const a of audits) {
    if (a.key === "california") {
      lines.push(
        `- **California:** blocked until fix; must re-run ingest after classification/segmentation fix.`,
      );
    } else if (a.totalOverCards > 0) {
      lines.push(
        `- **${a.label}:** YES — ${a.overFormations.length} formation(s) had silent trailing drops ` +
          `(${a.totalOverCards} card regions). Trusted hashes may omit those crops; re-ingest after fix.`,
      );
    } else if (a.totalUnderCards > 0) {
      lines.push(
        `- **${a.label}:** Has under-counts (would fail extract) — data not ingestible as-is.`,
      );
    } else {
      lines.push(
        `- **${a.label}:** No under/over vs seed on this audit — re-ingest not required for count alignment ` +
          `(still re-run if classification fix changes strip boundaries).`,
      );
    }
  }
  lines.push("");

  lines.push("## Fix scope recommendation");
  lines.push("");
  if (cal?.focusDeepDive?.hypotheses.some((h) => h.verdict.includes("CONFIRMED"))) {
    lines.push(
      "**Category 2 — Moderate refactor** (leaning Category 1 if only gutter thresholds need tuning).",
    );
    lines.push("");
    lines.push(
      "Primary lever: formation-header vs play-strip classification (gutter geometry) and/or " +
        "section boundary confirmation (e.g. OCR formation label on suspected headers before terminating). " +
        "Avoid filename-order changes (already correct). Dedup/trailing pop should stay fail-closed for under-counts " +
        "and become more conservative for over-counts (log + require explicit drop reasons).",
    );
  } else {
    lines.push(
      "**Category 2 — Moderate refactor** pending confirmation from California terminator OCR evidence in the trace report.",
    );
  }
  lines.push("");
  lines.push(`_anyUnder=${anyUnder} anyOver=${anyOver}_`);
  lines.push("");

  const out = join(REPORT_DIR, "extraction-audit-summary.md");
  writeFileSync(out, lines.join("\n"), "utf8");
  console.log(`Wrote ${out}`);
}

async function main(): Promise<void> {
  mkdirSync(REPORT_DIR, { recursive: true });
  const filter = parsePlaybookFilter(process.argv.slice(2));
  const keys: PlaybookKey[] = filter ?? ["california", "air-force", "usc"];

  const audits: PlaybookAudit[] = [];
  for (const key of keys) {
    const audit = await auditPlaybook(key);
    audits.push(audit);
    if (key === "california") writeCaliforniaTrace(audit);
    if (key === "air-force") writeTeamAudit(audit, "air-force-extraction-audit.md");
    if (key === "usc") writeTeamAudit(audit, "usc-extraction-audit.md");
  }

  if (keys.length > 1 || keys[0] === "california") {
    // Always refresh summary for whatever we ran
    writeSummary(audits);
  } else {
    writeSummary(audits);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
