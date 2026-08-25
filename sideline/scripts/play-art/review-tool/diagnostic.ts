/**
 * Skip-diagnostic helpers — sample skipped REVIEW cases and persist categorizations.
 * Does not modify review-tool session state or matching-overrides.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ReviewCase } from "./cases";
import { caseKey, type SkippedCase } from "./state";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DIAGNOSTIC_REPORTS_DIR = join(__dirname, "reports");

export type DiagnosticCategory = "F" | "C" | "A" | "O";

export type DiagnosticCategorization = {
  cropId: string;
  matcherAssignedFormation: string;
  topCandidates: string[];
  category: DiagnosticCategory;
  notes: string;
};

export type DiagnosticSummary = {
  F_formationMismatch: number;
  C_correctFormationWrongTop3: number;
  A_ambiguous: number;
  O_other: number;
};

export type DiagnosticReport = {
  playbook: string;
  startedAt: string;
  completedAt: string | null;
  sampleSize: number;
  totalSkippedInState: number;
  seed: number | null;
  categorizations: DiagnosticCategorization[];
  summary: DiagnosticSummary;
};

export type DiagnosticCase = ReviewCase & {
  originalSkipReason?: string;
};

/** Mulberry32 — deterministic when seed is set. */
export function createRng(seed: number | undefined): () => number {
  if (seed == null || !Number.isFinite(seed)) {
    return () => Math.random();
  }
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function sampleItems<T>(items: T[], n: number, rng: () => number): T[] {
  if (items.length <= n) return [...items];
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export function resolveSkippedCases(
  skipped: SkippedCase[],
  cases: ReviewCase[],
): DiagnosticCase[] {
  const byKey = new Map(cases.map((c) => [c.caseKey, c]));
  const out: DiagnosticCase[] = [];
  for (const s of skipped) {
    const key = caseKey(s.formation, s.cropId);
    const reviewCase = byKey.get(key);
    if (!reviewCase) continue;
    out.push({
      ...reviewCase,
      originalSkipReason: s.reason,
    });
  }
  return out;
}

export function emptySummary(): DiagnosticSummary {
  return {
    F_formationMismatch: 0,
    C_correctFormationWrongTop3: 0,
    A_ambiguous: 0,
    O_other: 0,
  };
}

export function summarize(categorizations: DiagnosticCategorization[]): DiagnosticSummary {
  const summary = emptySummary();
  for (const c of categorizations) {
    if (c.category === "F") summary.F_formationMismatch += 1;
    else if (c.category === "C") summary.C_correctFormationWrongTop3 += 1;
    else if (c.category === "A") summary.A_ambiguous += 1;
    else summary.O_other += 1;
  }
  return summary;
}

export function createDiagnosticReport(opts: {
  playbook: string;
  sampleSize: number;
  totalSkippedInState: number;
  seed: number | null;
}): DiagnosticReport {
  return {
    playbook: opts.playbook,
    startedAt: new Date().toISOString(),
    completedAt: null,
    sampleSize: opts.sampleSize,
    totalSkippedInState: opts.totalSkippedInState,
    seed: opts.seed,
    categorizations: [],
    summary: emptySummary(),
  };
}

export function reportFileName(playbook: string, startedAt: string): string {
  const stamp = startedAt.replace(/[:.]/g, "-");
  return `diagnostic-${playbook}-${stamp}.json`;
}

export function reportPathFor(playbook: string, startedAt: string): string {
  return join(DIAGNOSTIC_REPORTS_DIR, reportFileName(playbook, startedAt));
}

export function writeDiagnosticReport(report: DiagnosticReport, path: string): void {
  report.summary = summarize(report.categorizations);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export function recommendationFor(summary: DiagnosticSummary, categorized: number): string {
  if (categorized === 0) {
    return "No categorizations yet — complete the sample before choosing a fix.";
  }
  const fPct = (summary.F_formationMismatch / categorized) * 100;
  const cPct = (summary.C_correctFormationWrongTop3 / categorized) * 100;
  const aoPct =
    ((summary.A_ambiguous + summary.O_other) / categorized) * 100;

  if (aoPct > 30) {
    return (
      "Ambiguous/other is elevated (>30%). Investigate crop quality and labeling " +
      "before committing to either fix."
    );
  }
  if (fPct > 60) {
    return (
      "Formation mismatch is dominant (>60%).\n" +
      "  → Fix upstream: improve DOCX formation detection.\n" +
      "  → Cross-formation picker in review tool is secondary."
    );
  }
  if (cPct > 60) {
    return (
      "Wrong top-3 is dominant (>60%).\n" +
      "  → Fix downstream: cross-formation picker in the review tool.\n" +
      "  → Formation detection is secondary."
    );
  }
  if (fPct >= 30 && cPct >= 30) {
    return (
      "Both formation mismatch and wrong top-3 are material (30–60%).\n" +
      "  → Both fixes needed; prioritize F (deeper root cause / upstream ingestion)."
    );
  }
  if (fPct >= cPct) {
    return (
      "Formation mismatch leads the sample.\n" +
      "  → Prefer upstream DOCX formation detection next."
    );
  }
  return (
    "Wrong top-3 leads the sample.\n" +
    "  → Prefer cross-formation picker in the review tool next."
  );
}

export function printDiagnosticSummary(
  report: DiagnosticReport,
  reportPath: string,
): void {
  const n = report.categorizations.length;
  const s = summarize(report.categorizations);
  const total = report.totalSkippedInState;
  const pct = (count: number) =>
    n === 0 ? "  0.0%" : `${((count / n) * 100).toFixed(1).padStart(5)}%`;
  const extrapolate = (count: number) =>
    n === 0 ? 0 : Math.round((count / n) * total);

  const displayName =
    report.playbook
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ") || report.playbook;

  const relPath = existsSync(reportPath)
    ? reportPath.includes("scripts/play-art/")
      ? `scripts/play-art/${reportPath.split("scripts/play-art/")[1]}`
      : reportPath
    : reportPath;

  console.log(`
═══════════════════════════════════════════════════
${displayName} Skip Diagnostic — Summary
═══════════════════════════════════════════════════

Sample size:                ${report.sampleSize} / ${total} skipped
Categorized:                ${n}

Category breakdown:
  F  Formation mismatch:    ${String(s.F_formationMismatch).padStart(3)}  (${pct(s.F_formationMismatch)})
  C  Wrong top 3:           ${String(s.C_correctFormationWrongTop3).padStart(3)}  (${pct(s.C_correctFormationWrongTop3)})
  A  Ambiguous:             ${String(s.A_ambiguous).padStart(3)}  (${pct(s.A_ambiguous)})
  O  Other:                 ${String(s.O_other).padStart(3)}  (${pct(s.O_other)})

Extrapolated to full ${total} skips:
  ~${extrapolate(s.F_formationMismatch)} formation mismatches
  ~${extrapolate(s.C_correctFormationWrongTop3)} wrong top 3
  ~${extrapolate(s.A_ambiguous)} ambiguous
  ~${extrapolate(s.O_other)} other

Recommendation:
  ${recommendationFor(s, n)}

Report saved to: ${relPath}
═══════════════════════════════════════════════════
`);
}
