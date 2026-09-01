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
  recoverMissingIdentity,
  type RecoveryCandidate,
} from "./defensive-source-recovery";
import type { IndexedSourceCard } from "./defensive-global-source-index";
import { extractPlayOcrCandidates } from "./defensive-global-source-index";
import {
  formationOcrSupportsTarget,
  numericSuffixMatchesTarget,
} from "./defensive-formation-evidence";
import {
  sourceGroundedPlayMatch,
} from "./defensive-recovery-needles";
import type { ExtractedVideoCard } from "./types";
import type { DefensiveArtCorpus } from "./defensive-art-reuse";

function makeIndexedCard(input: {
  slug: string;
  formationOcr: string;
  playOcr: string;
  formation: string;
  play: string;
  formationEvidence?: boolean;
  headerExactPlay?: boolean;
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
    formationOcr: input.formationOcr.split("\n")[0] ?? input.formationOcr,
    playNameOcrRaw: input.playOcr,
    playNameOcr: input.playOcr,
    matchedPlay: input.play,
    playMatchConfidence: "fuzzy",
    recoveryMethod: "FORMATION_AWARE_REOCR",
    reOcrApplied: false,
    formationEvidence: input.formationEvidence ?? false,
    headerExactPlay: input.headerExactPlay ?? false,
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

test("extractPlayOcrCandidates reads play label from formation OCR line 2", () => {
  const candidates = extractPlayOcrCandidates({
    playNameOcr: "NICKEL BLITZ",
    formationOcrRaw: "NICKEL OVER\nNICKEL BLITZ 2",
  });
  assert.ok(candidates.includes("NICKEL BLITZ 2"));
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

test("Goal Line 6-2 header OCR supports target formation", () => {
  const allFormations = ["Goal Line 5-3", "Goal Line 6-2", "Dime 3-2"];
  assert.equal(
    formationOcrSupportsTarget({
      formationOcrRaw: "GOAL LINE 62\n60 our JACKS",
      formationOcr: "GOAL LINE",
      targetFormation: "Goal Line 6-2",
      allFormationNames: allFormations,
    }),
    true,
  );
});

test("Dime 3-2 header OCR supports target formation", () => {
  const allFormations = ["Nickel Over Jack", "Dime 3-2", "3-2-6 3-2"];
  assert.equal(
    formationOcrSupportsTarget({
      formationOcrRaw: "DIME 32\n 1DouBLE wrt",
      formationOcr: "DIME",
      targetFormation: "Dime 3-2",
      allFormationNames: allFormations,
    }),
    true,
  );
  assert.equal(
    formationOcrSupportsTarget({
      formationOcrRaw: "NICKEL OVER JACK\n1 DOUBLE WR1",
      formationOcr: "NICKEL OVER JACK",
      targetFormation: "Dime 3-2",
      allFormationNames: allFormations,
    }),
    false,
  );
});

test("numeric suffix preservation: OKIE ROLL 2 vs OKIE ROLL 3", () => {
  assert.equal(numericSuffixMatchesTarget("ONI ROW 2", "OKIE ROLL 2"), true);
  assert.equal(numericSuffixMatchesTarget("ONIE ROLL", "OKIE ROLL 3"), false);
  assert.equal(numericSuffixMatchesTarget("EPCE BLITZ 1", "EDGE BLITZ 1"), true);
  assert.equal(numericSuffixMatchesTarget("EPCE BLITZ 1", "EDGE BLITZ 3"), false);
});

test("Goal Line 6-2 / 60 OUT JACKS recovers from GOAL LINE 62 source", async () => {
  const { indexed } = makeIndexedCard({
    slug: "3-2-6",
    formationOcr: "GOAL LINE 62\n60 our JACKS",
    playOcr: "60 OUR JACKS",
    formation: "Goal Line 6-2",
    play: "60 OUT JACKS",
  });
  const corpus: DefensiveArtCorpus = new Map();
  const result = await recoverMissingIdentity({
    target: {
      formation: "Goal Line 6-2",
      play: "60 OUT JACKS",
      artKey: defensiveReusableArtKey("Goal Line 6-2", "60 OUT JACKS"),
    },
    formationPlays: [
      "60 BASE",
      "60 HALF OUT",
      "60 OUT",
      "60 OUT JACKS",
      "60 PINCH",
      "GUTS",
    ],
    sourceIndex: [indexed],
    corpus,
    allFormationNames: ["Goal Line 5-3", "Goal Line 6-2"],
  });
  assert.equal(result.classification, "RECOVERED_EXISTING_SOURCE");
  assert.equal(result.recoveredCard?.matchedPlay, "60 OUT JACKS");
});

test("same play name in different formation does not cross-resolve", async () => {
  const nickelCard = makeIndexedCard({
    slug: "3-3-5-man",
    formationOcr: "NICKEL OVER JACK\n1 DOUBLE WR1",
    playOcr: "1 DOUBLE WR1",
    formation: "Nickel Over Jack",
    play: "1 DOUBLE WR1",
  }).indexed;
  const dimeCard = makeIndexedCard({
    slug: "3-3-5-man",
    formationOcr: "DIME 32\n 1DouBLE wrt",
    playOcr: "1DOUBLE WRT",
    formation: "Dime 3-2",
    play: "1 DOUBLE WR1",
  }).indexed;
  const corpus: DefensiveArtCorpus = new Map();
  const result = await recoverMissingIdentity({
    target: {
      formation: "Dime 3-2",
      play: "1 DOUBLE WR1",
      artKey: defensiveReusableArtKey("Dime 3-2", "1 DOUBLE WR1"),
    },
    formationPlays: ["1 DOUBLE WR1", "OKIE ROLL 2"],
    sourceIndex: [nickelCard, dimeCard],
    corpus,
    allFormationNames: ["Nickel Over Jack", "Dime 3-2"],
  });
  assert.equal(result.classification, "RECOVERED_EXISTING_SOURCE");
  assert.match(result.winningCandidate?.formationOcrRaw ?? "", /DIME 32/i);
});

test("source-grounded: 3-2-6 3-2 / OKIE ROLL 3 from ONIE ROLL without digit", async () => {
  const { indexed } = makeIndexedCard({
    slug: "3-2-6",
    formationOcr: "326 32\n onIE ROLL",
    playOcr: "ONIE ROLL",
    formation: "3-2-6 3-2",
    play: "OKIE ROLL 3",
  });
  const corpus: DefensiveArtCorpus = new Map();
  const result = await recoverMissingIdentity({
    target: {
      formation: "3-2-6 3-2",
      play: "OKIE ROLL 3",
      artKey: defensiveReusableArtKey("3-2-6 3-2", "OKIE ROLL 3"),
    },
    formationPlays: ["OKIE ROLL 2", "OKIE ROLL 3"],
    sourceIndex: [indexed],
    corpus,
    allFormationNames: ["3-2-6 3-2", "Dime 3-2"],
  });
  assert.equal(result.classification, "RECOVERED_EXISTING_SOURCE");
  assert.equal(result.recoveredCard?.matchedPlay, "OKIE ROLL 3");
});

test("source-grounded: rejects OKIE ROLL 2 when digit 2 present", () => {
  assert.equal(
    sourceGroundedPlayMatch({
      formationOcrRaw: "326 32\nOKIE ROLL 2",
      formationOcr: "326 32",
      targetFormation: "3-2-6 3-2",
      targetPlay: "OKIE ROLL 3",
      playOcr: "OKIE ROLL 2",
      allFormationNames: ["3-2-6 3-2"],
    }),
    false,
  );
});

test("source-grounded: 4-2-5 Even / 1 DOUBLE WR1 from DOUBLE WRT", async () => {
  const { indexed } = makeIndexedCard({
    slug: "4-2-5-man",
    formationOcr: "425 EVEN\nDOUBLE WRt",
    playOcr: "DOUBLE WRT",
    formation: "4-2-5 Even",
    play: "1 DOUBLE WR1",
  });
  const corpus: DefensiveArtCorpus = new Map();
  const result = await recoverMissingIdentity({
    target: {
      formation: "4-2-5 Even",
      play: "1 DOUBLE WR1",
      artKey: defensiveReusableArtKey("4-2-5 Even", "1 DOUBLE WR1"),
    },
    formationPlays: ["1 DOUBLE WR1", "1 DOUBLE WR2"],
    sourceIndex: [indexed],
    corpus,
    allFormationNames: ["4-2-5 Even", "4-2-5 Over G"],
  });
  assert.equal(result.classification, "RECOVERED_EXISTING_SOURCE");
});

test("source-grounded: WR1 rejects WR2 play OCR", () => {
  assert.equal(
    sourceGroundedPlayMatch({
      formationOcrRaw: "425 EVEN\nDOUBLE WR2",
      formationOcr: "425 EVEN",
      targetFormation: "4-2-5 Even",
      targetPlay: "1 DOUBLE WR1",
      playOcr: "DOUBLE WR2",
      allFormationNames: ["4-2-5 Even"],
    }),
    false,
  );
});

test("source-grounded: 4-3 Over Walk / SS BLITZ 1 from S BLITZ 1", async () => {
  const { indexed } = makeIndexedCard({
    slug: "4-3-zone",
    formationOcr: "43 OVER WALK\nS BLITZ 1",
    playOcr: "S BLITZ 1",
    formation: "4-3 Over Walk",
    play: "SS BLITZ 1",
  });
  const corpus: DefensiveArtCorpus = new Map();
  const result = await recoverMissingIdentity({
    target: {
      formation: "4-3 Over Walk",
      play: "SS BLITZ 1",
      artKey: defensiveReusableArtKey("4-3 Over Walk", "SS BLITZ 1"),
    },
    formationPlays: ["SS BLITZ 1", "SS BLITZ 2"],
    sourceIndex: [indexed],
    corpus,
    allFormationNames: ["4-3 Over Walk", "4-3 Over"],
  });
  assert.equal(result.classification, "RECOVERED_EXISTING_SOURCE");
});

test("source-grounded: Nickel 2-4 / 1 DOUBLE WR1 from NICKEL 24 + DOUBLE WRT", async () => {
  const { indexed } = makeIndexedCard({
    slug: "3-4-man",
    formationOcr: "NICKEL 24\nDOUBLE wrt",
    playOcr: "DOUBLE WRT",
    formation: "Nickel 2-4",
    play: "1 DOUBLE WR1",
  });
  const loadCard = makeIndexedCard({
    slug: "3-4-man",
    formationOcr: "NICKEL 24 LOAD\nDOUBLE wrt",
    playOcr: "DOUBLE WRT",
    formation: "Nickel 2-4 Load",
    play: "1 DOUBLE WR1",
  }).indexed;
  const corpus: DefensiveArtCorpus = new Map();
  const result = await recoverMissingIdentity({
    target: {
      formation: "Nickel 2-4",
      play: "1 DOUBLE WR1",
      artKey: defensiveReusableArtKey("Nickel 2-4", "1 DOUBLE WR1"),
    },
    formationPlays: ["1 DOUBLE WR1"],
    sourceIndex: [indexed, loadCard],
    corpus,
    allFormationNames: ["Nickel 2-4", "Nickel 2-4 Load"],
  });
  assert.equal(result.classification, "RECOVERED_EXISTING_SOURCE");
  assert.match(result.winningCandidate?.formationOcrRaw ?? "", /NICKEL 24/i);
  assert.doesNotMatch(result.winningCandidate?.formationOcrRaw ?? "", /LOAD/i);
});
