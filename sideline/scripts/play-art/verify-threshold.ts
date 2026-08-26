#!/usr/bin/env node
/**
 * Re-verify ingested playbooks against the length-aware fuzzy OCR threshold.
 *
 * Re-runs section-header OCR only (skips crop validation + matcher). Compares
 * new section→formation assignments to the prior ingest's assigned formations.
 * Does NOT re-ingest or touch trusted hashes.
 *
 * Usage (from sideline/):
 *   npm run play-art:verify-threshold
 *   npm run play-art:verify-threshold -- --slug=air-force
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { extractPlayArtDocx } from "./extract-docx";
import { resolveSeedSlugFromArgs } from "./build-reference";
import { seedSlugToReferencePath } from "./lib/slug-utils";
import { loadPlayArtReference, referencesDir } from "./reference";
import {
  discoverAndResolveSources,
  discoverSourceDocxFiles,
  SOURCE_ROOT,
} from "./source-discovery";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = join(__dirname, "reports");

type PriorFormationOrder = string[];

function readFlag(argv: string[], name: string): string | undefined {
  const eqPrefix = `${name}=`;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === name && argv[i + 1] && !argv[i + 1].startsWith("-")) return argv[i + 1];
    if (arg.startsWith(eqPrefix)) return arg.slice(eqPrefix.length);
  }
  return undefined;
}

function teamSlugFromMatchingReport(fileName: string): string | null {
  const m = /^cfb27-offense-(.+)-matching\.json$/i.exec(fileName);
  return m ? m[1] : null;
}

/** Formation set from prior crop OCR assignment file (seed-order emit; use as a set). */
function priorFormationSetFromOcrFile(ocrPath: string): Set<string> | null {
  if (!existsSync(ocrPath)) return null;
  const raw = JSON.parse(readFileSync(ocrPath, "utf8")) as {
    assignments?: Array<{ assignedFormation: string }>;
  };
  if (!raw.assignments?.length) return null;
  return new Set(raw.assignments.map((a) => a.assignedFormation));
}

function findSourceForSlug(teamSlug: string): string | null {
  const seedSlug = `cfb27-${teamSlug}`;
  const discoveries = discoverAndResolveSources();
  const hit = discoveries.find(
    (d) =>
      d.resolvedSeed === seedSlug ||
      (d.basename && d.basename.toLowerCase().replace(/\s+/g, "-") === teamSlug),
  );
  if (hit) {
    const abs = join(SOURCE_ROOT, hit.sourcePath);
    if (existsSync(abs)) return abs;
    // sourcePath may already be absolute-ish
    if (existsSync(hit.sourcePath)) return hit.sourcePath;
  }

  // Fallback: walk DOCXs and match slug from basename
  for (const abs of discoverSourceDocxFiles()) {
    const base = basename(abs).replace(/\.docx$/i, "");
    const structured = base.match(/^cfb\d+-(offense|defense)-(.+)$/i);
    const stem = structured ? structured[2].replace(/-/g, " ") : base;
    const asSlug = stem.toLowerCase().replace(/\s+&\s+/g, " and ").replace(/&/g, "").replace(/\s+/g, "-");
    if (asSlug === teamSlug || base.toLowerCase() === teamSlug) return abs;
  }
  return null;
}

type VerifyRow = {
  slug: string;
  status: "safe" | "at_risk" | "error";
  detail: string;
};

async function verifyOne(teamSlug: string): Promise<VerifyRow> {
  const ocrPath = join(REPORTS_DIR, `cfb27-offense-${teamSlug}-formation-ocr-assignments.json`);
  const priorSet = priorFormationSetFromOcrFile(ocrPath);

  const sourcePath = findSourceForSlug(teamSlug);
  if (!sourcePath) {
    return {
      slug: teamSlug,
      status: "error",
      detail: "Could not locate source DOCX for slug",
    };
  }

  let referencePath: string;
  try {
    const resolved = resolveSeedSlugFromArgs(["--source", sourcePath]);
    referencePath = seedSlugToReferencePath(resolved.seedSlug, referencesDir());
  } catch (err) {
    return {
      slug: teamSlug,
      status: "error",
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  if (!existsSync(referencePath)) {
    return {
      slug: teamSlug,
      status: "error",
      detail: `Reference missing: ${referencePath}`,
    };
  }

  const reference = loadPlayArtReference(referencePath);

  try {
    const extracted = await extractPlayArtDocx(sourcePath, reference, {
      skipFormationOcr: true, // skip crop validation; section OCR still runs
    });
    const sections = extracted.sectionOcrAssignments ?? [];
    const nextSet = new Set(sections.map((s) => s.matchedFormation));

    if (!priorSet) {
      return {
        slug: teamSlug,
        status: "safe",
        detail: `Section OCR succeeded (${sections.length} sections); no prior OCR file to diff`,
      };
    }

    const missing = [...priorSet].filter((f) => !nextSet.has(f)).sort();
    const added = [...nextSet].filter((f) => !priorSet.has(f)).sort();

    if (missing.length === 0 && added.length === 0) {
      return {
        slug: teamSlug,
        status: "safe",
        detail: `Section OCR succeeded; formation set unchanged (${nextSet.size} formations)`,
      };
    }

    const parts: string[] = [];
    if (missing.length > 0) parts.push(`no longer matched: ${missing.join(", ")}`);
    if (added.length > 0) parts.push(`newly matched: ${added.join(", ")}`);
    return {
      slug: teamSlug,
      status: "at_risk",
      detail: `Formation set changed — ${parts.join("; ")}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const firstLine = message.split("\n")[0]?.replace(/^Error:\s*/i, "") ?? message;
    return {
      slug: teamSlug,
      status: "at_risk",
      detail: `Section OCR would now fail: ${firstLine}`,
    };
  }
}

function renderMarkdown(rows: VerifyRow[], stamp: string): string {
  const safe = rows.filter((r) => r.status === "safe");
  const atRisk = rows.filter((r) => r.status === "at_risk");
  const errors = rows.filter((r) => r.status === "error");
  const lines: string[] = [];
  lines.push("# Threshold Verification Report");
  lines.push("");
  lines.push(`Generated: ${stamp}`);
  lines.push("");
  lines.push("## Summary");
  lines.push(`- Playbooks verified: ${rows.length}`);
  lines.push(`- Playbooks safe: ${safe.length}`);
  lines.push(`- Playbooks at risk: ${atRisk.length}`);
  if (errors.length > 0) lines.push(`- Lookup errors: ${errors.length}`);
  lines.push("");
  lines.push("## Safe (no changes needed)");
  if (safe.length === 0) lines.push("- (none)");
  for (const r of safe) lines.push(`- ${r.slug}`);
  lines.push("");
  lines.push("## At Risk (may have silent misassignments)");
  if (atRisk.length === 0) {
    lines.push("- (none)");
  } else {
    for (const r of atRisk) {
      lines.push(`- **${r.slug}**: ${r.detail}`);
      lines.push(`  - Recommended action: manual review or re-ingest (do not auto-overwrite trusted hashes)`);
    }
  }
  if (errors.length > 0) {
    lines.push("");
    lines.push("## Errors (could not verify)");
    for (const r of errors) lines.push(`- **${r.slug}**: ${r.detail}`);
  }
  lines.push("");
  lines.push("## Notes");
  lines.push(
    "- At-risk playbooks: existing trusted mappings may be wrong. Do not re-ingest automatically.",
  );
  lines.push("- Operator should review each at-risk playbook individually.");
  lines.push(
    "- Threshold rules: distance ≤ max(4, ⌊seedLen×0.25⌋); OCR length ≥ max(4, ⌊seedLen×0.5⌋); unique within threshold; reject personnel-suffix ambiguity; reject proper-prefix extensions.",
  );
  lines.push("");
  return lines.join("\n");
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const onlySlug = readFlag(argv, "--slug")?.trim().toLowerCase();

  mkdirSync(REPORTS_DIR, { recursive: true });
  const matchingFiles = readdirSync(REPORTS_DIR)
    .map((f) => teamSlugFromMatchingReport(f))
    .filter((s): s is string => Boolean(s))
    .sort();

  const slugs = onlySlug ? matchingFiles.filter((s) => s === onlySlug) : matchingFiles;
  if (slugs.length === 0) {
    console.error(onlySlug ? `No matching report for slug ${onlySlug}` : "No matching reports found");
    process.exit(1);
  }

  console.log(`Verifying ${slugs.length} ingested playbook(s) against length-aware fuzzy threshold…`);
  const rows: VerifyRow[] = [];
  for (const slug of slugs) {
    process.stdout.write(`  ${slug}… `);
    const row = await verifyOne(slug);
    rows.push(row);
    console.log(row.status.toUpperCase());
    if (row.status !== "safe") console.log(`    ${row.detail.slice(0, 200)}`);
  }

  const stamp = new Date().toISOString();
  const stampFile = stamp.replace(/[:.]/g, "-").replace(/Z$/, "Z");
  const outPath = join(REPORTS_DIR, `threshold-verification-${stampFile}.md`);
  const md = renderMarkdown(rows, stamp);
  writeFileSync(outPath, md, "utf8");
  console.log("");
  console.log(md);
  console.log(`Wrote ${outPath}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
