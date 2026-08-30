#!/usr/bin/env node
/**
 * Owned play-art ingestion pipeline (offline operator workflow).
 *
 * Usage (from sideline/):
 *   npm run play-art:ingest -- --source="scripts/play-art/source/Multiple & Pro Style/California.docx"
 *
 * Backward-compatible:
 *   npm run play-art:ingest -- \
 *     --reference scripts/play-art/references/cfb27-offense-air-force.json \
 *     --source "scripts/play-art/source/Option & Spread Option/Air Force.docx"
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePlayName } from "../../lib/utils";
import {
  adaptVideoStagingToExtracted,
  printVideoStagingBridgeReport,
  resolveVideoStagingNamespace,
  type VideoStagingBridgeReport,
} from "./adapt-video-staging";
import { buildReferenceFromSeedSlug, resolveSeedSlugFromArgs } from "./build-reference";
import { assignContentHashedAssets } from "./content-hash";
import { extractPlayArtDocx, summarizeDocxStructure } from "./extract-docx";
import { seedSlugToReferencePath, displayNameToTeamSlug } from "./lib/slug-utils";
import { mapPlayArtPositionally } from "./map-positional";
import {
  loadSeedForReference,
  matchPlayArtVisually,
} from "./match-play-art";
import {
  mergeMatchingIntoValidationReport,
  printFormationMatchingReport,
  printMatchingSummary,
  writeMatchingReport,
} from "./matching-report";
import { logReferenceDownloadSummary } from "./reference-image";
import {
  manifestRecordsFromMapped,
  mergeManifestForPlaybook,
} from "./output";
import {
  loadPlayArtReference,
  referenceSlug,
  referencesDir,
  totalExpectedPlays,
} from "./reference";
import {
  clearStaging,
  publishStaging,
  writeManifestToStaging,
  writeMappedAssetsToStaging,
} from "./staging";
import { printValidationSummary, validatePlayArtMapping } from "./validate";
import {
  attachObsBlockIndexes,
  evaluateObsPublishGate,
  mapObsCatalogIdentity,
  printObsVisualVerificationReport,
  verifyObsVisualIdentity,
  type ObsVisualVerificationReport,
} from "./verify-obs-visual";
import type {
  MappedPlayArt,
  PlayArtManifestRecord,
  PlayArtMatchingReport,
} from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GENERATED_MANIFEST_PATH = join(__dirname, "..", "..", "lib", "generated", "play-art-manifest.json");

type CliArgs = {
  referencePath: string;
  sourcePath: string;
  videoStagingPath: string;
  structureReport: boolean;
  validateOnly: boolean;
  regression: boolean;
  positional: boolean;
  approveReview: boolean;
  skipTrustedHash: boolean;
  noAutoReference: boolean;
  obsVisualDiagnostic: boolean;
  reportDir: string;
  overridesPath?: string;
  seedSlug?: string;
};

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

function suggestNearbyDocx(sourcePath: string): string | null {
  const dir = dirname(sourcePath);
  if (!existsSync(dir)) return null;
  const wanted = basename(sourcePath).toLowerCase();
  const stem = wanted.replace(/\.docx?$/i, "");
  try {
    const candidates = readdirSync(dir).filter((name) => name.toLowerCase().endsWith(".docx"));
    const hit = candidates.find(
      (name) =>
        name.toLowerCase() === `${stem}.docx` ||
        name.toLowerCase().replace(/\.docx$/i, "") === stem,
    );
    return hit ?? null;
  } catch {
    return null;
  }
}

async function parseArgs(argv: string[]): Promise<CliArgs> {
  if (hasFlag(argv, "--help") || hasFlag(argv, "-h")) {
    printHelp();
    process.exit(0);
  }

  let referencePath = readFlag(argv, "--reference")?.trim() ?? "";
  let sourcePath = (readFlag(argv, "--source") ?? readFlag(argv, "--docx"))?.trim() ?? "";
  const videoStagingPath = readFlag(argv, "--video-staging")?.trim() ?? "";
  const structureReport = hasFlag(argv, "--structure-report");
  let validateOnly = hasFlag(argv, "--validate-only");
  const regression = hasFlag(argv, "--regression");
  const positional = hasFlag(argv, "--positional");
  const approveReview = hasFlag(argv, "--approve-review");
  const skipTrustedHash = hasFlag(argv, "--skip-trusted-hash");
  const noAutoReference = hasFlag(argv, "--no-auto-reference");
  const obsVisualDiagnostic = hasFlag(argv, "--obs-visual-diagnostic");
  const reportDir = readFlag(argv, "--report-dir")?.trim() || join(__dirname, "reports");
  const overridesPath = readFlag(argv, "--overrides")?.trim();

  const knownFlags = new Set([
    "--reference",
    "--source",
    "--docx",
    "--video-staging",
    "--structure-report",
    "--validate-only",
    "--regression",
    "--positional",
    "--approve-review",
    "--skip-trusted-hash",
    "--no-auto-reference",
    "--obs-visual-diagnostic",
    "--report-dir",
    "--overrides",
    "--seed",
    "--team",
    "--game",
    "--help",
    "-h",
  ]);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("-")) continue;
    const name = arg.includes("=") ? arg.slice(0, arg.indexOf("=")) : arg;
    if (!knownFlags.has(name)) {
      console.error(`Unknown flag: ${arg}`);
      process.exit(1);
    }
    if (
      !arg.includes("=") &&
      (name === "--reference" ||
        name === "--source" ||
        name === "--docx" ||
        name === "--video-staging" ||
        name === "--report-dir" ||
        name === "--overrides" ||
        name === "--seed" ||
        name === "--team" ||
        name === "--game")
    ) {
      i += 1;
    }
  }

  if (videoStagingPath && sourcePath) {
    console.error("Error: Pass either --video-staging or --source=<docx>, not both.\n");
    process.exit(1);
  }

  if (videoStagingPath) {
    if (!existsSync(videoStagingPath)) {
      console.error(`Error: Video staging path not found: ${videoStagingPath}`);
      process.exit(1);
    }
    if (structureReport) {
      console.error("Error: --structure-report is DOCX-only (not supported with --video-staging).");
      process.exit(1);
    }
    if (positional) {
      console.error("Error: --positional is DOCX-legacy only (not supported with --video-staging).");
      process.exit(1);
    }
  }

  if (!sourcePath && !videoStagingPath && !referencePath) {
    console.error(
      "Error: Must provide --source=<docx> or --video-staging=<path> " +
        "(or --seed=<slug> / --reference=<path> with a source).\n",
    );
    printHelp();
    process.exit(1);
  }

  let seedSlug: string | undefined;

  if (!sourcePath && !videoStagingPath) {
    console.error("Error: --source=<docx> or --video-staging=<path> is required for ingest.\n");
    printHelp();
    process.exit(1);
  }

  if (sourcePath && !existsSync(sourcePath)) {
    const suggestion = suggestNearbyDocx(sourcePath);
    let message = `Error: DOCX not found: ${sourcePath}`;
    if (suggestion) {
      message += `\nDid you mean: ${suggestion}?`;
    }
    console.error(message);
    process.exit(1);
  }

  if (!referencePath) {
    try {
      if (videoStagingPath) {
        const ns = resolveVideoStagingNamespace(videoStagingPath);
        seedSlug = ns.seedSlug;
        referencePath = seedSlugToReferencePath(seedSlug, referencesDir());
        console.log(`Derived seed from video-staging: ${seedSlug}`);
        console.log(`Derived reference path: ${referencePath}`);
      } else {
        const resolved = resolveSeedSlugFromArgs(argv);
        seedSlug = resolved.seedSlug;
        referencePath = seedSlugToReferencePath(seedSlug, referencesDir());
        console.log(`Derived seed: ${seedSlug}`);
        console.log(`Derived reference path: ${referencePath}`);
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }

    if (!existsSync(referencePath)) {
      if (noAutoReference) {
        console.error(
          `Error: Reference not found at ${referencePath}.\n` +
            `Pass --reference=<path>, run play-art:reference first, or omit --no-auto-reference to auto-build.`,
        );
        process.exit(1);
      }
      console.log(
        `Reference not found at ${referencePath}. Auto-building from seed ${seedSlug}...`,
      );
      try {
        const built = await buildReferenceFromSeedSlug(seedSlug!);
        referencePath = built.path;
        console.log(`Auto-built reference: ${referencePath}`);
      } catch (err) {
        const underlying = err instanceof Error ? err.message : String(err);
        console.error(`Error: Failed to build reference for ${seedSlug}.`);
        console.error(`Underlying error: ${underlying}`);
        console.error("Possible causes:");
        console.error(
          "  - Team slug not recognized (may need source-aliases.json or seed module)",
        );
        console.error("  - Missing lib/seed/playbooks/{seed}.ts");
        console.error("  - Seed export shape invalid");
        process.exit(1);
      }
    }
  }

  return {
    referencePath,
    sourcePath,
    videoStagingPath,
    structureReport,
    validateOnly,
    regression,
    positional,
    reportDir,
    overridesPath,
    approveReview,
    skipTrustedHash,
    noAutoReference,
    obsVisualDiagnostic,
    seedSlug,
  };
}

function printHelp(): void {
  console.log(`Owned play-art ingestion pipeline

Primary (recommended):
  --source <path>      Purchased source DOCX (alias: --docx)
                       Derives seed + reference path; auto-builds reference if missing

OBS video staging (game-capture OCR/catalog identity; Go Go pilot):
  --video-staging <path>   Validated staging dir (e.g. scripts/play-art/video-staging/cfb27/offense/go-go)
  --validate-only          Map + validate; do not publish
  --obs-visual-diagnostic  Optional external comparison report (informational; never blocks publish)
                           Does NOT use play-art:review. Publish when OBS gate PASSes (omit --validate-only).

Backward-compatible:
  --reference <path>   Canonical ordered reference JSON (skips auto-derive)

Optional:
  --seed=<slug>        Override seed when deriving reference
  --team=<slug>        Team/scheme slug (with --game) when deriving
  --game=cfb27         Game version for seed derivation (default: cfb27)
  --no-auto-reference  Fail if derived reference is missing (do not auto-build)
  --structure-report   Print DOCX block counts and exit
  --validate-only      Map + validate; do not publish assets or manifest
  --regression         Visual-match benchmark vs published manifest (no publish)
  --positional         Use legacy positional mapping (debug / USC comparison)
  --approve-review     Allow publish when REVIEW items remain (DOCX path only)
  --skip-trusted-hash  Force pure visual path (ignore trusted owned-asset hashes)
  --overrides <path>   Formation-scoped REVIEW override JSON (DOCX path only)
  --report-dir <path>  Validation report output (default: scripts/play-art/reports)
`);
}

function printGoGoProductionState(reference: ReturnType<typeof loadPlayArtReference>): void {
  const published = loadManifestEntriesForPlaybook(reference);
  const slug = displayNameToTeamSlug(reference.playbook);
  const publicPlaybookTree = join(
    __dirname,
    "..",
    "..",
    "public",
    "play-art",
    reference.gameVersion,
    reference.sideOfBall,
    slug,
  );
  const publicAssetsExist = existsSync(publicPlaybookTree);
  console.log("");
  console.log("GO GO PRODUCTION STATE");
  console.log(`Existing public assets (legacy tree): ${publicAssetsExist ? "present" : 0}`);
  console.log(`Existing manifest mappings: ${published.length}`);
  console.log(
    `Existing source/reference: ${existsSync(join(referencesDir(), `cfb27-offense-${slug}.json`)) ? `references/cfb27-offense-${slug}.json` : "none prior to this run"}`,
  );
  console.log(`Potential collision count: ${published.length}`);
  console.log("No publish yet.");
  console.log("");
}

function loadManifestEntriesForPlaybook(
  reference: ReturnType<typeof loadPlayArtReference>,
): PlayArtManifestRecord[] {
  if (!existsSync(GENERATED_MANIFEST_PATH)) {
    return [];
  }
  const manifest = JSON.parse(readFileSync(GENERATED_MANIFEST_PATH, "utf8")) as {
    entries: PlayArtManifestRecord[];
  };
  return manifest.entries.filter(
    (entry) =>
      entry.playbook.trim() === reference.playbook.trim() &&
      entry.game_version.trim().toLowerCase() === reference.gameVersion.toLowerCase() &&
      entry.side_of_ball.trim().toLowerCase() === reference.sideOfBall.toLowerCase(),
  );
}

function printRegressionSummary(
  reference: ReturnType<typeof loadPlayArtReference>,
  mapped: MappedPlayArt[],
  matchingReport: Awaited<ReturnType<typeof matchPlayArtVisually>>["matchingReport"] | null,
): void {
  const published = loadManifestEntriesForPlaybook(reference);
  const publishedKey = (formation: string, play: string) =>
    `${formation}\0${normalizePlayName(play)}`;
  const publishedMap = new Map<string, string>();
  const publishedByAsset = new Map<string, { formation: string; play: string }>();
  for (const entry of published) {
    publishedMap.set(
      publishedKey(entry.formation, entry.play_name),
      entry.asset_path,
    );
    publishedByAsset.set(entry.asset_id.toLowerCase(), {
      formation: entry.formation,
      play: normalizePlayName(entry.play_name),
    });
  }

  let recovered = 0;
  let mismatches = 0;
  let missingPublished = 0;

  for (const row of mapped) {
    const key = publishedKey(row.formation, row.playName);
    const publishedPath = publishedMap.get(key);
    if (!publishedPath) {
      missingPublished += 1;
      continue;
    }
    if (publishedPath === row.assetPath) {
      recovered += 1;
    } else {
      mismatches += 1;
    }
  }

  let wrongAutomaticPass = 0;
  let passRecovered = 0;
  if (matchingReport) {
    for (const formation of matchingReport.formations) {
      for (const a of formation.assignments) {
        if (a.status !== "PASS") continue;
        const mappedRow = mapped.find((m) => m.blockIndex === a.blockIndex);
        if (!mappedRow) continue;
        const publishedIdentity = publishedByAsset.get(mappedRow.assetId.toLowerCase());
        if (!publishedIdentity) {
          wrongAutomaticPass += 1;
          continue;
        }
        const playOk =
          publishedIdentity.play === normalizePlayName(a.playName) &&
          publishedIdentity.formation.trim() === a.formation.trim();
        if (playOk) passRecovered += 1;
        else wrongAutomaticPass += 1;
      }
    }
  }

  const rate = published.length === 0 ? 0 : recovered / published.length;
  console.log("");
  console.log(`${reference.playbook.toUpperCase()} REGRESSION (visual vs published manifest)`);
  console.log(`Published entries: ${published.length}`);
  console.log(`Visual mappings: ${mapped.length}`);
  console.log(`Same asset_path at same formation/play: ${recovered}`);
  console.log(`Asset path mismatches: ${mismatches}`);
  console.log(`Published entries without visual mapping: ${missingPublished}`);
  console.log(`Recovery rate: ${(rate * 100).toFixed(1)}%`);
  if (matchingReport) {
    console.log(`PASS recovered vs published identity: ${passRecovered}`);
    console.log(`WRONG automatic PASS: ${wrongAutomaticPass}`);
    console.log(`PASS/REVIEW/FAIL: ${matchingReport.passCount}/${matchingReport.reviewCount}/${matchingReport.failCount}`);
  }
  console.log("");
}

async function main(): Promise<void> {
  const args = await parseArgs(process.argv.slice(2));
  const reference = loadPlayArtReference(args.referencePath);
  const slug = referenceSlug(reference);
  const usingVideoStaging = Boolean(args.videoStagingPath);

  if (args.structureReport) {
    const summary = await summarizeDocxStructure(args.sourcePath, reference);
    console.log(JSON.stringify({ playbook: reference.playbook, ...summary }, null, 2));
    process.exit(0);
  }

  console.log(`Processing ${reference.playbook} (${reference.gameVersion}, ${reference.sideOfBall})`);
  console.log(`  Reference: ${args.referencePath}`);
  console.log(
    usingVideoStaging
      ? `  Source: video-staging ${args.videoStagingPath}`
      : `  Source: ${args.sourcePath}`,
  );
  console.log(`  Expected: ${reference.formations.length} formations, ${totalExpectedPlays(reference)} plays`);
  console.log(
    usingVideoStaging
      ? "  Identity: OBS game-capture OCR → exact catalog (visual diagnostic optional; no play-art:review)"
      : `  Mapping: ${args.positional ? "positional (legacy)" : "visual-v3.1 (V3 + geometry REVIEW resolver)"}`,
  );

  if (usingVideoStaging) {
    printGoGoProductionState(reference);
  }

  if (!args.regression) {
    clearStaging(slug);
  }

  let extracted: Awaited<ReturnType<typeof extractPlayArtDocx>>;
  let bridgeReport: VideoStagingBridgeReport | null = null;
  let obsVerification: ObsVisualVerificationReport | null = null;

  if (usingVideoStaging) {
    const adapted = adaptVideoStagingToExtracted(args.videoStagingPath, reference);
    printVideoStagingBridgeReport(adapted.bridgeReport);
    bridgeReport = adapted.bridgeReport;
    extracted = adapted.extracted as Awaited<ReturnType<typeof extractPlayArtDocx>>;

    mkdirSync(args.reportDir, { recursive: true });
    const provenancePath = join(args.reportDir, `${slug}-video-ingest-provenance.json`);
    writeFileSync(
      provenancePath,
      `${JSON.stringify(
        {
          sourceKind: "video-staging",
          identityAuthority: "obs-ocr-catalog",
          ...adapted.bridgeReport,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    console.log(`  Video ingest provenance: ${provenancePath}`);

    // Do not leave DOCX-style matcher reports that feed play-art:review.
    const legacyMatching = join(args.reportDir, `${slug}-matching.json`);
    if (existsSync(legacyMatching)) {
      unlinkSync(legacyMatching);
      console.log(`  Removed legacy matcher report (OBS does not use play-art:review): ${legacyMatching}`);
    }
    const legacyOcrVs = join(args.reportDir, `${slug}-ocr-vs-visual.json`);
    if (existsSync(legacyOcrVs)) {
      unlinkSync(legacyOcrVs);
    }
    const legacyVisualVerify = join(args.reportDir, `${slug}-obs-visual-verification.json`);
    if (existsSync(legacyVisualVerify)) {
      unlinkSync(legacyVisualVerify);
    }
  } else {
    extracted = await extractPlayArtDocx(args.sourcePath, reference);
  }

  const effectiveReference = extracted.effectiveReference ?? reference;
  if (
    extracted.structure.omittedFormations &&
    extracted.structure.omittedFormations.length > 0
  ) {
    console.log(
      `  Omitted ${extracted.structure.omittedFormations.length} optional formation(s) absent from DOCX`,
    );
  }
  console.log(
    usingVideoStaging
      ? `  Video staging cards: ${extracted.structure.generatedPlayCards} → OCR/catalog identity mappings`
      : `  Source strips: ${extracted.structure.embeddedImages} embedded ` +
          `(${extracted.structure.formationHeaders} headers, ${extracted.structure.playStrips} play strips) → ` +
          `${extracted.structure.generatedPlayCards} play cards`,
  );
  if (extracted.formationOcrAssignments) {
    mkdirSync(args.reportDir, { recursive: true });
    const ocrPath = join(args.reportDir, `${slug}-formation-ocr-assignments.json`);
    writeFileSync(
      ocrPath,
      `${JSON.stringify(
        {
          playbook: reference.playbook,
          stats: extracted.structure.formationOcr,
          assignments: extracted.formationOcrAssignments,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    console.log(`  Formation OCR assignments: ${ocrPath}`);
  }

  let mapped: MappedPlayArt[];
  let formationHeaders: number;
  let playCards: number;
  let matchingReportPath: string | null = null;
  let matchingReport: Awaited<ReturnType<typeof matchPlayArtVisually>>["matchingReport"] | null =
    null;
  let omittedCropCount = 0;
  let unfulfilledAllowanceByFormation = new Map<string, number>();

  if (usingVideoStaging && bridgeReport) {
    // OBS path: game-capture OCR/catalog is production identity.
    // External visual comparison is optional diagnostics only — never publish gate.
    mapped = attachObsBlockIndexes(
      mapObsCatalogIdentity({
        reference: effectiveReference,
        provenance: bridgeReport.provenance,
      }),
      extracted,
    );
    formationHeaders = effectiveReference.formations.length;
    playCards = mapped.length;

    if (args.obsVisualDiagnostic) {
      const seed = await loadSeedForReference(reference);
      obsVerification = await verifyObsVisualIdentity({
        reference: effectiveReference,
        seed,
        extracted,
        provenance: bridgeReport.provenance,
        mapped,
      });
      printObsVisualVerificationReport(obsVerification);
      mkdirSync(args.reportDir, { recursive: true });
      const verifyPath = join(args.reportDir, `${slug}-obs-visual-diagnostic.json`);
      writeFileSync(verifyPath, `${JSON.stringify(obsVerification, null, 2)}\n`, "utf8");
      console.log(`OBS visual diagnostic (informational): ${verifyPath}`);
    } else {
      console.log(
        "  OBS visual diagnostic: skipped (game capture is source of truth; " +
          "pass --obs-visual-diagnostic for optional external comparison)",
      );
    }
  } else if (args.positional) {
    const positional = mapPlayArtPositionally(effectiveReference, extracted);
    mapped = positional.mapped;
    formationHeaders = positional.formationHeaders;
    playCards = positional.playCards;
  } else {
    const seed = await loadSeedForReference(reference);
    const visual = await matchPlayArtVisually(effectiveReference, extracted, seed, {
      overridesPath: args.overridesPath,
      approveReview: args.approveReview,
      // Regression / explicit flag: measure pure visual path (trusted-hash would circularize USC).
      skipTrustedHash: args.skipTrustedHash || args.regression,
    });
    mapped = visual.mapped;
    formationHeaders = visual.formationHeaders;
    playCards = visual.playCards;
    matchingReport = visual.matchingReport;
    omittedCropCount = visual.omittedCropCount;
    unfulfilledAllowanceByFormation = visual.unfulfilledAllowanceByFormation;

    printMatchingSummary(matchingReport);
    printFormationMatchingReport(matchingReport);
    logReferenceDownloadSummary(visual.referenceDownloadStats);
    matchingReportPath = writeMatchingReport(matchingReport, args.reportDir, slug);
    console.log(`Matching report: ${matchingReportPath}`);

    if (matchingReport.status !== "pass" && !args.regression && !args.approveReview) {
      if (!args.validateOnly) {
        clearStaging(slug);
        console.error(
          "Pipeline aborted: visual matching not ready to publish. " +
            "Resolve REVIEW items via matching-overrides or fix FAIL matches.",
        );
        process.exit(1);
      }
      console.log(
        "Validate-only: matching has REVIEW/FAIL — reports written; publish skipped.",
      );
    }
  }

  const hashed = assignContentHashedAssets(effectiveReference, mapped, extracted.mediaFiles);
  mapped = hashed.mapped;
  const uniqueAssetCount = hashed.uniqueAssetCount;

  if (args.regression) {
    printRegressionSummary(effectiveReference, mapped, matchingReport);
    process.exit(0);
  }

  const report = validatePlayArtMapping(
    effectiveReference,
    mapped,
    formationHeaders,
    playCards,
    {
      omittedCropCount,
      unfulfilledAllowanceByFormation,
    },
  );

  mkdirSync(args.reportDir, { recursive: true });
  const reportFileName = `${displayNameToTeamSlug(reference.playbook)}-validation.json`;
  const reportPath = join(args.reportDir, reportFileName);
  const mergedReport = matchingReport
    ? mergeMatchingIntoValidationReport(report, matchingReport)
    : report;
  writeFileSync(reportPath, `${JSON.stringify(mergedReport, null, 2)}\n`, "utf8");

  printValidationSummary(report);
  console.log(`Validation report: ${reportPath}`);

  if (usingVideoStaging && bridgeReport) {
    const ns = resolveVideoStagingNamespace(args.videoStagingPath);
    const namespaceOk =
      ns.gameVersion === reference.gameVersion.toLowerCase() &&
      ns.side === reference.sideOfBall.toLowerCase() &&
      ns.playbookDisplayName.trim() === reference.playbook.trim();

    let missingSourceCards = 0;
    let missingArtCrops = 0;
    for (const prov of bridgeReport.provenance) {
      if (!existsSync(prov.sourceCardPath)) missingSourceCards += 1;
      if (!existsSync(prov.artCropPath)) missingArtCrops += 1;
    }

    const gate = evaluateObsPublishGate({
      namespaceOk,
      expectedIdentities: bridgeReport.expectedIdentities,
      normalizedInputs: bridgeReport.normalizedInputs,
      uniqueIdentities: bridgeReport.uniqueFormationPlayCandidates,
      duplicates:
        bridgeReport.uniqueFormationPlayCandidates === bridgeReport.expectedIdentities
          ? 0
          : Math.max(
              0,
              bridgeReport.normalizedInputs - bridgeReport.uniqueFormationPlayCandidates,
            ),
      unresolvedOcr: 0,
      catalogMismatches: 0,
      missingSourceCards: missingSourceCards + bridgeReport.missingInputs.length,
      missingArtCrops,
      structuralValidationPass: report.status === "pass",
    });
    console.log("");
    console.log("OBS PUBLISH GATE");
    console.log(`Namespace: ${ns.gameVersion.toUpperCase()} / ${ns.side === "offense" ? "Offense" : "Defense"} / ${ns.playbookDisplayName}`);
    console.log(`Catalog identities: ${bridgeReport.expectedIdentities}`);
    console.log(`Validated identities: ${bridgeReport.normalizedInputs}`);
    console.log(`Unique identities: ${bridgeReport.uniqueFormationPlayCandidates}`);
    console.log(`Missing: ${bridgeReport.missingInputs.length}`);
    console.log(`Duplicates: ${gate.failures.some((f) => f.startsWith("Duplicates")) ? "FAIL" : 0}`);
    console.log(`Source crops: ${bridgeReport.normalizedInputs - missingSourceCards}/${bridgeReport.normalizedInputs}`);
    console.log(`Production art crops: ${bridgeReport.normalizedInputs - missingArtCrops}/${bridgeReport.normalizedInputs}`);
    console.log(`Structural validation: ${report.status === "pass" ? "PASS" : "FAIL"}`);
    if (obsVerification) {
      console.log(
        `Visual diagnostic disagreements: ${obsVerification.visualDisagreement} informational`,
      );
    } else {
      console.log("Visual diagnostic disagreements: skipped (informational only when enabled)");
    }
    if (gate.ready) {
      console.log("Publish gate: PASS — READY TO PUBLISH (not auto-published)");
    } else {
      console.log("Publish gate: FAIL");
      for (const failure of gate.failures) {
        console.log(`  - ${failure}`);
      }
      console.log("Do not run play-art:review. Fix source prep and rerun ingest validation.");
    }
    const gatePath = join(args.reportDir, `${slug}-obs-publish-gate.json`);
    writeFileSync(
      gatePath,
      `${JSON.stringify(
        {
          ...gate,
          namespaceOk,
          identityAuthority: "obs-game-capture-ocr-catalog",
          visualAffectsPublish: false,
          bridge: {
            expectedIdentities: bridgeReport.expectedIdentities,
            normalizedInputs: bridgeReport.normalizedInputs,
            uniqueIdentities: bridgeReport.uniqueFormationPlayCandidates,
            missingInputs: bridgeReport.missingInputs.length,
            missingSourceCards,
            missingArtCrops,
          },
          visualDiagnostic: obsVerification
            ? {
                visualAgreement: obsVerification.visualAgreement,
                visualDisagreement: obsVerification.visualDisagreement,
                visualUnavailable: obsVerification.visualUnavailable,
                informationalOnly: true,
              }
            : null,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    console.log(`Publish gate report: ${gatePath}`);

    if (!gate.ready) {
      if (!args.validateOnly) {
        clearStaging(slug);
        console.error("Pipeline aborted: OBS publish gate failed. Published assets unchanged.");
      }
      process.exit(1);
    }
  }

  if (report.status === "fail" && !args.validateOnly) {
    clearStaging(slug);
    console.error("Pipeline aborted: validation failed. Published assets and manifest were not modified.");
    process.exit(1);
  }

  if (args.validateOnly) {
    console.log(
      `Validate-only mode: ${mapped.length} logical mappings → ${uniqueAssetCount} unique physical assets ` +
        `(${mapped.length - uniqueAssetCount} duplicates eliminated). Skipping publish.`,
    );
    if (usingVideoStaging) {
      console.log("Production changes: NONE");
      console.log(
        "OBS identity path complete — game capture is source of truth; no play-art:review queue.",
      );
    }
    process.exit(0);
  }

  const staged = writeMappedAssetsToStaging(slug, mapped, extracted.mediaFiles);
  const records = manifestRecordsFromMapped(reference, mapped);
  const manifest = mergeManifestForPlaybook(reference, records);
  writeManifestToStaging(slug, manifest);

  const published = publishStaging(slug, reference, manifest);

  console.log(
    `Published ${published.uniqueAssetCount} unique assets ` +
      `(${records.length} logical mappings, ${records.length - published.uniqueAssetCount} duplicates eliminated)`,
  );
  console.log(`  Public root: ${published.publicRoot}`);
  if (published.removedLegacyRoot) {
    console.log(`  Removed legacy playbook tree: ${published.removedLegacyRoot}`);
  }
  console.log(`Manifest: ${published.manifestPath} (${records.length} entries for ${reference.playbook})`);
  console.log(`Staged unique writes: ${staged.uniqueAssetCount}`);
  console.log("Done.");
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exit(1);
});
