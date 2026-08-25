#!/usr/bin/env node
/**
 * Formation-level quality + hard-case report for Matcher V3 runs.
 *
 * Usage (from sideline/):
 *   NODE_PATH=./node_modules npx tsx ./scripts/play-art/matcher-v3-quality-report.ts \
 *     --report scripts/play-art/reports/cfb27-offense-air-force-matching.json
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PlayArtMatchingReport } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv: string[]): { reportPath: string; outDir: string } {
  let reportPath = "";
  let outDir = join(__dirname, "reports", "matcher-v3-debug");
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--report" && argv[i + 1]) {
      reportPath = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--out" && argv[i + 1]) {
      outDir = argv[i + 1];
      i += 1;
    }
  }
  if (!reportPath) {
    throw new Error("Required: --report <matching.json>");
  }
  return { reportPath, outDir };
}

function main(): void {
  const { reportPath, outDir } = parseArgs(process.argv.slice(2));
  const report = JSON.parse(readFileSync(reportPath, "utf8")) as PlayArtMatchingReport;
  mkdirSync(outDir, { recursive: true });

  const formations = report.formations.map((f) => {
    const pass = f.assignments.filter((a) => a.status === "PASS").length;
    const review = f.assignments.filter((a) => a.status === "REVIEW").length;
    const fail = f.assignments.filter((a) => a.status === "FAIL").length;
    const n = f.assignments.length || 1;
    const margins = f.assignments
      .map((a) => a.margin)
      .filter((m): m is number => m != null);
    const avgMargin =
      margins.length === 0 ? null : margins.reduce((s, m) => s + m, 0) / margins.length;
    return {
      formation: f.formation,
      pass,
      review,
      fail,
      total: f.assignments.length,
      reviewRate: review / n,
      avgMargin,
    };
  });

  formations.sort((a, b) => b.reviewRate - a.reviewRate || a.pass - b.pass);

  const all = report.formations.flatMap((f) => f.assignments);
  const lowestPassMargins = all
    .filter((a) => a.status === "PASS" && a.margin != null)
    .sort((a, b) => (a.margin ?? 0) - (b.margin ?? 0))
    .slice(0, 25)
    .map((a) => ({
      formation: a.formation,
      cropId: a.cropId,
      playName: a.playName,
      score: a.similarity,
      margin: a.margin,
      runnerUp: a.runnerUpPlay,
    }));

  const highestReview = all
    .filter((a) => a.status === "REVIEW" && a.isLocalBest)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 25)
    .map((a) => ({
      formation: a.formation,
      cropId: a.cropId,
      playName: a.playName,
      score: a.similarity,
      margin: a.margin,
      runnerUp: a.runnerUpPlay,
    }));

  const runnerUpTies = all
    .filter((a) => a.margin != null && Math.abs(a.margin) < 0.005)
    .slice(0, 40)
    .map((a) => ({
      status: a.status,
      formation: a.formation,
      cropId: a.cropId,
      playName: a.playName,
      margin: a.margin,
      runnerUp: a.runnerUpPlay,
    }));

  const ltRt = all.filter(
    (a) =>
      /\bLT\b|\bRT\b/.test(a.playName) ||
      (a.runnerUpPlay != null && /\bLT\b|\bRT\b/.test(a.runnerUpPlay)),
  );

  const negativeMargin = all.filter((a) => a.margin != null && a.margin < 0);
  const regFailures = all.filter((a) => a.registration?.failed);
  const atScaleBound = all.filter(
    (a) =>
      a.registration &&
      (a.registration.scale <= 0.96 + 1e-9 || a.registration.scale >= 1.04 - 1e-9),
  );

  const hardCase = {
    playbook: report.playbook,
    matcherVersion: report.matcherVersion,
    summary: {
      pass: report.passCount,
      review: report.reviewCount,
      fail: report.failCount,
      autoMatchRate: report.autoMatchRate,
      averageMargin: report.averageMargin,
      medianMargin: report.medianMargin,
      negativeMarginPassCount: report.negativeMarginPassCount,
      nearZeroMarginPassCount: report.nearZeroMarginPassCount,
      methodCounts: report.methodCounts,
    },
    lowestPassMargins,
    highestConfidenceReviews: highestReview,
    runnerUpTies,
    ltRtCollisions: ltRt.slice(0, 40).map((a) => ({
      status: a.status,
      formation: a.formation,
      cropId: a.cropId,
      playName: a.playName,
      margin: a.margin,
      runnerUp: a.runnerUpPlay,
      isLocalBest: a.isLocalBest,
    })),
    negativeMarginAssignments: negativeMargin.slice(0, 40).map((a) => ({
      status: a.status,
      formation: a.formation,
      cropId: a.cropId,
      playName: a.playName,
      margin: a.margin,
      runnerUp: a.runnerUpPlay,
    })),
    registrationFailures: regFailures.length,
    scaleAtBoundCount: atScaleBound.length,
  };

  const formationReport = {
    playbook: report.playbook,
    matcherVersion: report.matcherVersion,
    formationsSortedByReviewRate: formations,
  };

  const slug = report.playbook.toLowerCase().replace(/\s+/g, "-");
  const ver = report.matcherVersion;
  const formationPath = join(outDir, `${slug}-${ver}-formations.json`);
  const hardPath = join(outDir, `${slug}-${ver}-hard-cases.json`);
  writeFileSync(formationPath, `${JSON.stringify(formationReport, null, 2)}\n`);
  writeFileSync(hardPath, `${JSON.stringify(hardCase, null, 2)}\n`);

  console.log(`\n${report.playbook} Matcher ${report.matcherVersion.toUpperCase()} — formations (worst first)`);
  for (const f of formations.slice(0, 20)) {
    console.log(
      `${f.formation}: PASS ${f.pass}/${f.total}  REVIEW ${f.review}/${f.total}` +
        (f.avgMargin != null ? `  avgM=${f.avgMargin.toFixed(3)}` : ""),
    );
  }
  console.log(`\nWrote ${formationPath}`);
  console.log(`Wrote ${hardPath}`);
  console.log(
    `Hard-case: lowest-PASS=${lowestPassMargins.length} high-REVIEW=${highestReview.length} ` +
      `ties=${runnerUpTies.length} LT/RT=${ltRt.length} neg-margin=${negativeMargin.length} ` +
      `reg-fail=${regFailures.length}`,
  );
}

main();
