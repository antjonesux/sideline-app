#!/usr/bin/env node
/**
 * Batch play-art ingestion — walk source/, invoke play-art:ingest per DOCX.
 *
 * Usage (from sideline/):
 *   npm run play-art:batch
 *   npm run play-art:batch -- --scheme="Multiple & Pro Style" --limit=3
 *   npm run play-art:batch -- --dry-run
 *   npm run play-art:batch -- --force --exclude="California.docx,USC.docx"
 *
 * Does not auto-clear REVIEWs. Per-file failures do not halt the batch.
 */

import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { docxPathToTeamSlug } from "./lib/slug-utils";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SIDELINE_ROOT = join(__dirname, "..", "..");
const SOURCE_ROOT = join(__dirname, "source");
const REPORTS_DIR = join(__dirname, "reports");

type CliArgs = {
  scheme?: string;
  limit?: number;
  exclude: Set<string>;
  force: boolean;
  dryRun: boolean;
};

type WorkItem = {
  absPath: string;
  filename: string;
  scheme: string;
  teamSlug: string;
  reportSlug: string;
  reportPath: string;
};

type MatchCounts = {
  pass: number;
  review: number;
  fail: number;
  autoMatchRate: number | null;
  playbook: string;
};

type ItemResult =
  | { kind: "skipped"; item: WorkItem; reason: string }
  | { kind: "success"; item: WorkItem; counts: MatchCounts; elapsedMs: number }
  | { kind: "failure"; item: WorkItem; reason: string; elapsedMs: number; exitCode: number | null };

function readFlag(argv: string[], name: string): string | undefined {
  const eqPrefix = `${name}=`;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === name && argv[i + 1] && !argv[i + 1].startsWith("-")) {
      return argv[i + 1];
    }
    if (arg.startsWith(eqPrefix)) {
      return arg.slice(eqPrefix.length);
    }
  }
  return undefined;
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name);
}

function parseArgs(argv: string[]): CliArgs {
  if (hasFlag(argv, "--help") || hasFlag(argv, "-h")) {
    printHelp();
    process.exit(0);
  }

  const scheme = readFlag(argv, "--scheme")?.trim();
  const limitRaw = readFlag(argv, "--limit")?.trim();
  const excludeRaw = readFlag(argv, "--exclude")?.trim() ?? "";
  const force = hasFlag(argv, "--force");
  const dryRun = hasFlag(argv, "--dry-run");

  let limit: number | undefined;
  if (limitRaw) {
    const n = Number(limitRaw);
    if (!Number.isInteger(n) || n < 1) {
      console.error(`Invalid --limit=${limitRaw} (must be a positive integer)`);
      process.exit(1);
    }
    limit = n;
  }

  const exclude = new Set(
    excludeRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.toLowerCase()),
  );

  return { scheme, limit, exclude, force, dryRun };
}

function printHelp(): void {
  console.log(`Batch ingest all play-art DOCXs under scripts/play-art/source/.

Usage (from sideline/):
  npm run play-art:batch
  npm run play-art:batch -- --scheme="Multiple & Pro Style" --limit=3
  npm run play-art:batch -- --dry-run
  npm run play-art:batch -- --force --exclude="California.docx"

Flags:
  --scheme=<folder>              Only DOCXs under this scheme folder
  --limit=<N>                    Stop after N successful ingests (skips don't count)
  --exclude=<file1,file2>        Skip these DOCX basenames
  --force                        Re-ingest even when matcher report exists
  --dry-run                      List work items; do not invoke ingest
  --help, -h                     Show this help
`);
}

function isSkippableDocxName(name: string): boolean {
  if (name.startsWith("._")) return true;
  if (name === ".DS_Store") return true;
  return false;
}

function schemeFromPath(absPath: string): string {
  const rel = relative(SOURCE_ROOT, absPath);
  const parts = rel.split(/[/\\]/).filter(Boolean);
  if (parts.length >= 2) return parts[0];
  return "(root)";
}

function discoverWorkItems(args: CliArgs): WorkItem[] {
  if (!existsSync(SOURCE_ROOT)) {
    throw new Error(`Source directory missing: ${SOURCE_ROOT}`);
  }
  if (!existsSync(REPORTS_DIR)) {
    mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const items: WorkItem[] = [];

  function walk(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") && entry.name !== "." && entry.name !== "..") {
        // Skip hidden dirs/files except we still filter ._docx below for safety
        if (entry.isDirectory()) continue;
        if (isSkippableDocxName(entry.name)) continue;
      }
      if (isSkippableDocxName(entry.name)) continue;

      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (extname(entry.name).toLowerCase() !== ".docx") continue;

      const scheme = schemeFromPath(full);
      if (args.scheme && scheme !== args.scheme) continue;
      if (args.exclude.has(entry.name.toLowerCase())) continue;

      const teamSlug = docxPathToTeamSlug(full);
      const reportSlug = `cfb27-offense-${teamSlug}`;
      items.push({
        absPath: full,
        filename: entry.name,
        scheme,
        teamSlug,
        reportSlug,
        reportPath: join(REPORTS_DIR, `${reportSlug}-matching.json`),
      });
    }
  }

  walk(SOURCE_ROOT);
  items.sort((a, b) => a.absPath.localeCompare(b.absPath));
  return items;
}

function readMatchCounts(reportPath: string): MatchCounts | null {
  try {
    const raw = JSON.parse(readFileSync(reportPath, "utf8")) as {
      playbook?: string;
      passCount?: number;
      reviewCount?: number;
      failCount?: number;
      autoMatchRate?: number;
    };
    if (
      typeof raw.passCount !== "number" ||
      typeof raw.reviewCount !== "number" ||
      typeof raw.failCount !== "number"
    ) {
      return null;
    }
    return {
      pass: raw.passCount,
      review: raw.reviewCount,
      fail: raw.failCount,
      autoMatchRate: typeof raw.autoMatchRate === "number" ? raw.autoMatchRate : null,
      playbook: typeof raw.playbook === "string" ? raw.playbook : basename(reportPath),
    };
  } catch {
    return null;
  }
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return `${h}h ${remM}m ${s}s`;
}

function formatPct(rate: number | null): string {
  if (rate == null) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

function extractFailureReason(stdout: string, stderr: string): string {
  const errLines = stderr
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  for (let i = errLines.length - 1; i >= 0; i -= 1) {
    const line = errLines[i];
    if (line.startsWith("Error:") || line.includes("failed") || line.includes("404")) {
      return line.replace(/^Error:\s*/i, "");
    }
  }
  if (errLines.length > 0) return errLines[errLines.length - 1];

  const outLines = stdout
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  for (let i = outLines.length - 1; i >= 0; i -= 1) {
    const line = outLines[i];
    if (
      line.includes("Error:") ||
      line.includes("failed") ||
      line.includes("Pipeline aborted") ||
      line.includes("404")
    ) {
      return line.replace(/^Error:\s*/i, "");
    }
  }
  if (outLines.length > 0) return outLines[outLines.length - 1];
  return "unknown error (see log)";
}

function runIngest(
  item: WorkItem,
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(
      "npm",
      ["run", "play-art:ingest", "--", `--source=${item.absPath}`],
      {
        cwd: SIDELINE_ROOT,
        stdio: ["ignore", "pipe", "pipe"],
        env: process.env,
      },
    );

    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    proc.stderr?.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    proc.on("error", (err) => {
      stderr += `\n${err.message}`;
      resolve({ exitCode: null, stdout, stderr });
    });

    proc.on("close", (code) => {
      resolve({ exitCode: code, stdout, stderr });
    });
  });
}

function pad(text: string, width: number): string {
  if (text.length >= width) return text;
  return text + " ".repeat(width - text.length);
}

function displayName(item: WorkItem): string {
  return item.filename.replace(/\.docx$/i, "");
}

function buildSummary(options: {
  startedAt: Date;
  finishedAt: Date;
  totalFound: number;
  results: ItemResult[];
  remaining: WorkItem[];
  interrupted: boolean;
  logPath: string;
  argv: string[];
}): string {
  const { startedAt, finishedAt, totalFound, results, remaining, interrupted, logPath, argv } =
    options;

  const skipped = results.filter((r) => r.kind === "skipped");
  const successes = results.filter((r): r is Extract<ItemResult, { kind: "success" }> => r.kind === "success");
  const failures = results.filter((r): r is Extract<ItemResult, { kind: "failure" }> => r.kind === "failure");

  const lines: string[] = [];
  lines.push("════════════════════════════════════════════════════════");
  lines.push(
    `Batch ingestion ${interrupted ? "interrupted" : "complete"} — ${finishedAt.toISOString()}`,
  );
  lines.push("════════════════════════════════════════════════════════");
  lines.push("");
  lines.push(`Command:             npm run play-art:batch -- ${argv.join(" ")}`.trimEnd());
  lines.push(`Started:             ${startedAt.toISOString()}`);
  lines.push(`Total DOCXs found:   ${totalFound}`);
  lines.push(`Already ingested:    ${skipped.length}   (skipped, use --force to re-run)`);
  lines.push(`Newly ingested:      ${successes.length}`);
  lines.push(`Failed:              ${failures.length}`);
  if (interrupted && remaining.length > 0) {
    lines.push(`Not processed:       ${remaining.length}   (interrupted before these)`);
  }
  lines.push("");

  if (successes.length > 0) {
    lines.push("Success details:");
    for (const s of successes) {
      const name = pad(displayName(s.item), 18);
      lines.push(
        `  ${name} PASS ${s.counts.pass}  REVIEW ${s.counts.review}  FAIL ${s.counts.fail}   (${formatPct(s.counts.autoMatchRate)})`,
      );
    }
    lines.push("");
  }

  if (failures.length > 0) {
    lines.push("Failures:");
    for (const f of failures) {
      lines.push(`  ${pad(displayName(f.item), 18)} ${f.reason}`);
    }
    lines.push("");
  }

  const withReviews = successes
    .filter((s) => s.counts.review > 0)
    .sort((a, b) => b.counts.review - a.counts.review);
  if (withReviews.length > 0) {
    lines.push("Playbooks with REVIEW work pending (sorted by count):");
    for (const s of withReviews) {
      lines.push(`  ${pad(displayName(s.item), 18)} ${s.counts.review} REVIEWs`);
    }
    lines.push("");
  }

  if (interrupted && remaining.length > 0) {
    lines.push("Remaining (not started):");
    for (const item of remaining) {
      lines.push(`  ${displayName(item)} (${item.scheme})`);
    }
    lines.push("");
  }

  const elapsed = finishedAt.getTime() - startedAt.getTime();
  lines.push(`Total time: ${formatDuration(elapsed)}`);
  lines.push(`Log file:   ${relative(SIDELINE_ROOT, logPath)}`);
  lines.push("");
  lines.push("Next steps:");
  lines.push("  1. Investigate failures (see log for full stderr)");
  lines.push("  2. Clear REVIEWs via: npm run play-art:review -- --playbook={slug}");
  lines.push("     (Run --list to see all available playbooks)");
  lines.push("════════════════════════════════════════════════════════");
  return lines.join("\n");
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  const startedAt = new Date();

  let workItems: WorkItem[];
  try {
    workItems = discoverWorkItems(args);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  if (args.dryRun) {
    console.log("DRY RUN — would process these playbooks:");
    console.log("");
    let wouldIngest = 0;
    let wouldSkip = 0;
    for (let i = 0; i < workItems.length; i += 1) {
      const item = workItems[i];
      const already = existsSync(item.reportPath);
      let action: string;
      if (already && !args.force) {
        action = "(already ingested, would skip)";
        wouldSkip += 1;
      } else if (already && args.force) {
        action = "(already ingested, would re-ingest --force)";
        wouldIngest += 1;
      } else {
        action = "(would ingest)";
        wouldIngest += 1;
      }
      console.log(
        `  [${i + 1}/${workItems.length}] ${pad(item.filename, 28)} → ${pad(item.reportSlug, 28)} ${action}`,
      );
    }
    console.log("");
    console.log(`Summary: ${wouldIngest} to ingest, ${wouldSkip} already done.`);
    return;
  }

  mkdirSync(REPORTS_DIR, { recursive: true });
  const stamp = startedAt.toISOString().replace(/[:.]/g, "-").replace(/Z$/, "Z");
  const logPath = join(REPORTS_DIR, `batch-${stamp}.log`);
  const logChunks: string[] = [];
  const appendLog = (text: string): void => {
    logChunks.push(text);
  };

  appendLog(`Batch ingestion started — ${startedAt.toISOString()}\n`);
  appendLog(`Command: npm run play-art:batch -- ${argv.join(" ")}\n`);
  appendLog(`Source: ${SOURCE_ROOT}\n`);
  appendLog(`DOCXs found (after filters): ${workItems.length}\n\n`);

  let stopAfterCurrent = false;
  const onInterrupt = (): void => {
    if (stopAfterCurrent) {
      console.log("\nSecond interrupt — forcing exit after current file finishes.");
      return;
    }
    stopAfterCurrent = true;
    console.log("\nInterrupt received — finishing current playbook, then stopping…");
  };
  process.on("SIGINT", onInterrupt);
  process.on("SIGTERM", onInterrupt);

  const results: ItemResult[] = [];
  let successCount = 0;
  const total = workItems.length;
  let remaining: WorkItem[] = [];

  for (let i = 0; i < workItems.length; i += 1) {
    if (stopAfterCurrent) {
      remaining = workItems.slice(i);
      break;
    }

    const item = workItems[i];
    const label = `[${i + 1}/${total}]`;

    if (existsSync(item.reportPath) && !args.force) {
      console.log(`${label} Ingesting ${item.filename} (${item.scheme})...`);
      console.log(`  → SKIPPED (already ingested; use --force to re-run)`);
      console.log("");
      results.push({
        kind: "skipped",
        item,
        reason: "already ingested",
      });
      appendLog(`${label} ${item.filename} SKIPPED (already ingested)\n\n`);
      continue;
    }

    if (args.limit != null && successCount >= args.limit) {
      remaining = workItems.slice(i);
      break;
    }

    console.log(`${label} Ingesting ${item.filename} (${item.scheme})...`);
    const mtimeBefore = existsSync(item.reportPath) ? statSync(item.reportPath).mtimeMs : 0;
    const t0 = Date.now();
    const { exitCode, stdout, stderr } = await runIngest(item);
    const elapsedMs = Date.now() - t0;

    appendLog(`${"─".repeat(60)}\n`);
    appendLog(`${label} ${item.filename} (${item.scheme}) slug=${item.reportSlug}\n`);
    appendLog(`exit=${exitCode} elapsed=${formatDuration(elapsedMs)}\n\n`);
    appendLog("--- stdout ---\n");
    appendLog(stdout || "(empty)\n");
    appendLog("\n--- stderr ---\n");
    appendLog(stderr || "(empty)\n");
    appendLog("\n");

    const reportExists = existsSync(item.reportPath);
    const mtimeAfter = reportExists ? statSync(item.reportPath).mtimeMs : 0;
    const reportFresh = reportExists && (mtimeBefore === 0 || mtimeAfter > mtimeBefore);
    // Matching can exit 1 when REVIEW/FAIL remain, but still wrote a fresh report.
    const succeeded = exitCode === 0 || reportFresh;

    if (succeeded) {
      const counts = readMatchCounts(item.reportPath) ?? {
        pass: 0,
        review: 0,
        fail: 0,
        autoMatchRate: null,
        playbook: displayName(item),
      };
      console.log(
        `  ✓ PASS: ${counts.pass}  REVIEW: ${counts.review}  FAIL: ${counts.fail}  (auto-recovery ${formatPct(counts.autoMatchRate)}, took ${formatDuration(elapsedMs)})`,
      );
      console.log("");
      results.push({ kind: "success", item, counts, elapsedMs });
      successCount += 1;
      appendLog(
        `RESULT: success PASS=${counts.pass} REVIEW=${counts.review} FAIL=${counts.fail}\n\n`,
      );
    } else {
      const reason = extractFailureReason(stdout, stderr);
      console.log(`  ✗ FAILED: ${reason}`);
      console.log("");
      results.push({
        kind: "failure",
        item,
        reason,
        elapsedMs,
        exitCode,
      });
      appendLog(`RESULT: failure — ${reason}\n\n`);
    }

    if (stopAfterCurrent) {
      remaining = workItems.slice(i + 1);
      break;
    }

    if (args.limit != null && successCount >= args.limit) {
      remaining = workItems.slice(i + 1);
      break;
    }
  }

  process.off("SIGINT", onInterrupt);
  process.off("SIGTERM", onInterrupt);

  const finishedAt = new Date();
  const summary = buildSummary({
    startedAt,
    finishedAt,
    totalFound: workItems.length,
    results,
    remaining,
    interrupted: stopAfterCurrent,
    logPath,
    argv,
  });

  console.log(summary);
  appendLog("\n");
  appendLog(summary);
  appendLog("\n");
  writeFileSync(logPath, logChunks.join(""), "utf8");
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
