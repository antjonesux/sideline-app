#!/usr/bin/env node
/**
 * Read-only play-art source discovery.
 *
 * Usage (from sideline/):
 *   npm run play-art:discover
 *
 * Recursively scans scripts/play-art/source/ for .docx files and resolves
 * human-readable names against CFB27 seed playbooks. Does not ingest or modify files.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverAndResolveSources } from "./source-discovery";
import type { PlayArtSourceDiscoveryResult } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));

function pad(text: string, width: number): string {
  if (text.length >= width) return text;
  return text + " ".repeat(width - text.length);
}

function formatRow(result: PlayArtSourceDiscoveryResult): string {
  const target =
    result.resolvedSeed ??
    (result.status === "AMBIGUOUS" ? (result.candidates ?? []).join(", ") : "—");
  return `${pad(result.fileName, 28)} → ${pad(target, 28)} ${result.status}`;
}

function main(): void {
  const results = discoverAndResolveSources();
  const counts = {
    MATCH: 0,
    ALIAS: 0,
    UNRESOLVED: 0,
    AMBIGUOUS: 0,
  };
  for (const result of results) {
    counts[result.status] += 1;
  }

  console.log("PLAY ART SOURCE DISCOVERY");
  console.log(`Scanned: ${results.length} DOCX file(s)`);
  console.log("");
  for (const result of results) {
    console.log(formatRow(result));
    if (result.status === "AMBIGUOUS" || result.status === "UNRESOLVED") {
      if (result.sourcePath.includes("/")) {
        console.log(`  path: ${result.sourcePath}`);
      }
      if (result.aliasTarget) {
        console.log(`  alias → ${result.aliasTarget} (catalog miss)`);
      }
    }
  }
  console.log("");
  console.log(
    `Summary: ${counts.MATCH} MATCH, ${counts.ALIAS} ALIAS, ${counts.UNRESOLVED} UNRESOLVED, ${counts.AMBIGUOUS} AMBIGUOUS`,
  );

  const reportDir = join(__dirname, "reports");
  mkdirSync(reportDir, { recursive: true });
  const reportPath = join(reportDir, "source-discovery.json");
  writeFileSync(
    reportPath,
    `${JSON.stringify({ scanned: results.length, counts, results }, null, 2)}\n`,
    "utf8",
  );
  console.log(`Report: ${reportPath}`);
}

main();
