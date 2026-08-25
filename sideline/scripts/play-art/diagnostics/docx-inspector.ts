/**
 * Deep DOCX structure inspection (ZIP / media / relationship / document order).
 *
 * Does not modify extraction. Pure structure report for diagnosing dropped crops.
 *
 *   npx tsx scripts/play-art/diagnostics/docx-inspector.ts \
 *     --source="scripts/play-art/source/Multiple & Pro Style/California.docx" \
 *     --out="scripts/play-art/diagnostics/reports/california-docx-structure.md"
 */
import JSZip from "jszip";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DOCUMENT_EMBED_ATTR_RE = /\br:embed="([^"]+)"/g;

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

function parseArgs(argv: string[]): { source: string; out: string } {
  let source = "";
  let out = "scripts/play-art/diagnostics/reports/california-docx-structure.md";
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--source=")) source = arg.slice("--source=".length);
    else if (arg === "--source" && argv[i + 1]) source = argv[++i];
    else if (arg.startsWith("--out=")) out = arg.slice("--out=".length);
    else if (arg === "--out" && argv[i + 1]) out = argv[++i];
  }
  if (!source) {
    throw new Error("Required: --source=<docx path>");
  }
  return { source: resolve(source), out: resolve(out) };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const zip = await JSZip.loadAsync(readFileSync(args.source));

  const mediaPaths = Object.keys(zip.files)
    .filter((p) => p.startsWith("word/media/") && !p.endsWith("/"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const documentFile = zip.file("word/document.xml");
  const relsFile = zip.file("word/_rels/document.xml.rels");
  if (!documentFile || !relsFile) {
    throw new Error("Missing word/document.xml or word/_rels/document.xml.rels");
  }

  const documentXml = await documentFile.async("string");
  const relsXml = await relsFile.async("string");
  const embedTargets = resolveEmbedTargets(relsXml);
  const orderedEmbeds = orderedImageEmbedIds(documentXml);

  const imageRels = [...embedTargets.entries()].filter(([, target]) =>
    target.startsWith("word/media/"),
  );

  const resolved: Array<{
    docOrder: number;
    rId: string;
    mediaPath: string;
    inMediaFolder: boolean;
  }> = [];
  const missingTargets: string[] = [];
  const seenMedia = new Set<string>();

  for (let i = 0; i < orderedEmbeds.length; i += 1) {
    const rId = orderedEmbeds[i];
    const mediaPath = embedTargets.get(rId) ?? "(unresolved)";
    const inMediaFolder = mediaPath !== "(unresolved)" && zip.file(mediaPath) != null;
    if (!inMediaFolder) missingTargets.push(`${rId} → ${mediaPath}`);
    if (mediaPath !== "(unresolved)") seenMedia.add(mediaPath);
    resolved.push({ docOrder: i, rId, mediaPath, inMediaFolder });
  }

  const orphanMedia = mediaPaths.filter((p) => !seenMedia.has(p));

  const filenameSorted = [...mediaPaths];
  const relationshipOrder = resolved.map((r) => r.mediaPath);
  let firstFilenameOrderMismatch = -1;
  for (let i = 0; i < Math.min(filenameSorted.length, relationshipOrder.length); i += 1) {
    if (filenameSorted[i] !== relationshipOrder[i]) {
      firstFilenameOrderMismatch = i;
      break;
    }
  }

  const lines: string[] = [];
  lines.push("# California DOCX Structure");
  lines.push("");
  lines.push(`Source: \`${args.source}\``);
  lines.push("");
  lines.push("## Counts");
  lines.push("");
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|------:|`);
  lines.push(`| Files under \`word/media/\` | ${mediaPaths.length} |`);
  lines.push(`| Image relationships in \`document.xml.rels\` | ${imageRels.length} |`);
  lines.push(`| Image embeds (\`r:embed\`) in \`document.xml\` (document order) | ${orderedEmbeds.length} |`);
  lines.push(`| Unresolved / missing media targets | ${missingTargets.length} |`);
  lines.push(`| Orphan media (in folder, never referenced in document order) | ${orphanMedia.length} |`);
  lines.push("");

  const discrepancy =
    mediaPaths.length !== orderedEmbeds.length ||
    missingTargets.length > 0 ||
    orphanMedia.length > 0;
  lines.push("## Discrepancy?");
  lines.push("");
  if (!discrepancy) {
    lines.push(
      `No — media file count (${mediaPaths.length}) matches document-order embed count (${orderedEmbeds.length}).`,
    );
  } else {
    lines.push(
      `Yes — media=${mediaPaths.length}, document embeds=${orderedEmbeds.length}, ` +
        `missing=${missingTargets.length}, orphans=${orphanMedia.length}.`,
    );
  }
  lines.push("");

  lines.push("## Filename sort vs document (relationship) order");
  lines.push("");
  if (firstFilenameOrderMismatch < 0) {
    lines.push(
      "Filename-sorted `word/media/` order matches document embed order for the compared prefix " +
        "(unlikely for large docs; verify if counts differ).",
    );
  } else {
    lines.push(
      `First mismatch at index **${firstFilenameOrderMismatch}**: ` +
        `filename-sort=\`${filenameSorted[firstFilenameOrderMismatch]}\` vs ` +
        `document-order=\`${relationshipOrder[firstFilenameOrderMismatch]}\`.`,
    );
    lines.push("");
    lines.push(
      "Extraction must use document/`r:embed` order (via rels), **not** filename sort — " +
        "production `extract-docx.ts` already walks `orderedImageEmbedIds(documentXml)`.",
    );
  }
  lines.push("");

  lines.push("## First 20 document-order image references");
  lines.push("");
  lines.push("| # | rId | Resolved media path | Present |");
  lines.push("|--:|-----|---------------------|:-------:|");
  for (const row of resolved.slice(0, 20)) {
    lines.push(
      `| ${row.docOrder} | \`${row.rId}\` | \`${row.mediaPath}\` | ${row.inMediaFolder ? "yes" : "NO"} |`,
    );
  }
  lines.push("");

  if (orphanMedia.length > 0) {
    lines.push("## Orphan media (sample)");
    lines.push("");
    for (const p of orphanMedia.slice(0, 30)) {
      lines.push(`- \`${p}\``);
    }
    if (orphanMedia.length > 30) {
      lines.push(`- … +${orphanMedia.length - 30} more`);
    }
    lines.push("");
  }

  if (missingTargets.length > 0) {
    lines.push("## Missing targets");
    lines.push("");
    for (const m of missingTargets.slice(0, 30)) {
      lines.push(`- ${m}`);
    }
    lines.push("");
  }

  lines.push("## Interpretation");
  lines.push("");
  lines.push(
    "If media count and document embeds agree, the DOCX export still contains the images — " +
      "any California under-count is downstream in strip classification / section segmentation, not a lost ZIP entry.",
  );
  lines.push("");

  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(args.out, lines.join("\n"), "utf8");
  console.log(`Wrote ${args.out}`);
  console.log(
    `media=${mediaPaths.length} embeds=${orderedEmbeds.length} orphans=${orphanMedia.length} missing=${missingTargets.length}`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
