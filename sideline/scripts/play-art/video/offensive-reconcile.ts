/**
 * Full offensive reconciliation: coverage, exception classification, operator queues.
 * Diagnostic only — does not publish.
 *
 *   NODE_PATH=./node_modules npx tsx ./scripts/play-art/video/offensive-reconcile.ts
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { importSeedModule, referenceFromSeed } from "../build-reference";
import { teamSlugToSeedSlug } from "../lib/slug-utils";
import {
  buildFormationCoverage,
  buildRecaptureQueue,
} from "./formation-coverage";
import { compareToCatalog } from "./ocr-and-catalog";
import type { ExtractedVideoCard, VideoSideOfBall } from "./types";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PLAY_ART_ROOT = join(__dirname, "..");
const STAGING_OFFENSE = join(PLAY_ART_ROOT, "video-staging/cfb27/offense");
const OFFENSE_ROOT = join(STAGING_OFFENSE, "..");
const REPORT_DIR = join(STAGING_OFFENSE);

type ExceptionReason =
  | "NOT_CAPTURED"
  | "OCR_UNRESOLVED"
  | "CATALOG_MISMATCH"
  | "INVALID_CAPTURE"
  | "MISSING_ART_CROP"
  | "DUPLICATE_ONLY";

type PlayException = {
  playbook: string;
  playbookSlug: string;
  formation: string;
  play: string;
  reason: ExceptionReason;
  source: string;
  rawOcr: string;
  normalizedOcr: string;
  catalogCandidate: string;
};

type BookRow = {
  playbook: string;
  slug: string;
  expected: number;
  validated: number;
  missing: number;
  coveragePct: number;
  status: "READY_TO_PUBLISH" | "NEEDS_SUPPLEMENTS" | "FAILED";
  failureReason: string | null;
};

const DISPLAY: Record<string, string> = {
  "san-diego-state": "San Diego State",
  "south-alabama": "South Alabama",
  "south-florida": "South Florida",
  tcu: "TCU",
  ucf: "UCF",
  uconn: "UConn",
  "ul-monroe": "UL Monroe",
  unlv: "UNLV",
  utep: "UTEP",
  utsa: "UTSA",
  "wake-forest": "Wake Forest",
  "western-michigan": "Western Michigan",
  spread: "Spread",
};

const ORIGINAL_CAPTURE_26: Array<{ slug: string; formation: string; play: string }> = [
  { slug: "san-diego-state", formation: "Gun Wide", play: "HB QUICK BASE" },
  { slug: "south-alabama", formation: "Gun Flex Y Off", play: "0 1 TRAP" },
  { slug: "south-alabama", formation: "Gun Stack Y Off Wk", play: "FAKE SCREEN GO" },
  { slug: "south-alabama", formation: "Gun Stack Y Off Wk", play: "PA JAILBREAK SCREEN" },
  { slug: "south-alabama", formation: "Gun Stack Y Off Wk", play: "RPO TRAP ALERT SCREEN" },
  { slug: "south-alabama", formation: "Gun Trips TE Offset Wk", play: "FLOOD DIVIDE" },
  { slug: "spread", formation: "Gun Box", play: "QUADS RPO ALERT QB DRAW" },
  { slug: "tcu", formation: "Gun Spread Flex", play: "617" },
  { slug: "tcu", formation: "Gun Spread Flex", play: "SMASH CORNERS" },
  { slug: "ucf", formation: "Goal Line Normal", play: "FB DIVE WEAK" },
  { slug: "ucf", formation: "Goal Line Normal", play: "HB STING" },
  { slug: "ucf", formation: "Goal Line Normal", play: "PA POWER O" },
  { slug: "ucf", formation: "Goal Line Normal", play: "PA WAGGLE" },
  { slug: "ucf", formation: "Goal Line Normal", play: "POWER O" },
  { slug: "ucf", formation: "Goal Line Normal", play: "STRONG TOSS" },
  { slug: "uconn", formation: "Goal Line Normal", play: "HB COUNTER WK" },
  { slug: "uconn", formation: "Goal Line Normal", play: "HB SPLIT 0" },
  { slug: "uconn", formation: "Goal Line Normal", play: "PA SPRINT HB FLAT" },
  { slug: "unlv", formation: "Gun Trips Y Slot Str", play: "FOUR VERTICALS" },
  { slug: "unlv", formation: "Gun Trips Y Slot Str", play: "QUICK SLANTS" },
  { slug: "unlv", formation: "Gun Trips Y Slot Str", play: "SLOT 2 BUC" },
  { slug: "utep", formation: "Goal Line Normal", play: "FB DIVE WEAK" },
  { slug: "utep", formation: "Gun Normal Y Off Wk", play: "ALL GO" },
  { slug: "utep", formation: "Gun Normal Y Off Wk", play: "RPO READ BUBBLE" },
  { slug: "utep", formation: "Gun Normal Y Off Wk", play: "WR UNDER" },
  { slug: "wake-forest", formation: "Goal Line Normal", play: "FB DIVE WEAK" },
];

function normalizeOcr(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return "";
  return raw.trim().toUpperCase();
}

function loadCombinedCards(slug: string): ExtractedVideoCard[] {
  const stagingRoot = join(STAGING_OFFENSE, slug);
  const supplementPath = join(stagingRoot, "supplement-report.json");
  const videoPath = join(stagingRoot, "report.json");

  let videoCards: ExtractedVideoCard[] = [];
  if (existsSync(videoPath)) {
    const videoReport = JSON.parse(readFileSync(videoPath, "utf8")) as {
      cards?: ExtractedVideoCard[];
    };
    videoCards = videoReport.cards ?? [];
  }

  if (!existsSync(supplementPath)) {
    return videoCards;
  }

  const supplement = JSON.parse(readFileSync(supplementPath, "utf8")) as {
    combinedCards?: ExtractedVideoCard[];
    videoOnlyCards?: ExtractedVideoCard[];
    cards?: ExtractedVideoCard[];
  };

  if (supplement.combinedCards?.length) return supplement.combinedCards;

  const recovered = (supplement.cards ?? []).filter(
    (c) => c.supplementClass === "NEW_MISSING_PLAY" && c.catalogValid,
  );
  return [...videoCards, ...recovered];
}

function allObservedCards(slug: string): ExtractedVideoCard[] {
  const stagingRoot = join(STAGING_OFFENSE, slug);
  const out: ExtractedVideoCard[] = [];
  const videoPath = join(stagingRoot, "report.json");
  if (existsSync(videoPath)) {
    const videoReport = JSON.parse(readFileSync(videoPath, "utf8")) as {
      cards?: ExtractedVideoCard[];
    };
    out.push(...(videoReport.cards ?? []));
  }
  const supplementPath = join(stagingRoot, "supplement-report.json");
  if (existsSync(supplementPath)) {
    const supplement = JSON.parse(readFileSync(supplementPath, "utf8")) as {
      cards?: ExtractedVideoCard[];
    };
    out.push(...(supplement.cards ?? []));
  }
  return out;
}

function structuralOk(cards: ExtractedVideoCard[]): boolean {
  const canonical = cards.filter(
    (c) => c.catalogValid && !c.emptySlot && !c.screenRejected,
  );
  if (canonical.length === 0) return true;
  for (const card of canonical) {
    if (!card.artCropPath || !existsSync(card.artCropPath)) return false;
    if (!card.sourceCardPath || !existsSync(card.sourceCardPath)) return false;
  }
  return true;
}

function classifyMissingPlay(
  slug: string,
  formation: string,
  play: string,
  observed: ExtractedVideoCard[],
): PlayException {
  const playbook = DISPLAY[slug] ?? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const formationCards = observed.filter(
    (c) =>
      !c.emptySlot &&
      !c.screenRejected &&
      c.matchedFormation === formation,
  );

  // Cards that explicitly matched a different catalog play in this formation.
  const mismatches = formationCards.filter(
    (c) =>
      c.matchedPlay &&
      c.matchedPlay !== play &&
      c.playNameOcr &&
      c.playMatchConfidence !== "skipped",
  );

  const invalid = formationCards.filter(
    (c) => c.supplementClass === "INVALID_SCREEN" || c.rejectReason,
  );

  const unresolved = formationCards.filter(
    (c) =>
      !c.catalogValid &&
      (c.supplementClass === "OCR_UNRESOLVED" ||
        c.playMatchConfidence === "none" ||
        c.playMatchConfidence === "skipped" ||
        !c.playNameOcr),
  );

  const dupOnly = formationCards.filter(
    (c) => c.supplementClass === "DUPLICATE_EXISTING",
  );

  const validHit = formationCards.find(
    (c) => c.catalogValid && c.matchedPlay === play,
  );
  if (validHit && (!validHit.artCropPath || !existsSync(validHit.artCropPath))) {
    return {
      playbook,
      playbookSlug: slug,
      formation,
      play,
      reason: "MISSING_ART_CROP",
      source: validHit.videoFile ?? validHit.sourceFile ?? "",
      rawOcr: validHit.playNameOcrRaw ?? validHit.playNameOcr ?? "",
      normalizedOcr: normalizeOcr(validHit.playNameOcr),
      catalogCandidate: validHit.matchedPlay ?? "",
    };
  }

  let reason: ExceptionReason = "NOT_CAPTURED";
  let best: ExtractedVideoCard | null = null;

  if (invalid.length > 0) {
    reason = "INVALID_CAPTURE";
    best = invalid[0];
  } else if (unresolved.length > 0) {
    reason = "OCR_UNRESOLVED";
    best = unresolved[0];
  } else if (mismatches.length > 0) {
    reason = "CATALOG_MISMATCH";
    best = mismatches[0];
  } else if (dupOnly.length > 0 && formationCards.length === dupOnly.length) {
    reason = "DUPLICATE_ONLY";
    best = dupOnly[0];
  } else if (formationCards.length === 0) {
    reason = "NOT_CAPTURED";
  } else {
    // Formation has cards but none map to this play — processing gap if OCR present.
    const withOcr = formationCards.filter((c) => c.playNameOcr);
    if (withOcr.length > 0) {
      reason = "OCR_UNRESOLVED";
      best = withOcr[0];
    }
  }

  return {
    playbook,
    playbookSlug: slug,
    formation,
    play,
    reason,
    source: best?.videoFile ?? best?.sourceFile ?? "",
    rawOcr: best?.playNameOcrRaw ?? best?.playNameOcr ?? "",
    normalizedOcr: normalizeOcr(best?.playNameOcr ?? null),
    catalogCandidate: best?.matchedPlay ?? "",
  };
}

function discoverStagingSlugs(): string[] {
  if (!existsSync(STAGING_OFFENSE)) return [];
  return readdirSync(STAGING_OFFENSE)
    .filter((name) => {
      if (name.startsWith(".") || name.startsWith("_")) return false;
      const p = join(STAGING_OFFENSE, name);
      return statSync(p).isDirectory();
    })
    .sort();
}

async function main(): Promise<void> {
  const slugs = discoverStagingSlugs();
  const bookRows: BookRow[] = [];
  const allExceptions: PlayException[] = [];
  const captureQueue: PlayException[] = [];
  const processingQueue: PlayException[] = [];

  for (const slug of slugs) {
    const seedSlug = teamSlugToSeedSlug(slug, "cfb27");
    let reference;
    try {
      const seed = await importSeedModule(seedSlug);
      reference = referenceFromSeed(seed);
    } catch {
      bookRows.push({
        playbook: DISPLAY[slug] ?? slug,
        slug,
        expected: 0,
        validated: 0,
        missing: 0,
        coveragePct: 0,
        status: "FAILED",
        failureReason: `Missing seed ${seedSlug}`,
      });
      continue;
    }

    const combined = loadCombinedCards(slug);
    const observed = allObservedCards(slug);
    const catalog = compareToCatalog(reference, combined);
    const formationCoverage = buildFormationCoverage(reference, combined);
    const recaptureQueue = buildRecaptureQueue({
      playbook: slug,
      gameVersion: "cfb27",
      side: "offense" as VideoSideOfBall,
      formationCoverage,
    });

    const stagingRoot = join(STAGING_OFFENSE, slug);
    writeFileSync(
      join(stagingRoot, "recapture-queue.json"),
      `${JSON.stringify(recaptureQueue, null, 2)}\n`,
    );
    writeFileSync(
      join(stagingRoot, "combined-coverage.json"),
      `${JSON.stringify(
        {
          expected: catalog.expectedPlayCount,
          detected: catalog.detectedUniquePlays,
          pct: catalog.expectedPlayCount
            ? (catalog.detectedUniquePlays / catalog.expectedPlayCount) * 100
            : 0,
          missing: catalog.missingCatalogPlays.length,
          completeFormations: formationCoverage.filter((r) => r.status === "COMPLETE")
            .length,
          incompleteFormations: formationCoverage.filter((r) => r.status !== "COMPLETE")
            .length,
        },
        null,
        2,
      )}\n`,
    );

    let ocrUnresolved = 0;
    let catalogMismatch = 0;
    for (const card of combined) {
      if (card.emptySlot || card.screenRejected) continue;
      if (card.supplementClass === "DUPLICATE_EXISTING") continue;
      if (card.catalogValid) continue;
      if (
        !card.playNameOcr ||
        card.playMatchConfidence === "none" ||
        card.playMatchConfidence === "skipped"
      ) {
        ocrUnresolved += 1;
      } else {
        catalogMismatch += 1;
      }
    }

    const structOk = structuralOk(combined);
    let status: BookRow["status"] = "NEEDS_SUPPLEMENTS";
    let failureReason: string | null = null;
    if (!structOk) {
      status = "FAILED";
      failureReason = "Structural validation failed (missing art crops or source cards)";
    } else if (
      catalog.detectedUniquePlays === catalog.expectedPlayCount &&
      catalog.missingCatalogPlays.length === 0
    ) {
      status = "READY_TO_PUBLISH";
    }

    bookRows.push({
      playbook: DISPLAY[slug] ?? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      slug,
      expected: catalog.expectedPlayCount,
      validated: catalog.detectedUniquePlays,
      missing: catalog.missingCatalogPlays.length,
      coveragePct:
        catalog.expectedPlayCount > 0
          ? (catalog.detectedUniquePlays / catalog.expectedPlayCount) * 100
          : 0,
      status,
      failureReason,
    });

    for (const miss of catalog.missingCatalogPlays) {
      const ex = classifyMissingPlay(slug, miss.formation, miss.play, observed);
      allExceptions.push(ex);
      if (ex.reason === "NOT_CAPTURED" || ex.reason === "INVALID_CAPTURE") {
        captureQueue.push(ex);
      } else {
        processingQueue.push(ex);
      }
    }
  }

  // Original 26 capture reconciliation
  const captureResults = ORIGINAL_CAPTURE_26.map((item) => {
    const stillMissing = allExceptions.some(
      (e) =>
        e.playbookSlug === item.slug &&
        e.formation === item.formation &&
        e.play === item.play,
    );
    const ex = allExceptions.find(
      (e) =>
        e.playbookSlug === item.slug &&
        e.formation === item.formation &&
        e.play === item.play,
    );
    return {
      ...item,
      result: stillMissing ? (ex?.reason ?? "STILL_MISSING") : "CAPTURE_RESOLVED",
    };
  });

  const now = new Date().toISOString().slice(0, 16).replace("T", " ");
  mkdirSync(REPORT_DIR, { recursive: true });

  const captureMd = [
    "# Offensive Capture Required",
    "",
    `Generated: ${now}`,
    "",
    "Only genuinely absent or unusable captures. Existing validated source material is preserved.",
    "",
    captureQueue.length === 0
      ? "**NO ADDITIONAL OFFENSIVE CAPTURES REQUIRED**"
      : `**Total capture items: ${captureQueue.length}**`,
    "",
  ];
  if (captureQueue.length > 0) {
    captureMd.push("| Playbook | Formation | Play | Reason |", "|---|---|---|---|");
    for (const ex of captureQueue.sort((a, b) =>
      `${a.playbook}${a.formation}${a.play}`.localeCompare(
        `${b.playbook}${b.formation}${b.play}`,
      ),
    )) {
      captureMd.push(`| ${ex.playbook} | ${ex.formation} | ${ex.play} | ${ex.reason} |`);
    }
    captureMd.push("", "## Checklist", "");
    for (const ex of captureQueue) {
      captureMd.push(
        `- [ ] **${ex.playbook}** — ${ex.formation} — \`${ex.play}\` (${ex.reason})`,
      );
    }
  }
  writeFileSync(join(REPORT_DIR, "CAPTURE_REQUIRED.md"), captureMd.join("\n").trimEnd() + "\n");

  const procMd = [
    "# Offensive Processing Resolution Required",
    "",
    `Generated: ${now}`,
    "",
    "Existing-source items requiring OCR/catalog processing resolution.",
    "",
    `**Total processing items: ${processingQueue.length}**`,
    "",
  ];
  for (const ex of processingQueue.sort((a, b) =>
    `${a.playbook}${a.formation}${a.play}`.localeCompare(
      `${b.playbook}${b.formation}${b.play}`,
    ),
  )) {
    procMd.push(
      `## ${ex.playbook} — ${ex.formation} — \`${ex.play}\``,
      "",
      `**Reason:** ${ex.reason}`,
      `**Source:** ${ex.source || "(none)"}`,
      `**Raw OCR:** \`${ex.rawOcr || "(empty)"}\``,
      `**Normalized OCR:** \`${ex.normalizedOcr || "(empty)"}\``,
      `**Catalog candidate:** \`${ex.catalogCandidate || "(none)"}\``,
      "",
    );
  }
  writeFileSync(
    join(REPORT_DIR, "PROCESSING_RESOLUTION_REQUIRED.md"),
    procMd.join("\n").trimEnd() + "\n",
  );

  const summary = {
    books: bookRows,
    exceptions: allExceptions,
    captureQueue,
    processingQueue,
    originalCapture26: captureResults,
    stats: {
      ready: bookRows.filter((b) => b.status === "READY_TO_PUBLISH").length,
      needs: bookRows.filter((b) => b.status === "NEEDS_SUPPLEMENTS").length,
      failed: bookRows.filter((b) => b.status === "FAILED").length,
      totalMissing: allExceptions.length,
      captureRequired: captureQueue.length,
      processingRequired: processingQueue.length,
      original26Resolved: captureResults.filter((r) => r.result === "CAPTURE_RESOLVED").length,
    },
  };

  writeFileSync(
    join(REPORT_DIR, "reconciliation-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );

  console.log(JSON.stringify(summary.stats, null, 2));
  console.log(`Wrote ${join(REPORT_DIR, "CAPTURE_REQUIRED.md")}`);
  console.log(`Wrote ${join(REPORT_DIR, "PROCESSING_RESOLUTION_REQUIRED.md")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
