#!/usr/bin/env node
/**
 * Diff crop→formation assignments: current manifest vs fresh section-OCR extraction.
 *
 * Usage (from sideline/):
 *   npx tsx scripts/play-art/diagnostics/diff-formation-assignments.ts \
 *     --playbook=air-force
 *
 * Does not overwrite published state — report only.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { extractPlayArtDocx } from "../extract-docx";
import { mapPlayArtPositionally } from "../map-positional";
import { loadPlayArtReference } from "../reference";
import type { PlayArtManifestRecord } from "../types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SIDELINE_ROOT = join(__dirname, "..", "..", "..");
const MANIFEST_PATH = join(SIDELINE_ROOT, "lib", "generated", "play-art-manifest.json");
const REPORTS_DIR = join(__dirname, "reports");

type PlaybookKey = "air-force" | "usc" | "california";

const CONFIG: Record<
  PlaybookKey,
  { manifestName: string; reference: string; defaultSource: string }
> = {
  "air-force": {
    manifestName: "Air Force",
    reference: "scripts/play-art/references/cfb27-offense-air-force.json",
    defaultSource: "scripts/play-art/source/Option & Spread Option/Air Force.docx",
  },
  usc: {
    manifestName: "USC",
    reference: "scripts/play-art/references/cfb27-offense-usc.json",
    defaultSource: "scripts/play-art/source/Air Raid/cfb27-offense-USC.docx",
  },
  california: {
    manifestName: "California",
    reference: "scripts/play-art/references/cfb27-offense-california.json",
    defaultSource: "scripts/play-art/source/Multiple & Pro Style/California.docx",
  },
};

function readFlag(argv: string[], name: string): string | undefined {
  const eq = `${name}=`;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === name && argv[i + 1]) return argv[i + 1];
    if (argv[i].startsWith(eq)) return argv[i].slice(eq.length);
  }
  return undefined;
}

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const playbookKey = (readFlag(argv, "--playbook") ?? "air-force").toLowerCase() as PlaybookKey;
  const cfg = CONFIG[playbookKey];
  if (!cfg) {
    console.error(`Unknown --playbook (air-force | usc | california)`);
    process.exit(1);
  }

  const sourcePath = readFlag(argv, "--source") ?? cfg.defaultSource;
  const refPath = existsSync(cfg.reference) ? cfg.reference : join(process.cwd(), cfg.reference);
  const srcPath = existsSync(sourcePath) ? sourcePath : join(process.cwd(), sourcePath);
  const reference = loadPlayArtReference(refPath);

  console.log(`Formation assignment diff — ${cfg.manifestName}`);
  const extracted = await extractPlayArtDocx(srcPath, reference);
  const mapped = mapPlayArtPositionally(
    extracted.effectiveReference ?? reference,
    extracted,
  ).mapped;

  const newByHash = new Map<string, string>();
  for (const m of mapped) {
    const buf = extracted.mediaFiles.get(m.mediaPath);
    if (!buf) continue;
    newByHash.set(sha256(buf).toLowerCase(), m.formation);
  }

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as {
    entries: PlayArtManifestRecord[];
  };
  const oldEntries = manifest.entries.filter((e) => e.playbook.trim() === cfg.manifestName);

  type DiffRow = {
    cropSha256: string;
    oldFormation: string | null;
    newFormation: string | null;
  };
  const diffs: DiffRow[] = [];
  const seen = new Set<string>();

  for (const entry of oldEntries) {
    const hash = entry.asset_id.toLowerCase();
    seen.add(hash);
    const neu = newByHash.get(hash) ?? null;
    if (neu !== entry.formation) {
      diffs.push({
        cropSha256: entry.asset_id,
        oldFormation: entry.formation,
        newFormation: neu,
      });
    }
  }

  for (const [hash, formation] of newByHash) {
    if (seen.has(hash)) continue;
    // New crop not in prior manifest — only relevant if playbook was previously ingested
    if (oldEntries.length > 0) {
      diffs.push({
        cropSha256: hash,
        oldFormation: null,
        newFormation: formation,
      });
    }
  }

  mkdirSync(REPORTS_DIR, { recursive: true });
  const reportPath = join(REPORTS_DIR, `${playbookKey}-formation-assignment-diff.md`);
  const lines: string[] = [];
  lines.push(`# ${cfg.manifestName} Formation Assignment Diff`);
  lines.push("");
  lines.push(`- Prior manifest entries: ${oldEntries.length}`);
  lines.push(`- New extraction mappings: ${newByHash.size}`);
  lines.push(`- Differences: ${diffs.length}`);
  lines.push(
    `- Section OCR: ${extracted.structure.formationOcr?.sectionExactMatches ?? "?"} exact / ` +
      `${extracted.structure.formationOcr?.sectionFuzzyMatches ?? "?"} fuzzy`,
  );
  lines.push("");

  if (diffs.length === 0) {
    lines.push("Identical crop→formation assignments (idempotent).");
    console.log("Identical — no differences.");
  } else {
    lines.push("| cropSha256 (prefix) | Old formation | New formation |");
    lines.push("|---------------------|---------------|---------------|");
    const byFormation = new Map<string, number>();
    for (const d of diffs) {
      const key = `${d.oldFormation ?? "∅"} → ${d.newFormation ?? "∅"}`;
      byFormation.set(key, (byFormation.get(key) ?? 0) + 1);
      lines.push(
        `| \`${d.cropSha256.slice(0, 12)}…\` | ${d.oldFormation ?? "—"} | ${d.newFormation ?? "—"} |`,
      );
    }
    lines.push("");
    lines.push("## Per transition");
    lines.push("");
    for (const [k, n] of [...byFormation.entries()].sort((a, b) => b[1] - a[1])) {
      lines.push(`- ${k}: ${n}`);
    }
    console.log(`Differences: ${diffs.length} — do NOT overwrite published state automatically.`);
  }

  writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`Report: ${reportPath}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
