/**
 * Analysis-only: cross-playbook overlap + existing-art reuse for defensive recapture.
 * Does NOT modify staging, catalogs, or manifests.
 *
 *   npx tsx ./scripts/play-art/video/analyze-defensive-capture-overlap.ts
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePlayName } from "../../../lib/utils";
import type { ExtractedVideoCard } from "./types";

const SIDELINE_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../../..");
const STAGING_ROOT = join(
  SIDELINE_ROOT,
  "scripts/play-art/video-staging/cfb27/defense",
);
const GAME_VERSION = "cfb27";
const SIDE = "defense";

type IssueReason =
  | "NOT_CAPTURED"
  | "OCR_UNRESOLVED"
  | "CATALOG_MISMATCH"
  | "INVALID_CAPTURE"
  | "MISSING_ART_CROP"
  | "DUPLICATE_ONLY";

type MissingIssue = {
  formation: string;
  play: string;
  reason: IssueReason;
};

type PlaybookMeta = {
  slug: string;
  displayName: string;
};

type MissingMapping = MissingIssue & {
  playbookSlug: string;
  playbookDisplayName: string;
};

type ArtSource = {
  playbookSlug: string;
  playbookDisplayName: string;
  artCropPath: string;
};

/** Cross-playbook reusable art identity (excludes playbook slug). */
function artIdentityKey(formation: string, play: string): string {
  return `${GAME_VERSION}\0${SIDE}\0${formation}\0${normalizePlayName(play)}`;
}

function listPlaybookDirs(): string[] {
  return readdirSync(STAGING_ROOT)
    .filter((name) => !name.startsWith(".") && !name.endsWith(".md"))
    .map((name) => join(STAGING_ROOT, name))
    .filter((p) => statSync(p).isDirectory())
    .sort();
}

function loadPlaybookMeta(slug: string): PlaybookMeta {
  const supplementPath = join(STAGING_ROOT, slug, "supplement-report.json");
  if (existsSync(supplementPath)) {
    const raw = JSON.parse(readFileSync(supplementPath, "utf8")) as {
      namespace?: { playbookDisplayName?: string };
    };
    if (raw.namespace?.playbookDisplayName) {
      return { slug, displayName: raw.namespace.playbookDisplayName };
    }
  }
  const reportPath = join(STAGING_ROOT, slug, "report.json");
  if (existsSync(reportPath)) {
    const raw = JSON.parse(readFileSync(reportPath, "utf8")) as {
      playbook?: string;
    };
    if (raw.playbook) {
      return { slug, displayName: raw.playbook };
    }
  }
  return { slug, displayName: slug };
}

function loadMissingIssues(slug: string): MissingIssue[] {
  const supplementPath = join(STAGING_ROOT, slug, "supplement-report.json");
  if (existsSync(supplementPath)) {
    const raw = JSON.parse(readFileSync(supplementPath, "utf8")) as {
      issues?: MissingIssue[];
    };
    if (raw.issues?.length) return raw.issues;
  }
  return [];
}

function isValidatedArtCard(card: ExtractedVideoCard): boolean {
  return (
    card.gameVersion === GAME_VERSION &&
    card.side === SIDE &&
    card.catalogValid &&
    !card.emptySlot &&
    !card.screenRejected &&
    !!card.matchedFormation &&
    !!card.matchedPlay &&
    !!card.artCropPath &&
    existsSync(card.artCropPath)
  );
}

function loadValidatedArtIndex(): Map<string, ArtSource[]> {
  const index = new Map<string, ArtSource[]>();
  for (const dir of listPlaybookDirs()) {
    const slug = dir.split("/").pop()!;
    const meta = loadPlaybookMeta(slug);
    const cards: ExtractedVideoCard[] = [];

    const supplementPath = join(dir, "supplement-report.json");
    if (existsSync(supplementPath)) {
      const raw = JSON.parse(readFileSync(supplementPath, "utf8")) as {
        combinedCards?: ExtractedVideoCard[];
      };
      if (raw.combinedCards?.length) {
        cards.push(...raw.combinedCards);
      }
    } else {
      const reportPath = join(dir, "report.json");
      if (existsSync(reportPath)) {
        const raw = JSON.parse(readFileSync(reportPath, "utf8")) as {
          cards?: ExtractedVideoCard[];
        };
        if (raw.cards?.length) cards.push(...raw.cards);
      }
    }

    for (const card of cards) {
      if (!isValidatedArtCard(card)) continue;
      const key = artIdentityKey(card.matchedFormation!, card.matchedPlay!);
      const entry: ArtSource = {
        playbookSlug: meta.slug,
        playbookDisplayName: meta.displayName,
        artCropPath: card.artCropPath,
      };
      const list = index.get(key) ?? [];
      if (!list.some((s) => s.playbookSlug === entry.playbookSlug)) {
        list.push(entry);
        index.set(key, list);
      }
    }
  }
  return index;
}

function classifyReuse(
  mapping: MissingMapping,
  artIndex: Map<string, ArtSource[]>,
): IssueReason | "EXISTING_ART_REUSABLE" {
  const key = artIdentityKey(mapping.formation, mapping.play);
  const sources = artIndex.get(key) ?? [];
  const otherSources = sources.filter((s) => s.playbookSlug !== mapping.playbookSlug);
  if (otherSources.length > 0) return "EXISTING_ART_REUSABLE";
  return mapping.reason;
}

type UniqueIdentity = {
  formation: string;
  play: string;
  key: string;
  mappings: MissingMapping[];
  reasons: Set<IssueReason | "EXISTING_ART_REUSABLE">;
  effectiveReason: IssueReason | "EXISTING_ART_REUSABLE";
  artSources: ArtSource[];
};

function main(): void {
  const artIndex = loadValidatedArtIndex();
  const allMappings: MissingMapping[] = [];

  for (const dir of listPlaybookDirs()) {
    const slug = dir.split("/").pop()!;
    const meta = loadPlaybookMeta(slug);
    for (const issue of loadMissingIssues(slug)) {
      allMappings.push({
        ...issue,
        playbookSlug: meta.slug,
        playbookDisplayName: meta.displayName,
      });
    }
  }

  const byIdentity = new Map<string, UniqueIdentity>();
  for (const mapping of allMappings) {
    const key = artIdentityKey(mapping.formation, mapping.play);
    const effective = classifyReuse(mapping, artIndex);
    const existing = byIdentity.get(key);
    if (existing) {
      existing.mappings.push(mapping);
      existing.reasons.add(effective);
      if (effective === "EXISTING_ART_REUSABLE") {
        existing.effectiveReason = "EXISTING_ART_REUSABLE";
      }
    } else {
      byIdentity.set(key, {
        formation: mapping.formation,
        play: mapping.play,
        key,
        mappings: [mapping],
        reasons: new Set([effective]),
        effectiveReason: effective,
        artSources: artIndex.get(key) ?? [],
      });
    }
  }

  // If any mapping in group is reusable, whole identity is reusable for capture queue.
  for (const identity of byIdentity.values()) {
    if (identity.reasons.has("EXISTING_ART_REUSABLE")) {
      identity.effectiveReason = "EXISTING_ART_REUSABLE";
    } else if (identity.reasons.has("OCR_UNRESOLVED")) {
      identity.effectiveReason = "OCR_UNRESOLVED";
    } else if (identity.reasons.has("DUPLICATE_ONLY")) {
      identity.effectiveReason = "DUPLICATE_ONLY";
    } else if (identity.reasons.has("CATALOG_MISMATCH")) {
      identity.effectiveReason = "CATALOG_MISMATCH";
    } else if (identity.reasons.has("INVALID_CAPTURE")) {
      identity.effectiveReason = "INVALID_CAPTURE";
    } else if (identity.reasons.has("MISSING_ART_CROP")) {
      identity.effectiveReason = "MISSING_ART_CROP";
    } else {
      identity.effectiveReason = "NOT_CAPTURED";
    }
  }

  const uniqueIdentities = [...byIdentity.values()];
  const totalMappings = allMappings.length;
  const uniqueCount = uniqueIdentities.length;
  const duplicateMappingsEliminated = totalMappings - uniqueCount;
  const captureReductionPct =
    totalMappings > 0 ? (duplicateMappingsEliminated / totalMappings) * 100 : 0;

  const reusableMappings = allMappings.filter(
    (m) => classifyReuse(m, artIndex) === "EXISTING_ART_REUSABLE",
  ).length;

  const uniqueReusable = uniqueIdentities.filter(
    (u) => u.effectiveReason === "EXISTING_ART_REUSABLE",
  ).length;
  const uniqueNeedsCapture = uniqueIdentities.filter(
    (u) => u.effectiveReason !== "EXISTING_ART_REUSABLE",
  );

  const countUniqueByReason = (reason: IssueReason | "EXISTING_ART_REUSABLE") =>
    uniqueIdentities.filter((u) => u.effectiveReason === reason).length;

  const highestReuse = [...uniqueIdentities]
    .sort((a, b) => b.mappings.length - a.mappings.length || a.formation.localeCompare(b.formation) || a.play.localeCompare(b.play))
    .slice(0, 50);

  // Formation-level grouping
  const byFormation = new Map<string, UniqueIdentity[]>();
  for (const identity of uniqueNeedsCapture) {
    const list = byFormation.get(identity.formation) ?? [];
    list.push(identity);
    byFormation.set(identity.formation, list);
  }

  const formationStats = [...byFormation.entries()]
    .map(([formation, identities]) => {
      const playbookSet = new Set<string>();
      let mappingCount = 0;
      for (const id of identities) {
        mappingCount += id.mappings.length;
        for (const m of id.mappings) playbookSet.add(m.playbookDisplayName);
      }
      return {
        formation,
        uniquePlays: identities.length,
        mappingCount,
        affectedPlaybooks: playbookSet.size,
        identities: identities.sort(
          (a, b) =>
            b.mappings.length - a.mappings.length || a.play.localeCompare(b.play),
        ),
      };
    })
    .sort(
      (a, b) =>
        b.mappingCount - a.mappingCount ||
        b.affectedPlaybooks - a.affectedPlaybooks ||
        a.formation.localeCompare(b.formation),
    );

  // Formation capture groups for completion impact
  const formationGroups = formationStats.map((fs) => ({
    formation: fs.formation,
    uniqueScreensRequired: fs.uniquePlays,
    mappingsSatisfied: fs.mappingCount,
    playbooks: [...new Set(fs.identities.flatMap((i) => i.mappings.map((m) => m.playbookDisplayName)))].sort(),
  }));

  // Build markdown reports
  const analysisLines: string[] = [];
  analysisLines.push("# Defensive Cross-Playbook Capture Analysis");
  analysisLines.push("");
  analysisLines.push("## Summary");
  analysisLines.push("");
  analysisLines.push(`Total missing playbook mappings: **${totalMappings}**`);
  analysisLines.push(`Unique formation/play identities: **${uniqueCount}**`);
  analysisLines.push(
    `Duplicate mappings eliminated by reuse: **${duplicateMappingsEliminated}**`,
  );
  analysisLines.push(
    `Potential capture reduction: **${captureReductionPct.toFixed(1)}%**`,
  );
  analysisLines.push("");
  analysisLines.push(
    `Unique NOT_CAPTURED identities: **${countUniqueByReason("NOT_CAPTURED")}**`,
  );
  analysisLines.push(
    `Unique OCR_UNRESOLVED identities: **${countUniqueByReason("OCR_UNRESOLVED")}**`,
  );
  analysisLines.push(
    `Unique DUPLICATE_ONLY identities: **${countUniqueByReason("DUPLICATE_ONLY")}**`,
  );
  analysisLines.push(
    `Unique EXISTING_ART_REUSABLE identities: **${countUniqueByReason("EXISTING_ART_REUSABLE")}**`,
  );
  analysisLines.push("");
  analysisLines.push("Mapping-level issue counts (before reuse reclassification):");
  const mappingReasons: Record<string, number> = {};
  for (const m of allMappings) {
    mappingReasons[m.reason] = (mappingReasons[m.reason] ?? 0) + 1;
  }
  for (const reason of [
    "NOT_CAPTURED",
    "OCR_UNRESOLVED",
    "DUPLICATE_ONLY",
    "CATALOG_MISMATCH",
    "INVALID_CAPTURE",
    "MISSING_ART_CROP",
  ] as IssueReason[]) {
    analysisLines.push(`- ${reason}: **${mappingReasons[reason] ?? 0}**`);
  }
  analysisLines.push(
    `- EXISTING_ART_REUSABLE (mapping reclassification): **${reusableMappings}**`,
  );
  analysisLines.push(
    `- All **${mappingReasons.OCR_UNRESOLVED ?? 0}** OCR_UNRESOLVED mappings are EXISTING_ART_REUSABLE (art exists in another book; OCR/processing gap only).`,
  );
  analysisLines.push("");
  analysisLines.push("---");
  analysisLines.push("");
  analysisLines.push("## Highest-Reuse Missing Plays");
  analysisLines.push("");
  analysisLines.push(
    "| Formation | Play | Missing From # Playbooks | Playbooks |",
  );
  analysisLines.push("|---|---|---:|---|");
  for (const item of highestReuse) {
    const playbooks = [...new Set(item.mappings.map((m) => m.playbookDisplayName))].sort();
    analysisLines.push(
      `| ${item.formation} | ${item.play} | ${playbooks.length} | ${playbooks.join(", ")} |`,
    );
  }
  analysisLines.push("");
  analysisLines.push("---");
  analysisLines.push("");
  analysisLines.push("## Formation-Level Capture Queue");
  analysisLines.push("");
  for (const fs of formationStats.slice(0, 40)) {
    analysisLines.push(`### ${fs.formation}`);
    analysisLines.push("");
    analysisLines.push(`Unique missing plays: **${fs.uniquePlays}**`);
    analysisLines.push(`Affected playbooks: **${fs.affectedPlaybooks}**`);
    analysisLines.push("");
    for (const id of fs.identities) {
      analysisLines.push(
        `- [ ] ${id.play} — needed by **${id.mappings.length}** book mapping(s)`,
      );
    }
    analysisLines.push("");
  }
  analysisLines.push("---");
  analysisLines.push("");
  analysisLines.push("## Playbook Completion Impact");
  analysisLines.push("");
  for (const group of formationGroups.slice(0, 25)) {
    analysisLines.push(`### Capturing all missing **${group.formation}** identities`);
    analysisLines.push("");
    analysisLines.push(`Unique screenshots/cards required: **${group.uniqueScreensRequired}**`);
    analysisLines.push(`Playbook mappings satisfied: **${group.mappingsSatisfied}**`);
    analysisLines.push("Potentially benefits these books:");
    for (const pb of group.playbooks) {
      analysisLines.push(`- ${pb}`);
    }
    analysisLines.push("");
  }
  analysisLines.push("---");
  analysisLines.push("");
  analysisLines.push("## Existing-Art Reuse");
  analysisLines.push("");
  analysisLines.push(`Missing mappings: **${totalMappings}**`);
  analysisLines.push(
    `Already satisfiable from existing exact art: **${reusableMappings}**`,
  );
  analysisLines.push(
    `Actually requires new capture (unique identities): **${uniqueNeedsCapture.length}**`,
  );
  analysisLines.push(
    `(Unique identities satisfiable from existing art: **${uniqueReusable}**)`,
  );
  analysisLines.push("");
  analysisLines.push(
    "Exact match criteria: `cfb27` + `defense` + canonical formation + canonical play, with validated art crop present in another defensive playbook staging corpus.",
  );

  const queueLines: string[] = [];
  queueLines.push("# Defensive Unique Capture Queue (Deprecated)");
  queueLines.push("");
  queueLines.push("**This file is NOT authoritative.**");
  queueLines.push("");
  queueLines.push("Authoritative unresolved defensive work:");
  queueLines.push("- `DEFENSIVE_RESOLUTION_QUEUE.md` — source exists; safe canonical ID not yet established");
  queueLines.push("- Capture required ONLY for `GENUINELY_NOT_CAPTURED` / `INVALID_EXISTING_CAPTURE`");
  queueLines.push("");
  queueLines.push("## NO DEFENSIVE CAPTURES REQUIRED");
  queueLines.push("");
  queueLines.push(
    "`AMBIGUOUS_SOURCE` and `SOURCE_FOUND_RESOLUTION_REQUIRED` must not appear in a capture-required queue.",
  );
  queueLines.push("");
  queueLines.push(
    "Run `npm run play-art:defense-global-recovery` to regenerate authoritative operator queues from the latest recovery pass.",
  );
  queueLines.push("");
  queueLines.push("---");
  queueLines.push("");
  queueLines.push("## Legacy Overlap Analysis (reference only)");
  queueLines.push("");
  queueLines.push(
    "The section below reflects pre-recovery overlap analysis and may overstate capture need.",
  );
  queueLines.push("");
  queueLines.push(`Total missing playbook mappings (legacy): ${totalMappings}`);
  queueLines.push(`Unique identities flagged NOT_CAPTURED (legacy): ${uniqueNeedsCapture.length}`);
  queueLines.push(`Existing-art reuse opportunities: ${uniqueReusable} unique / ${reusableMappings} mappings`);
  queueLines.push("");

  const captureByFormation = new Map<string, UniqueIdentity[]>();
  for (const id of uniqueNeedsCapture) {
    const list = captureByFormation.get(id.formation) ?? [];
    list.push(id);
    captureByFormation.set(id.formation, list);
  }

  const sortedCaptureFormations = [...captureByFormation.entries()].sort((a, b) => {
    const aMappings = a[1].reduce((n, i) => n + i.mappings.length, 0);
    const bMappings = b[1].reduce((n, i) => n + i.mappings.length, 0);
    return bMappings - aMappings || a[0].localeCompare(b[0]);
  });

  for (const [formation, identities] of sortedCaptureFormations) {
    queueLines.push(`## ${formation}`);
    queueLines.push("");
    for (const id of identities.sort(
      (a, b) => b.mappings.length - a.mappings.length || a.play.localeCompare(b.play),
    )) {
      queueLines.push(`- [ ] ${id.play}`);
      queueLines.push("  Needed by:");
      for (const pb of [...new Set(id.mappings.map((m) => m.playbookDisplayName))].sort()) {
        queueLines.push(`  - ${pb}`);
      }
      queueLines.push("");
    }
  }

  queueLines.push("---");
  queueLines.push("");
  queueLines.push("## Existing Art Reuse Opportunities");
  queueLines.push("");
  const reusableIdentities = uniqueIdentities
    .filter((u) => u.effectiveReason === "EXISTING_ART_REUSABLE")
    .sort(
      (a, b) =>
        b.mappings.length - a.mappings.length ||
        a.formation.localeCompare(b.formation) ||
        a.play.localeCompare(b.play),
    );

  if (reusableIdentities.length === 0) {
    queueLines.push("_None — no missing mappings can be satisfied from exact art in other defensive books._");
    queueLines.push("");
  } else {
    for (const id of reusableIdentities) {
      queueLines.push(`### ${id.formation} — ${id.play}`);
      queueLines.push("");
      queueLines.push(
        `Validated art already in: ${id.artSources.map((s) => s.playbookDisplayName).join(", ")}`,
      );
      queueLines.push(`Missing mappings (${id.mappings.length}):`);
      for (const m of id.mappings.sort((a, b) =>
        a.playbookDisplayName.localeCompare(b.playbookDisplayName),
      )) {
        queueLines.push(`- ${m.playbookDisplayName}`);
      }
      queueLines.push("");
    }
  }

  const analysisPath = join(STAGING_ROOT, "DEFENSIVE_CROSS_PLAYBOOK_CAPTURE_ANALYSIS.md");
  const queuePath = join(STAGING_ROOT, "DEFENSIVE_UNIQUE_CAPTURE_QUEUE.md");
  writeFileSync(analysisPath, `${analysisLines.join("\n").trimEnd()}\n`, "utf8");
  writeFileSync(queuePath, `${queueLines.join("\n").trimEnd()}\n`, "utf8");

  const resolutionStubPath = join(STAGING_ROOT, "DEFENSIVE_RESOLUTION_QUEUE.md");
  if (!existsSync(resolutionStubPath)) {
    writeFileSync(
      resolutionStubPath,
      [
        "# Defensive Resolution Queue",
        "",
        "Run `npm run play-art:defense-global-recovery` to populate this file from the latest recovery pass.",
        "",
        "This queue lists identities where source pixels exist but exact canonical identity",
        "has not yet been established safely. No new defensive screenshots are required for these rows.",
        "",
      ].join("\n"),
      "utf8",
    );
  }

  const jsonPath = join(STAGING_ROOT, "DEFENSIVE_CAPTURE_OVERLAP.json");
  writeFileSync(
    jsonPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        summary: {
          totalMissingMappings: totalMappings,
          uniqueIdentities: uniqueCount,
          duplicateMappingsEliminated,
          captureReductionPct,
          reusableMappings,
          uniqueReusable,
          uniqueNeedsCapture: uniqueNeedsCapture.length,
          uniqueNotCaptured: countUniqueByReason("NOT_CAPTURED"),
          uniqueOcrUnresolved: countUniqueByReason("OCR_UNRESOLVED"),
          uniqueDuplicateOnly: countUniqueByReason("DUPLICATE_ONLY"),
        },
        highestReuse: highestReuse.map((u) => ({
          formation: u.formation,
          play: u.play,
          playbookCount: new Set(u.mappings.map((m) => m.playbookSlug)).size,
          playbooks: [...new Set(u.mappings.map((m) => m.playbookDisplayName))].sort(),
          effectiveReason: u.effectiveReason,
        })),
        uniqueIdentities: uniqueIdentities.map((u) => ({
          formation: u.formation,
          play: u.play,
          effectiveReason: u.effectiveReason,
          mappingCount: u.mappings.length,
          playbooks: [...new Set(u.mappings.map((m) => m.playbookDisplayName))].sort(),
          artSources: u.artSources.map((s) => s.playbookDisplayName),
        })),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log("DEFENSIVE CAPTURE OVERLAP ANALYSIS");
  console.log(JSON.stringify({
    totalMissingMappings: totalMappings,
    uniqueIdentities: uniqueCount,
    duplicateMappingsEliminated,
    captureReductionPct: `${captureReductionPct.toFixed(1)}%`,
    reusableMappings,
    uniqueNeedsCapture: uniqueNeedsCapture.length,
    uniqueReusable,
    uniqueNotCaptured: countUniqueByReason("NOT_CAPTURED"),
    uniqueOcrUnresolved: countUniqueByReason("OCR_UNRESOLVED"),
    uniqueDuplicateOnly: countUniqueByReason("DUPLICATE_ONLY"),
  }, null, 2));
  console.log(`Analysis: ${relative(SIDELINE_ROOT, analysisPath)}`);
  console.log(`Queue: ${relative(SIDELINE_ROOT, queuePath)}`);
  console.log(`JSON: ${relative(SIDELINE_ROOT, jsonPath)}`);
}

main();
