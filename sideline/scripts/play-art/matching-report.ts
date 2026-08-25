import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PlayArtMatchingReport } from "./types";

export function printMatchingSummary(report: PlayArtMatchingReport): void {
  console.log("");
  console.log(`${report.playbook.toUpperCase()} MATCHING (${report.matcherVersion.toUpperCase()})`);
  console.log(`Formations: ${report.formationCount}`);
  console.log(`Plays: ${report.playCount}`);
  console.log(`PASS:   ${report.passCount}`);
  console.log(`REVIEW: ${report.reviewCount}`);
  console.log(`FAIL:   ${report.failCount}`);
  console.log(`Auto-approved: ${(report.autoMatchRate * 100).toFixed(1)}%`);
  console.log(`Overrides: ${report.overrideCount}`);
  console.log(
    `Methods: trusted-hash=${report.methodCounts["trusted-hash"]} ` +
      `normalized-exact=${report.methodCounts["normalized-exact"]} ` +
      `visual-v3=${report.methodCounts["visual-v3"] ?? 0} ` +
      `geometry-v3.2=${report.methodCounts["geometry-v3.2"] ?? 0} ` +
      `geometry-v3.1=${report.methodCounts["geometry-v3.1"] ?? 0} ` +
      `visual-v2=${report.methodCounts["visual-v2"] ?? 0} ` +
      `operator-override=${report.methodCounts["operator-override"]}`,
  );
  if (report.geometryPromotedCount != null || report.geometryConflictCount != null) {
    console.log(
      `Geometry: promoted=${report.geometryPromotedCount ?? 0} ` +
        `perHuePromoted=${report.perHuePromotedCount ?? 0} ` +
        `conflicts=${report.geometryConflictCount ?? 0}`,
    );
  }
  if (report.averageMargin !== null && report.medianMargin !== null) {
    console.log(
      `Margin avg/med: ${report.averageMargin.toFixed(4)} / ${report.medianMargin.toFixed(4)} ` +
        `(neg-PASS=${report.negativeMarginPassCount}, near0-PASS=${report.nearZeroMarginPassCount})`,
    );
  }
  console.log(
    `Thresholds: pass≥${report.thresholds.passMinScore}, margin≥${report.thresholds.passMinMargin}, ` +
      `fail<${report.thresholds.failMaxScore}, reg≥${report.thresholds.registrationMinQuality}`,
  );
  console.log(
    report.status === "pass"
      ? "READY TO PUBLISH"
      : report.status === "review"
        ? "BLOCKED — REVIEW ITEMS REMAIN"
        : "BLOCKED — FAIL ITEMS REMAIN",
  );
  console.log("");
}

export function printFormationMatchingReport(report: PlayArtMatchingReport): void {
  for (const formation of report.formations) {
    console.log(`${report.playbook.toUpperCase()} / ${formation.formation.toUpperCase()}`);
    for (const assignment of formation.assignments) {
      const scorePct = (assignment.similarity * 100).toFixed(1);
      const runnerUp =
        assignment.runnerUpPlay && assignment.runnerUpSimilarity !== null
          ? `${assignment.runnerUpPlay} / ${(assignment.runnerUpSimilarity * 100).toFixed(1)}%`
          : "—";
      const margin = assignment.margin !== null ? assignment.margin.toFixed(3) : "—";
      const method = assignment.matchMethod;
      const signals = assignment.signals
        ? ` r=${assignment.signals.residual.toFixed(2)} e=${assignment.signals.edges.toFixed(2)} ` +
          `f=${assignment.signals.foreground.toFixed(2)} p=${assignment.signals.registered.toFixed(2)}` +
          (assignment.signals.colorInk != null
            ? ` c=${assignment.signals.colorInk.toFixed(2)}`
            : "") +
          (assignment.signals.spatial != null
            ? ` s=${assignment.signals.spatial.toFixed(2)}`
            : "")
        : "";
      console.log(
        `${assignment.status.padEnd(6)} ${scorePct.padStart(5)}%  ${assignment.playName.padEnd(28)} ← ${assignment.cropId} [${method}]`,
      );
      console.log(
        `       runner-up: ${runnerUp}  margin: ${margin}  localBest: ${assignment.isLocalBest ? "yes" : "no"}${signals}`,
      );
      if (assignment.geometry) {
        const g = assignment.geometry;
        const gMargin = g.margin != null ? g.margin.toFixed(3) : "—";
        const gRunner =
          g.runnerUpPlay && g.runnerUpScore != null
            ? `${g.runnerUpPlay}/${(g.runnerUpScore * 100).toFixed(1)}%`
            : "—";
        console.log(
          `       geometry: ${g.status} score=${(g.score * 100).toFixed(1)}% runner=${gRunner} ` +
            `margin=${gMargin} conflict=${g.conflictWithV3 ? "yes" : "no"} (${g.reason})`,
        );
        if (g.perHueMargins || g.maxPerHueMargin != null) {
          const ph = g.perHueMargins;
          console.log(
            `       per-hue: max=${g.maxPerHueChannel ?? "—"}@${g.maxPerHueMargin?.toFixed(3) ?? "—"} ` +
              `warm=${ph?.warm.toFixed(3) ?? "—"} cool=${ph?.cool.toFixed(3) ?? "—"} ` +
              `other=${ph?.other.toFixed(3) ?? "—"} promoted=${g.perHuePromoted ? "yes" : "no"}`,
          );
        }
      }
    }
    if (formation.errors.length > 0) {
      for (const err of formation.errors) {
        console.log(`  ERROR: ${err}`);
      }
    }
    console.log("");
  }
}

export function writeMatchingReport(
  report: PlayArtMatchingReport,
  reportDir: string,
  slug: string,
): string {
  mkdirSync(reportDir, { recursive: true });
  const path = join(reportDir, `${slug}-matching.json`);
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return path;
}

export function mergeMatchingIntoValidationReport(
  validationReport: Record<string, unknown>,
  matchingReport: PlayArtMatchingReport,
): Record<string, unknown> {
  return {
    ...validationReport,
    matching: matchingReport,
  };
}
