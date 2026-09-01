/**
 * Regression tests for exact defensive cross-playbook art reuse.
 *
 * Run: npm run play-art:test-defense-reuse
 */
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { normalizePlayName } from "../../../lib/utils";
import {
  applyDefensiveCrossPlaybookReuse,
  buildReusedVideoCard,
  compareValidatedArtEntries,
  defensiveReusableArtKey,
  isDefensiveReuseEligible,
  isDirectValidatedArtCard,
  selectDeterministicReuseSource,
  type DefensiveArtCorpus,
  type ValidatedArtEntry,
} from "./defensive-art-reuse";
import type { ExtractedVideoCard } from "./types";

function makeValidCard(input: Partial<ExtractedVideoCard> & {
  playbookSlug: string;
  formation: string;
  play: string;
}): ExtractedVideoCard {
  const dir = mkdtempSync(join(tmpdir(), "defense-reuse-test-"));
  const artCropPath = join(dir, "art.jpg");
  const sourceCardPath = join(dir, "source.jpg");
  writeFileSync(artCropPath, "art");
  writeFileSync(sourceCardPath, "source");
  return {
    gameVersion: "cfb27",
    side: "defense",
    playbookSlug: input.playbookSlug,
    videoFile: input.videoFile ?? "screen-0001.mp4",
    timestamp: input.timestamp ?? "00:00:01",
    timestampSec: input.timestampSec ?? 1,
    screenIndex: input.screenIndex ?? 0,
    cardPosition: input.cardPosition ?? "left",
    sourceCardPath: input.sourceCardPath ?? sourceCardPath,
    artCropPath: input.artCropPath ?? artCropPath,
    emptySlot: false,
    formationOcrRaw: input.formation,
    formationOcr: input.formation,
    playNameOcrRaw: input.play,
    playNameOcr: input.play,
    matchedFormation: input.formation,
    formationMatchConfidence: "exact",
    matchedPlay: input.play,
    playMatchConfidence: "exact",
    catalogValid: true,
    screenRejected: false,
    rejectReason: null,
    sourceType: input.sourceType ?? "video",
    sourceFile: input.sourceFile ?? "screen-0001.mp4",
    supplementClass: input.supplementClass ?? "NEW_MISSING_PLAY",
  };
}

test("same game + side + formation + play is reusable", () => {
  const keyA = defensiveReusableArtKey("Goal Line 6-2", "60 OUT");
  const keyB = defensiveReusableArtKey("Goal Line 6-2", "60 OUT");
  assert.equal(keyA, keyB);
  assert.ok(isDefensiveReuseEligible("cfb27", "defense"));
});

test("different formation is NOT reusable", () => {
  const a = defensiveReusableArtKey("Goal Line 6-2", "60 OUT");
  const b = defensiveReusableArtKey("Goal Line 5-3", "60 OUT");
  assert.notEqual(a, b);
});

test("different play is NOT reusable", () => {
  const a = defensiveReusableArtKey("Goal Line 6-2", "60 OUT");
  const b = defensiveReusableArtKey("Goal Line 6-2", "60 BASE");
  assert.notEqual(a, b);
});

test("normalized play equality uses normalizePlayName", () => {
  const a = defensiveReusableArtKey("Nickel 3-3", "SAW BLITZ 1");
  const b = defensiveReusableArtKey("Nickel 3-3", "SAW  BLITZ  1");
  assert.equal(a, b);
  assert.equal(normalizePlayName("SAW BLITZ 1"), normalizePlayName("SAW  BLITZ  1"));
});

test("different side is NOT reusable", () => {
  const defense = defensiveReusableArtKey("Goal Line 6-2", "60 OUT", "cfb27", "defense");
  const offense = defensiveReusableArtKey("Goal Line 6-2", "60 OUT", "cfb27", "offense");
  assert.notEqual(defense, offense);
  assert.equal(isDefensiveReuseEligible("cfb27", "offense"), false);
});

test("different game version is NOT reusable", () => {
  const cfb27 = defensiveReusableArtKey("Goal Line 6-2", "60 OUT", "cfb27", "defense");
  const cfb28 = defensiveReusableArtKey("Goal Line 6-2", "60 OUT", "cfb28", "defense");
  assert.notEqual(cfb27, cfb28);
});

test("cross-playbook reuse cards are excluded from direct corpus", () => {
  const card = makeValidCard({
    playbookSlug: "3-4-zone",
    formation: "Goal Line 6-2",
    play: "60 OUT",
    sourceType: "cross-playbook-reuse",
    supplementClass: "CROSS_PLAYBOOK_REUSE",
  });
  assert.equal(isDirectValidatedArtCard(card), false);
});

test("source selection is deterministic by playbook slug", () => {
  const cardA = makeValidCard({
    playbookSlug: "3-4",
    formation: "Goal Line 5-3",
    play: "GAPS AB",
  });
  const cardZ = makeValidCard({
    playbookSlug: "4-3",
    formation: "Goal Line 5-3",
    play: "GAPS AB",
  });
  const entries: ValidatedArtEntry[] = [
    {
      playbookSlug: "4-3",
      playbookDisplayName: "4-3",
      card: cardZ,
      reusableArtKey: defensiveReusableArtKey("Goal Line 5-3", "GAPS AB"),
    },
    {
      playbookSlug: "3-4",
      playbookDisplayName: "3-4",
      card: cardA,
      reusableArtKey: defensiveReusableArtKey("Goal Line 5-3", "GAPS AB"),
    },
  ];
  const selected = selectDeterministicReuseSource(entries, "3-3-5-man");
  assert.equal(selected?.playbookSlug, "3-4");
  const sorted = [...entries].sort(compareValidatedArtEntries);
  assert.equal(sorted[0].playbookSlug, "3-4");
});

test("apply reuse satisfies missing mapping from another playbook", () => {
  const sourceCard = makeValidCard({
    playbookSlug: "3-4",
    formation: "Goal Line 5-3",
    play: "GAPS AB",
  });
  const corpus: DefensiveArtCorpus = new Map([
    [
      defensiveReusableArtKey("Goal Line 5-3", "GAPS AB"),
      [
        {
          playbookSlug: "3-4",
          playbookDisplayName: "3-4",
          card: sourceCard,
          reusableArtKey: defensiveReusableArtKey("Goal Line 5-3", "GAPS AB"),
        },
      ],
    ],
  ]);
  const reference = {
    gameVersion: "cfb27",
    sideOfBall: "defense" as const,
    playbook: "3-3-5 Man",
    playbookName: "3-3-5 Man",
    formations: [
      {
        name: "Goal Line 5-3",
        plays: ["GAPS AB", "GL MAN"],
      },
    ],
  };
  const result = applyDefensiveCrossPlaybookReuse({
    targetPlaybookSlug: "3-3-5-man",
    targetDisplayName: "3-3-5 Man",
    reference,
    directCards: [],
    corpus,
  });
  assert.equal(result.reuseCards.length, 1);
  assert.equal(result.combinedCards.length, 1);
  assert.equal(result.reuseCards[0].matchedFormation, "Goal Line 5-3");
  assert.equal(result.reuseCards[0].matchedPlay, "GAPS AB");
  assert.equal(result.reuseCards[0].sourceType, "cross-playbook-reuse");
  assert.equal(result.reuseCards[0].reuseProvenance?.sourcePlaybookSlug, "3-4");
  assert.equal(result.reuseCards[0].artCropPath, sourceCard.artCropPath);
});

test("buildReusedVideoCard preserves provenance fields", () => {
  const sourceCard = makeValidCard({
    playbookSlug: "3-4-zone",
    formation: "Nickel 3-3 Mint",
    play: "COVER 9",
    sourceType: "manual-supplement",
    sourceFile: "snap.png",
  });
  const reused = buildReusedVideoCard({
    targetPlaybookSlug: "3-3-5",
    targetDisplayName: "3-3-5",
    formation: "Nickel 3-3 Mint",
    play: "COVER 9",
    source: {
      playbookSlug: "3-4-zone",
      playbookDisplayName: "3-4 Zone",
      card: sourceCard,
      reusableArtKey: defensiveReusableArtKey("Nickel 3-3 Mint", "COVER 9"),
    },
  });
  assert.equal(reused.reuseProvenance?.sourcePlaybookSlug, "3-4-zone");
  assert.equal(reused.reuseProvenance?.sourceFile, "snap.png");
  assert.equal(reused.reuseProvenance?.sourceArtCropPath, sourceCard.artCropPath);
  assert.equal(reused.supplementClass, "CROSS_PLAYBOOK_REUSE");
});
