/**
 * Regression tests for global offensive source recovery.
 *
 * Run: npm run play-art:test-offense-recovery
 */
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { normalizePlayName } from "../../../lib/utils";
import {
  applyRecoveredExistingSource,
  isDirectValidatedArtCard,
  offensiveReusableArtKey,
} from "./offensive-art-reuse";
import { normalizeCanonicalOffensivePlayName } from "./offensive-canonical-play";
import {
  extractPlayOcrCandidates,
  filterExactSourceCandidates,
  discoverUnprocessedOffensiveSourceScreenshots,
  type IndexedSourceCard,
} from "./offensive-global-source-index";
import {
  buildRecoveredVideoCard,
  recoverMissingIdentity,
  type RecoveryCandidate,
} from "./offensive-source-recovery";
import type { ExtractedVideoCard } from "./types";
import { matchPlayInFormation } from "./ocr-and-catalog";

function makeIndexedCard(input: {
  slug: string;
  formationOcr: string;
  playOcr: string;
  matchedFormation?: string | null;
  matchedPlay?: string | null;
  catalogValid?: boolean;
}): IndexedSourceCard {
  const dir = mkdtempSync(join(tmpdir(), "off-recovery-test-"));
  const artCropPath = join(dir, "art.jpg");
  const sourceCardPath = join(dir, "source.jpg");
  writeFileSync(artCropPath, "art");
  writeFileSync(sourceCardPath, "source");

  const card: ExtractedVideoCard = {
    gameVersion: "cfb27",
    side: "offense",
    playbookSlug: input.slug,
    videoFile: "screen-0001.mp4",
    timestamp: "00:00:01",
    timestampSec: 1,
    screenIndex: 0,
    cardPosition: "left",
    sourceCardPath,
    artCropPath,
    emptySlot: false,
    formationOcrRaw: input.formationOcr,
    formationOcr: input.formationOcr,
    playNameOcrRaw: input.playOcr,
    playNameOcr: input.playOcr,
    matchedFormation: input.matchedFormation ?? null,
    formationMatchConfidence: input.matchedFormation ? "exact" : "none",
    matchedPlay: input.matchedPlay ?? null,
    playMatchConfidence: input.matchedPlay ? "exact" : "none",
    catalogValid: input.catalogValid ?? false,
    screenRejected: false,
    rejectReason: null,
    sourceType: "video",
    sourceFile: "screen-0001.mp4",
    supplementClass: input.catalogValid ? "NEW_MISSING_PLAY" : "OCR_UNRESOLVED",
  };

  return {
    gameVersion: "cfb27",
    side: "offense",
    sourcePlaybookSlug: input.slug,
    sourcePlaybookDisplayName: input.slug,
    sourceType: "video",
    sourceFile: "screen-0001.mp4",
    cardPosition: "left",
    sourceCardPath,
    artCropPath,
    formationOcrRaw: input.formationOcr,
    formationOcr: input.formationOcr,
    playNameOcrRaw: input.playOcr,
    playNameOcr: input.playOcr,
    matchedFormation: input.matchedFormation ?? null,
    matchedPlay: input.matchedPlay ?? null,
    supplementClass: card.supplementClass ?? null,
    validationStatus: input.catalogValid ? "validated" : "unresolved",
    card,
  };
}

test("wrong associated card does NOT count as source for expected play", () => {
  const index = [
    makeIndexedCard({
      slug: "texas",
      formationOcr: "GUN WING TRIPS\nMTN HB CROSS SCREEN",
      playOcr: "MTN HB CROSS SCREEN",
      matchedFormation: "Gun Wing Trips",
      matchedPlay: "MTN HB CROSS SCREEN",
      catalogValid: true,
    }),
  ];

  const candidates = filterExactSourceCandidates(index, "Gun Wing Trips", "INSIDE ZONE");
  assert.equal(candidates.length, 0);
});

test("exact validated source in another offensive book is discoverable", async () => {
  const corpus = new Map([
    [
      offensiveReusableArtKey("Gun Wing Trips", "INSIDE ZONE"),
      [
        {
          playbookSlug: "temple",
          playbookDisplayName: "Temple",
          reusableArtKey: offensiveReusableArtKey("Gun Wing Trips", "INSIDE ZONE"),
          card: makeIndexedCard({
            slug: "temple",
            formationOcr: "GUN WING TRIPS\nINSIDE ZONE",
            playOcr: "INSIDE ZONE",
            matchedFormation: "Gun Wing Trips",
            matchedPlay: "INSIDE ZONE",
            catalogValid: true,
          }).card,
        },
      ],
    ],
  ]);

  const result = await recoverMissingIdentity({
    target: {
      formation: "Gun Wing Trips",
      play: "INSIDE ZONE",
      artKey: offensiveReusableArtKey("Gun Wing Trips", "INSIDE ZONE"),
    },
    targetPlaybookSlug: "texas",
    formationPlays: ["INSIDE ZONE", "MTN HB CROSS SCREEN"],
    knownFormations: ["Gun Wing Trips", "Gun Bunch Quads Offset"],
    sourceIndex: [],
    corpus,
  });

  assert.equal(result.classification, "EXACT_VALIDATED_REUSE");
});

test("visible expected play label with failed resolution → processing not capture", async () => {
  const index = [
    makeIndexedCard({
      slug: "san-diego-state",
      formationOcr: "qa\nRPO ALERT WR SCREENS",
      playOcr: "RPO ALERT WR SCREENS",
    }),
    makeIndexedCard({
      slug: "san-diego-state",
      formationOcr: "GUN SPREAD\nALL GO",
      playOcr: "ALL GO",
      matchedFormation: "Gun Spread",
      matchedPlay: "ALL GO",
      catalogValid: true,
    }),
  ];
  index[1]!.sourceFile = index[0]!.sourceFile;
  index[1]!.card.screenIndex = index[0]!.card.screenIndex;

  const result = await recoverMissingIdentity({
    target: {
      formation: "Gun Spread",
      play: "RPO ALERT WR SCREENS",
      artKey: offensiveReusableArtKey("Gun Spread", "RPO ALERT WR SCREENS"),
    },
    targetPlaybookSlug: "san-diego-state",
    formationPlays: ["ALL GO"],
    knownFormations: ["Gun Spread", "Gun Bunch Quads Offset"],
    sourceIndex: index,
    corpus: new Map(),
  });

  assert.equal(result.classification, "SOURCE_FOUND_RESOLUTION_REQUIRED");
});

test("garbled formation OCR with exact play label can recover locally", async () => {
  const index = [
    makeIndexedCard({
      slug: "wake-forest",
      formationOcr: "a nates guns ores\nDUO",
      playOcr: "DUO",
    }),
    makeIndexedCard({
      slug: "wake-forest",
      formationOcr: "GUN BUNCH QUADS OFFSET\nCRACK TOSS",
      playOcr: "CRACK TOSS",
      matchedFormation: "Gun Bunch Quads Offset",
      matchedPlay: "CRACK TOSS",
      catalogValid: true,
    }),
  ];
  index[1]!.sourceFile = index[0]!.sourceFile;
  index[1]!.card.screenIndex = index[0]!.card.screenIndex;

  const result = await recoverMissingIdentity({
    target: {
      formation: "Gun Bunch Quads Offset",
      play: "DUO",
      artKey: offensiveReusableArtKey("Gun Bunch Quads Offset", "DUO"),
    },
    targetPlaybookSlug: "wake-forest",
    formationPlays: ["DUO", "INSIDE ZONE"],
    knownFormations: ["Gun Bunch Quads Offset"],
    sourceIndex: index,
    corpus: new Map(),
  });

  assert.equal(result.classification, "RECOVERED_EXISTING_SOURCE");
  assert.ok(result.recoveredCard);
});

test("same play name in different formation does NOT recover locally", async () => {
  const index = [
    makeIndexedCard({
      slug: "san-diego-state",
      formationOcr: "GUN SPREAD OFFSET\n617",
      playOcr: "617",
      matchedFormation: "Gun Spread Offset",
      matchedPlay: "617",
      catalogValid: true,
    }),
  ];

  const result = await recoverMissingIdentity({
    target: {
      formation: "Gun Spread Flex",
      play: "617",
      artKey: offensiveReusableArtKey("Gun Spread Flex", "617"),
    },
    targetPlaybookSlug: "tcu",
    formationPlays: ["617", "SMASH CORNERS"],
    knownFormations: ["Gun Spread Flex", "Gun Spread Offset"],
    sourceIndex: index,
    corpus: new Map(),
  });

  assert.equal(result.classification, "GENUINELY_NOT_CAPTURED");
});

test("no source anywhere → genuinely not captured", async () => {
  const result = await recoverMissingIdentity({
    target: {
      formation: "Gun Spread Flex",
      play: "617",
      artKey: offensiveReusableArtKey("Gun Spread Flex", "617"),
    },
    targetPlaybookSlug: "tcu",
    formationPlays: ["617", "SMASH CORNERS"],
    knownFormations: ["Gun Spread Flex", "Gun Spread Offset"],
    sourceIndex: [],
    corpus: new Map(),
  });

  assert.equal(result.classification, "GENUINELY_NOT_CAPTURED");
});

test("BDUO OCR resolves to catalog BDUO via offensive canonical matcher", async () => {
  const index = [
    makeIndexedCard({
      slug: "toledo",
      formationOcr: "GUN Y OFF TRIPS WK\nDUO",
      playOcr: "DUO",
      matchedFormation: "Gun Y Off Trips Wk",
      matchedPlay: "DUO",
    }),
  ];

  const result = await recoverMissingIdentity({
    target: {
      formation: "Gun Y Off Trips Wk",
      play: "BDUO",
      artKey: offensiveReusableArtKey("Gun Y Off Trips Wk", "BDUO"),
    },
    targetPlaybookSlug: "toledo",
    formationPlays: ["BDUO", "DUO"],
    knownFormations: ["Gun Y Off Trips Wk"],
    sourceIndex: index,
    corpus: new Map(),
  });

  assert.equal(result.classification, "RECOVERED_EXISTING_SOURCE");
  assert.ok(result.recoveredCard);
  assert.equal(result.recoveredCard?.matchedPlay, "BDUO");
  assert.equal(
    normalizeCanonicalOffensivePlayName(result.recoveredCard!.matchedPlay!),
    "DUO",
  );
});

test("recovered card from visible play OCR is not direct validated art", () => {
  const indexed = makeIndexedCard({
    slug: "wake-forest",
    formationOcr: "a nates guns ores\nDUO",
    playOcr: "DUO",
  });
  const candidate: RecoveryCandidate = {
    indexed,
    formationOcrRaw: indexed.formationOcrRaw,
    formationOcr: indexed.formationOcr,
    playNameOcrRaw: "DUO",
    playNameOcr: "DUO",
    matchedPlay: "DUO",
    playMatchConfidence: "exact",
    recoveryMethod: "FORMATION_AWARE_REOCR",
    reOcrApplied: false,
  };
  const recovered = buildRecoveredVideoCard({
    targetFormation: "Gun Bunch Quads Offset",
    targetPlay: "DUO",
    candidate,
  });
  assert.equal(isDirectValidatedArtCard(recovered), false);
  assert.equal(recovered.matchedPlay, "DUO");
});

test("cross-playbook recovered source satisfies target mapping", () => {
  const source = buildRecoveredVideoCard({
    targetFormation: "Gun Y Off Trips Wk",
    targetPlay: "INSIDE ZONE",
    candidate: {
      indexed: makeIndexedCard({
        slug: "temple",
        formationOcr: "GUN Y OFF TRIPS WK\nINSIDE ZONE",
        playOcr: "INSIDE ZONE",
        matchedFormation: "Gun Y Off Trips Wk",
        matchedPlay: "INSIDE ZONE",
        catalogValid: true,
      }),
      formationOcrRaw: "GUN Y OFF TRIPS WK\nINSIDE ZONE",
      formationOcr: "Gun Y Off Trips Wk",
      playNameOcrRaw: "INSIDE ZONE",
      playNameOcr: "INSIDE ZONE",
      matchedPlay: "INSIDE ZONE",
      playMatchConfidence: "exact",
      recoveryMethod: "FORMATION_AWARE_REOCR",
      reOcrApplied: false,
    },
  });

  const reference = {
    gameVersion: "cfb27" as const,
    sideOfBall: "offense" as const,
    playbook: "UTSA",
    formations: [{ name: "Gun Y Off Trips Wk", plays: ["INSIDE ZONE", "ALL GO"] }],
  };

  const result = applyRecoveredExistingSource({
    targetPlaybookSlug: "utsa",
    reference,
    directCards: [],
    globalRecovered: [source],
  });

  assert.equal(result.mappingsSatisfied, 1);
});

test("extractPlayOcrCandidates reads play label from formation OCR line 2", () => {
  const candidates = extractPlayOcrCandidates({
    playNameOcr: null,
    formationOcrRaw: "GUN BUNCH QUADS OFFSET\nDUO",
  });
  assert.ok(candidates.includes("DUO"));
});

test("discoverUnprocessedOffensiveSourceScreenshots flags unindexed source files", () => {
  const playArtRoot = mkdtempSync(join(tmpdir(), "off-unprocessed-"));
  const slug = "tcu";
  const sourceDir = join(
    playArtRoot,
    "source-screenshots/cfb27/offense",
    slug,
  );
  mkdirSync(sourceDir, { recursive: true });
  writeFileSync(join(sourceDir, "Screenshot 2026-09-01 09-59-56.png"), "png");

  const index: IndexedSourceCard[] = [];
  const unprocessed = discoverUnprocessedOffensiveSourceScreenshots(playArtRoot, index);
  assert.equal(unprocessed.length, 1);
  assert.equal(unprocessed[0]!.fileName, "Screenshot 2026-09-01 09-59-56.png");
});

test("one screenshot can recover multiple expected identities independently", async () => {
  const index: IndexedSourceCard[] = [
    makeIndexedCard({
      slug: "tcu",
      formationOcr: "GUN SPREAD FLEX\n617",
      playOcr: "617",
      matchedFormation: "Gun Spread Flex",
      matchedPlay: "617",
      catalogValid: true,
    }),
    makeIndexedCard({
      slug: "tcu",
      formationOcr: "GUN SPREAD FLEX\nY CROSS",
      playOcr: "Y CROSS",
      matchedFormation: "Gun Spread Flex",
      matchedPlay: "Y CROSS",
      catalogValid: true,
    }),
  ];

  const formationPlays = ["617", "Y CROSS", "SMASH CORNERS"];
  for (const play of ["617", "Y CROSS"] as const) {
    const result = await recoverMissingIdentity({
      target: {
        formation: "Gun Spread Flex",
        play,
        artKey: offensiveReusableArtKey("Gun Spread Flex", play),
      },
      targetPlaybookSlug: "tcu",
      formationPlays,
      knownFormations: ["Gun Spread Flex"],
      sourceIndex: index,
      corpus: new Map(),
    });
    assert.equal(result.classification, "RECOVERED_EXISTING_SOURCE");
    assert.equal(result.recoveredCard?.matchedPlay, play);
  }
});

test("numeric play 617 preserves exact identity", async () => {
  const index = [
    makeIndexedCard({
      slug: "tcu",
      formationOcr: "GUN SPREAD FLEX\n617",
      playOcr: "617",
      matchedFormation: "Gun Spread Flex",
      matchedPlay: "617",
      catalogValid: true,
    }),
  ];
  const result = await recoverMissingIdentity({
    target: {
      formation: "Gun Spread Flex",
      play: "617",
      artKey: offensiveReusableArtKey("Gun Spread Flex", "617"),
    },
    targetPlaybookSlug: "tcu",
    formationPlays: ["617", "Y CROSS"],
    knownFormations: ["Gun Spread Flex"],
    sourceIndex: index,
    corpus: new Map(),
  });
  assert.equal(result.classification, "RECOVERED_EXISTING_SOURCE");
  assert.equal(result.recoveredCard?.matchedPlay, "617");
});

test("unprocessed source-screenshot yields SOURCE_DISCOVERY_DEFECT not capture requirement", async () => {
  const result = await recoverMissingIdentity({
    target: {
      formation: "Gun Spread Flex",
      play: "617",
      artKey: offensiveReusableArtKey("Gun Spread Flex", "617"),
    },
    targetPlaybookSlug: "tcu",
    formationPlays: ["617", "Y CROSS"],
    knownFormations: ["Gun Spread Flex"],
    sourceIndex: [],
    corpus: new Map(),
    unprocessedSourceScreenshots: [
      {
        playbookSlug: "tcu",
        fileName: "Screenshot 2026-09-01 09-59-56.png",
        sourcePath: "/tmp/Screenshot 2026-09-01 09-59-56.png",
      },
    ],
  });
  assert.equal(result.classification, "SOURCE_DISCOVERY_DEFECT");
  assert.notEqual(result.classification, "GENUINELY_NOT_CAPTURED");
});

test("catalog-corrected play name does not require false capture when source exists", async () => {
  const index = [
    makeIndexedCard({
      slug: "tcu",
      formationOcr: "GUN DOUBLES HB WK\nSPRINT SLOT OUT",
      playOcr: "SPRINT SLOT OUT",
      matchedFormation: "Gun Doubles HB Wk",
      matchedPlay: "SPRINT SLOT OUT",
      catalogValid: true,
    }),
  ];
  const result = await recoverMissingIdentity({
    target: {
      formation: "Gun Doubles HB Wk",
      play: "SPRINT SLOT OUT",
      artKey: offensiveReusableArtKey("Gun Doubles HB Wk", "SPRINT SLOT OUT"),
    },
    targetPlaybookSlug: "tcu",
    formationPlays: ["SPRINT SLOT OUT", "RPO PEEK SLANT"],
    knownFormations: ["Gun Doubles HB Wk"],
    sourceIndex: index,
    corpus: new Map(),
  });
  assert.equal(result.classification, "RECOVERED_EXISTING_SOURCE");
  assert.notEqual(result.classification, "GENUINELY_NOT_CAPTURED");
});

test("OCR_UNRESOLVED supplement card recovers after XCROSS normalization", async () => {
  const dir = mkdtempSync(join(tmpdir(), "off-xcross-"));
  const artCropPath = join(dir, "art.jpg");
  const sourceCardPath = join(dir, "source.jpg");
  writeFileSync(artCropPath, "art");
  writeFileSync(sourceCardPath, "source");
  const card: ExtractedVideoCard = {
    gameVersion: "cfb27",
    side: "offense",
    playbookSlug: "ul-monroe",
    videoFile: "vlcsnap.png",
    timestamp: "vlcsnap.png",
    timestampSec: 0,
    screenIndex: 0,
    cardPosition: "middle",
    sourceCardPath,
    artCropPath,
    emptySlot: false,
    formationOcrRaw: "GUN TRIPS YFLEX\nSTRONG FLOOD XCROSS",
    formationOcr: "Gun Trips Y-Flex",
    playNameOcrRaw: "STRONG FLOOD XCROSS",
    playNameOcr: "STRONG FLOOD XCROSS",
    matchedFormation: null,
    formationMatchConfidence: "none",
    matchedPlay: null,
    playMatchConfidence: "none",
    catalogValid: false,
    screenRejected: false,
    rejectReason: null,
    sourceType: "manual-supplement",
    sourceFile: "vlcsnap-2026-08-31-10h46m26s207.png",
    supplementClass: "OCR_UNRESOLVED",
  };
  const indexed: IndexedSourceCard = {
    gameVersion: "cfb27",
    side: "offense",
    sourcePlaybookSlug: "ul-monroe",
    sourcePlaybookDisplayName: "UL Monroe",
    sourceType: "manual-supplement",
    sourceFile: "vlcsnap-2026-08-31-10h46m26s207.png",
    cardPosition: "middle",
    sourceCardPath,
    artCropPath,
    formationOcrRaw: card.formationOcrRaw ?? "",
    formationOcr: card.formationOcr ?? "",
    playNameOcrRaw: card.playNameOcrRaw,
    playNameOcr: card.playNameOcr,
    matchedFormation: card.matchedFormation,
    matchedPlay: card.matchedPlay,
    supplementClass: "OCR_UNRESOLVED",
    validationStatus: "unresolved",
    card,
  };
  const result = await recoverMissingIdentity({
    target: {
      formation: "Gun Trips Y-Flex",
      play: "STRONG FLOOD X-CROSS",
      artKey: offensiveReusableArtKey("Gun Trips Y-Flex", "STRONG FLOOD X-CROSS"),
    },
    targetPlaybookSlug: "ul-monroe",
    formationPlays: ["STRONG FLOOD X-CROSS", "HB MID DRAW", "SPEED OPTION"],
    knownFormations: ["Gun Trips Y-Flex"],
    sourceIndex: [indexed],
    corpus: new Map(),
  });
  assert.equal(result.classification, "RECOVERED_EXISTING_SOURCE");
});

test("Z MTN PA HB SEAM resolves exactly after catalog correction", () => {
  const r = matchPlayInFormation("Z MTN PA HB SEAM", [
    "Z MTN PA HB SEAM",
    "Z MTN ALERT BUCK",
    "Z MTN ALERT SPLIT",
  ]);
  assert.equal(r.matchedPlay, "Z MTN PA HB SEAM");
  assert.equal(r.matchConfidence, "exact");
});

test("7MTN PA HB SEAM resolves to Z MTN PA HB SEAM without 27 alias", () => {
  const r = matchPlayInFormation("7MTN PA HB SEAM", [
    "Z MTN PA HB SEAM",
    "Z MTN ALERT BUCK",
  ]);
  assert.equal(r.matchedPlay, "Z MTN PA HB SEAM");
});

test("unrelated 27-prefixed play remains distinct from Z MTN PA HB SEAM", () => {
  const r = matchPlayInFormation("27 DAGGER", [
    "27 DAGGER",
    "Z MTN PA HB SEAM",
  ]);
  assert.equal(r.matchedPlay, "27 DAGGER");
  assert.equal(r.matchConfidence, "exact");
});

test("RPO ZONE ALERT is exact match; FLAT suffix is distinct identity", () => {
  const index = [
    makeIndexedCard({
      slug: "toledo",
      formationOcr: "GUN BUNCH X NASTY\nRPO ZONE ALERT",
      playOcr: "RPO ZONE ALERT",
      matchedFormation: "Gun Bunch X Nasty",
      matchedPlay: "RPO ZONE ALERT",
      catalogValid: true,
    }),
  ];
  const alert = filterExactSourceCandidates(
    index,
    "Gun Bunch X Nasty",
    "RPO ZONE ALERT",
  );
  const flat = filterExactSourceCandidates(
    index,
    "Gun Bunch X Nasty",
    "RPO ZONE ALERT FLAT",
  );
  assert.equal(alert.length, 1);
  assert.equal(flat.length, 0);
  assert.equal(
    normalizeCanonicalOffensivePlayName("RPO ZONE ALERT"),
    normalizeCanonicalOffensivePlayName("RPO ZONE ALERT"),
  );
  assert.notEqual(
    normalizeCanonicalOffensivePlayName("RPO ZONE ALERT FLAT"),
    normalizeCanonicalOffensivePlayName("RPO ZONE ALERT"),
  );
});
