/**
 * Regression tests for global defensive source recovery.
 *
 * Run: npm run play-art:test-defense-recovery
 */
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { normalizePlayName } from "../../../lib/utils";
import {
  applyRecoveredExistingSource,
  buildRecoveredArtForBook,
  defensiveReusableArtKey,
  isDirectValidatedArtCard,
} from "./defensive-art-reuse";
import {
  buildRecoveredVideoCard,
  type RecoveryCandidate,
} from "./defensive-source-recovery";
import type { IndexedSourceCard } from "./defensive-global-source-index";
import type { ExtractedVideoCard } from "./types";

function makeIndexedCard(input: {
  slug: string;
  formationOcr: string;
  playOcr: string;
  formation: string;
  play: string;
}): { indexed: IndexedSourceCard; candidate: RecoveryCandidate } {
  const dir = mkdtempSync(join(tmpdir(), "def-recovery-test-"));
  const artCropPath = join(dir, "art.jpg");
  const sourceCardPath = join(dir, "source.jpg");
  writeFileSync(artCropPath, "art");
  writeFileSync(sourceCardPath, "source");

  const card: ExtractedVideoCard = {
    gameVersion: "cfb27",
    side: "defense",
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
    matchedFormation: null,
    formationMatchConfidence: "none",
    matchedPlay: null,
    playMatchConfidence: "none",
    catalogValid: false,
    screenRejected: false,
    rejectReason: null,
    sourceType: "screenshot",
    sourceFile: "screen-0001.mp4",
    supplementClass: "OCR_UNRESOLVED",
  };

  const indexed: IndexedSourceCard = {
    gameVersion: "cfb27",
    side: "defense",
    sourcePlaybookSlug: input.slug,
    sourcePlaybookDisplayName: input.slug,
    sourceType: "screenshot",
    sourceFile: "screen-0001.mp4",
    cardPosition: "left",
    sourceCardPath,
    artCropPath,
    formationOcrRaw: input.formationOcr,
    formationOcr: input.formationOcr,
    playNameOcrRaw: input.playOcr,
    playNameOcr: input.playOcr,
    matchedFormation: null,
    matchedPlay: null,
    supplementClass: "OCR_UNRESOLVED",
    validationStatus: "unresolved",
    card,
  };

  const candidate: RecoveryCandidate = {
    indexed,
    formationOcrRaw: input.formationOcr,
    formationOcr: input.formationOcr,
    playNameOcrRaw: input.playOcr,
    playNameOcr: input.playOcr,
    matchedPlay: input.play,
    playMatchConfidence: "fuzzy",
    recoveryMethod: "FORMATION_AWARE_REOCR",
    reOcrApplied: false,
  };

  return { indexed, candidate };
}

test("recovered card is not counted as direct validated art", () => {
  const { candidate } = makeIndexedCard({
    slug: "4-3-man",
    formationOcr: "Goal Line 5-3",
    playOcr: "HALF OUT",
    formation: "Goal Line 6-2",
    play: "60 HALF OUT",
  });
  const recovered = buildRecoveredVideoCard({
    targetFormation: "Goal Line 6-2",
    targetPlay: "60 HALF OUT",
    candidate,
  });
  assert.equal(isDirectValidatedArtCard(recovered), false);
  assert.equal(recovered.matchedFormation, "Goal Line 6-2");
  assert.equal(recovered.matchedPlay, "60 HALF OUT");
});

test("missing target mapping + valid same-formation source in another book → recover/reuse", () => {
  const source = buildRecoveredVideoCard({
    targetFormation: "Dime 3-2",
    targetPlay: "1 DOUBLE WR1",
    candidate: makeIndexedCard({
      slug: "4-3-shell",
      formationOcr: "Nickel 3-3 Mint",
      playOcr: "1DOUBLE WRI",
      formation: "Dime 3-2",
      play: "1 DOUBLE WR1",
    }).candidate,
  });

  const reference = {
    gameVersion: "cfb27" as const,
    sideOfBall: "defense" as const,
    playbook: "4-3 Man",
    formations: [
      {
        name: "Dime 3-2",
        plays: ["1 DOUBLE WR1", "COVER 2 MAN"],
      },
    ],
  };

  const result = applyRecoveredExistingSource({
    targetPlaybookSlug: "4-3-man",
    reference,
    directCards: [],
    globalRecovered: [source],
  });

  assert.equal(result.mappingsSatisfied, 1);
  assert.equal(result.recoveredCards[0]?.matchedPlay, "1 DOUBLE WR1");
});

test("same play + different formation → do not reuse", () => {
  const source = buildRecoveredVideoCard({
    targetFormation: "Goal Line 5-3",
    targetPlay: "60 OUT",
    candidate: makeIndexedCard({
      slug: "4-3-shell",
      formationOcr: "Goal Line 5-3",
      playOcr: "60 OUT",
      formation: "Goal Line 5-3",
      play: "60 OUT",
    }).candidate,
  });

  const reference = {
    gameVersion: "cfb27" as const,
    sideOfBall: "defense" as const,
    playbook: "4-3 Man",
    formations: [{ name: "Goal Line 6-2", plays: ["60 OUT"] }],
  };

  const result = applyRecoveredExistingSource({
    targetPlaybookSlug: "4-3-man",
    reference,
    directCards: [],
    globalRecovered: [source],
  });

  assert.equal(result.mappingsSatisfied, 0);
});

test("similar play name → do not reuse", () => {
  const source = buildRecoveredVideoCard({
    targetFormation: "Nickel Over",
    targetPlay: "NICKEL BLITZ 2",
    candidate: makeIndexedCard({
      slug: "4-3-shell",
      formationOcr: "Nickel Over",
      playOcr: "NICKEL BLITZ 2",
      formation: "Nickel Over",
      play: "NICKEL BLITZ 2",
    }).candidate,
  });

  const reference = {
    gameVersion: "cfb27" as const,
    sideOfBall: "defense" as const,
    playbook: "4-3 Man",
    formations: [{ name: "Nickel Over", plays: ["NICKEL BLITZ 1"] }],
  };

  const result = applyRecoveredExistingSource({
    targetPlaybookSlug: "4-3-man",
    reference,
    directCards: [],
    globalRecovered: [source],
  });

  assert.equal(result.mappingsSatisfied, 0);
});

test("no existing source → remains capture required", () => {
  const reference = {
    gameVersion: "cfb27" as const,
    sideOfBall: "defense" as const,
    playbook: "4-3 Man",
    formations: [{ name: "Dime 3-2", plays: ["1 DOUBLE WR1"] }],
  };

  const result = applyRecoveredExistingSource({
    targetPlaybookSlug: "4-3-man",
    reference,
    directCards: [],
    globalRecovered: [],
  });

  assert.equal(result.mappingsSatisfied, 0);
});

test("buildRecoveredArtForBook preserves exact reusable art key", () => {
  const source = buildRecoveredVideoCard({
    targetFormation: "Goal Line 6-2",
    targetPlay: "GUTS",
    candidate: makeIndexedCard({
      slug: "3-3-5-shell",
      formationOcr: "Goal Line 5-3",
      playOcr: "GUTS",
      formation: "Goal Line 6-2",
      play: "GUTS",
    }).candidate,
  });

  const applied = buildRecoveredArtForBook({
    targetPlaybookSlug: "4-3-man",
    formation: "Goal Line 6-2",
    play: "GUTS",
    source,
  });

  assert.equal(
    defensiveReusableArtKey(applied.matchedFormation!, applied.matchedPlay!),
    defensiveReusableArtKey("Goal Line 6-2", "GUTS"),
  );
  assert.equal(normalizePlayName(applied.matchedPlay!), normalizePlayName("GUTS"));
});
