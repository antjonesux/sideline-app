#!/usr/bin/env node
/**
 * Reconcile trusted hash store against a fresh OCR-section extraction.
 *
 * Usage (from sideline/):
 *   npx tsx scripts/play-art/diagnostics/reconcile-trusted-hashes.ts --playbook=usc
 *   npx tsx scripts/play-art/diagnostics/reconcile-trusted-hashes.ts --playbook=usc --apply
 *
 * Without --apply: writes report + archive preview only (no manifest mutation).
 * With --apply: archives invalidated entries and removes them from the active manifest.
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
const ARCHIVE_DIR = join(__dirname, "..", "trusted-hashes-invalidated");

type PlaybookKey = "usc" | "air-force";

const PLAYBOOK_CONFIG: Record<
  PlaybookKey,
  { manifestName: string; reference: string; defaultSource: string }
> = {
  usc: {
    manifestName: "USC",
    reference: "scripts/play-art/references/cfb27-offense-usc.json",
    defaultSource: "scripts/play-art/source/Air Raid/cfb27-offense-USC.docx",
  },
  "air-force": {
    manifestName: "Air Force",
    reference: "scripts/play-art/references/cfb27-offense-air-force.json",
    defaultSource: "scripts/play-art/source/Option & Spread Option/Air Force.docx",
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

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name);
}

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

type NewCrop = {
  cropSha256: string;
  formation: string;
  mediaPath: string;
};

type Invalidated = {
  cropSha256: string;
  trustedFormation: string;
  trustedPlay: string;
  newFormation: string | null;
  kind: "formation_mismatch" | "extraction_inconsistency";
};

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const playbookKey = (readFlag(argv, "--playbook") ?? "usc").toLowerCase() as PlaybookKey;
  const cfg = PLAYBOOK_CONFIG[playbookKey];
  if (!cfg) {
    console.error(`Unknown --playbook=${playbookKey} (use usc | air-force)`);
    process.exit(1);
  }

  const sourcePath = readFlag(argv, "--source") ?? cfg.defaultSource;
  const apply = hasFlag(argv, "--apply");
  const dryRun = !apply;

  const refPath = existsSync(cfg.reference) ? cfg.reference : join(process.cwd(), cfg.reference);
  const srcPath = existsSync(sourcePath) ? sourcePath : join(process.cwd(), sourcePath);
  const ref = loadPlayArtReference(refPath);

  console.log(`Reconciling trusted hashes — ${cfg.manifestName}`);
  console.log(`  Reference: ${refPath}`);
  console.log(`  Source: ${srcPath}`);
  console.log(
    `  Mode: ${dryRun ? "report-only (pass --apply to archive + update manifest)" : "APPLY"}`,
  );

  const extracted = await extractPlayArtDocx(srcPath, ref);
  const positional = mapPlayArtPositionally(extracted.effectiveReference ?? ref, extracted);

  const newCrops: NewCrop[] = [];
  const byHash = new Map<string, NewCrop>();
  for (const mapped of positional.mapped) {
    const buf = extracted.mediaFiles.get(mapped.mediaPath);
    if (!buf) continue;
    const cropSha256 = sha256(buf);
    const row: NewCrop = {
      cropSha256,
      formation: mapped.formation,
      mediaPath: mapped.mediaPath,
    };
    newCrops.push(row);
    byHash.set(cropSha256.toLowerCase(), row);
  }

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as {
    entries: PlayArtManifestRecord[];
  };
  const trusted = manifest.entries.filter((e) => e.playbook.trim() === cfg.manifestName);

  const confirmed: PlayArtManifestRecord[] = [];
  const invalidated: Invalidated[] = [];
  const invalidatedRecords: PlayArtManifestRecord[] = [];

  for (const entry of trusted) {
    const hash = entry.asset_id.toLowerCase();
    const neu = byHash.get(hash);
    if (!neu) {
      invalidated.push({
        cropSha256: entry.asset_id,
        trustedFormation: entry.formation,
        trustedPlay: entry.play_name,
        newFormation: null,
        kind: "extraction_inconsistency",
      });
      invalidatedRecords.push(entry);
      continue;
    }
    if (neu.formation.trim().toLowerCase() !== entry.formation.trim().toLowerCase()) {
      invalidated.push({
        cropSha256: entry.asset_id,
        trustedFormation: entry.formation,
        trustedPlay: entry.play_name,
        newFormation: neu.formation,
        kind: "formation_mismatch",
      });
      invalidatedRecords.push(entry);
      continue;
    }
    confirmed.push(entry);
  }

  const confirmedByFormation = new Map<string, number>();
  for (const c of confirmed) {
    confirmedByFormation.set(c.formation, (confirmedByFormation.get(c.formation) ?? 0) + 1);
  }
  const invalidatedByFormation = new Map<string, number>();
  for (const row of invalidated) {
    invalidatedByFormation.set(
      row.trustedFormation,
      (invalidatedByFormation.get(row.trustedFormation) ?? 0) + 1,
    );
  }

  const total = trusted.length;
  const confirmedPct = total === 0 ? 0 : (100 * confirmed.length) / total;
  const invalidatedPct = total === 0 ? 0 : (100 * invalidated.length) / total;
  const inconsistencies = invalidated.filter((i) => i.kind === "extraction_inconsistency").length;

  mkdirSync(REPORTS_DIR, { recursive: true });
  const reportName =
    playbookKey === "usc"
      ? "usc-trusted-hash-reconciliation.md"
      : "air-force-trusted-hash-reconciliation.md";
  const reportPath = join(REPORTS_DIR, reportName);

  const lines: string[] = [];
  lines.push(`# ${cfg.manifestName} Trusted Hash Reconciliation Report`);
  lines.push("");
  lines.push("## Summary");
  lines.push(`- Total trusted mappings: ${total}`);
  lines.push(`- Confirmed: ${confirmed.length} (${confirmedPct.toFixed(1)}%)`);
  lines.push(`- Invalidated: ${invalidated.length} (${invalidatedPct.toFixed(1)}%)`);
  lines.push(`- Extraction inconsistencies: ${inconsistencies}`);
  lines.push(`- New extraction crop mappings: ${newCrops.length}`);
  lines.push(
    `- Section OCR: ${extracted.structure.formationOcr?.sectionExactMatches ?? "?"} exact / ` +
      `${extracted.structure.formationOcr?.sectionFuzzyMatches ?? "?"} fuzzy`,
  );
  lines.push("");
  lines.push("## Confirmed Mappings");
  lines.push("");
  lines.push("| Formation | Count |");
  lines.push("|-----------|------:|");
  for (const [formation, count] of [...confirmedByFormation.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    lines.push(`| ${formation} | ${count} |`);
  }
  lines.push("");
  lines.push("## Invalidated Mappings");
  lines.push("");
  lines.push("| Formation (trusted) | Count |");
  lines.push("|---------------------|------:|");
  for (const [formation, count] of [...invalidatedByFormation.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )) {
    lines.push(`| ${formation} | ${count} |`);
  }
  lines.push("");
  lines.push("### Full invalidation list");
  lines.push("");
  for (const row of invalidated) {
    const prefix = row.cropSha256.slice(0, 12);
    lines.push(`- cropSha256 \`${prefix}…\``);
    lines.push(`  - Trusted as: ${row.trustedFormation} / ${row.trustedPlay}`);
    lines.push(`  - Actually in: ${row.newFormation ?? "(not present in new extraction)"}`);
    lines.push(`  - Kind: ${row.kind}`);
    lines.push(
      `  - Recommended action: re-review this crop against new formation's candidates`,
    );
    lines.push("");
  }

  writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`Report: ${reportPath}`);
  console.log(
    `Confirmed ${confirmed.length} / invalidated ${invalidated.length} / inconsistencies ${inconsistencies}`,
  );

  if (invalidated.length === 0) {
    console.log("No invalidations — trusted store unchanged.");
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const archivePath = join(ARCHIVE_DIR, `${playbookKey}-${stamp}.json`);
  mkdirSync(ARCHIVE_DIR, { recursive: true });
  const archivePayload = {
    playbook: cfg.manifestName,
    createdAt: new Date().toISOString(),
    reason: "section-ocr-reconciliation",
    invalidatedCount: invalidatedRecords.length,
    entries: invalidatedRecords,
    details: invalidated,
  };

  if (dryRun) {
    const previewPath = join(ARCHIVE_DIR, `${playbookKey}-${stamp}.preview.json`);
    writeFileSync(previewPath, `${JSON.stringify(archivePayload, null, 2)}\n`, "utf8");
    console.log(
      `${invalidated.length} ${cfg.manifestName} trusted hashes would be invalidated. ` +
        `Re-run with --apply to archive and remove from manifest. ` +
        `Re-review required via \`npm run play-art:review -- --playbook=${playbookKey}\`.`,
    );
    console.log(`Preview archive: ${previewPath}`);
    return;
  }

  writeFileSync(archivePath, `${JSON.stringify(archivePayload, null, 2)}\n`, "utf8");
  const invalidatedIds = new Set(invalidatedRecords.map((e) => e.asset_id.toLowerCase()));
  const nextEntries = manifest.entries.filter((e) => {
    if (e.playbook.trim() !== cfg.manifestName) return true;
    return !invalidatedIds.has(e.asset_id.toLowerCase());
  });
  writeFileSync(
    MANIFEST_PATH,
    `${JSON.stringify({ ...manifest, entries: nextEntries }, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `${invalidated.length} ${cfg.manifestName} trusted hashes invalidated. ` +
      `Archived to ${archivePath}. ` +
      `Re-review required via \`npm run play-art:review -- --playbook=${playbookKey}\`.`,
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
