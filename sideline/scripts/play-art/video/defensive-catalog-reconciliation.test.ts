/**
 * Regression tests for defensive catalog reconciliation (seed corrections).
 *
 * Run: npm run play-art:test-defense-catalog
 */
import assert from "node:assert/strict";
import test from "node:test";
import { normalizePlayName } from "../../../lib/utils";
import { CFB27_4_3_PRESS_QUARTERS_SEED } from "../../../lib/seed/playbooks/cfb27-4-3-press-quarters";
import { CFB27_3_3_5_THREE_HIGH_SEED } from "../../../lib/seed/playbooks/cfb27-3-3-5-three-high";
import { importSeedModule } from "../build-reference";

function formationPlays(seed: typeof CFB27_4_3_PRESS_QUARTERS_SEED, formation: string): string[] {
  const block = seed.formations.find((f) => f.formation === formation);
  assert.ok(block, `formation ${formation} not found`);
  return block.plays.map((p) => p.playName);
}

test("4-3 Press Quarters / 4-3 Over uses PRESS QUARTERS not COVER 4 PRESS", () => {
  const plays = formationPlays(CFB27_4_3_PRESS_QUARTERS_SEED, "4-3 Over");
  assert.ok(plays.includes("PRESS QUARTERS"));
  assert.ok(!plays.includes("COVER 4 PRESS"));
});

test("Dime 2-3 Odd uses COVER 2 MATCH; COVER 2 SINK removed from seed", () => {
  const plays = formationPlays(CFB27_3_3_5_THREE_HIGH_SEED, "Dime 2-3 Odd");
  assert.ok(plays.includes("COVER 2 MATCH"));
  assert.ok(!plays.includes("COVER 2 SINK"));
});

test("Dime 2-3 Odd distinct cover-2 family plays remain separate", () => {
  const plays = formationPlays(CFB27_3_3_5_THREE_HIGH_SEED, "Dime 2-3 Odd");
  for (const play of ["TAMPA 2", "COVER 2 HARD FLAT", "COVER 2 MATCH", "COVER 2 MAN"]) {
    assert.ok(plays.includes(play), `missing ${play}`);
  }
  const norms = plays.map((p) => normalizePlayName(p));
  assert.equal(new Set(norms).size, norms.length);
  assert.ok(!plays.includes("COVER 2 SINK"));
});

test("importable defensive seeds reflect catalog corrections", async () => {
  const pressQuarters = await importSeedModule("cfb27-4-3-press-quarters");
  const threeHigh = await importSeedModule("cfb27-3-3-5-three-high");
  const overPlays =
    pressQuarters.formations.find((f) => f.formation === "4-3 Over")?.plays.map((p) => p.playName) ??
    [];
  const dimePlays =
    threeHigh.formations.find((f) => f.formation === "Dime 2-3 Odd")?.plays.map((p) => p.playName) ??
    [];
  assert.ok(overPlays.includes("PRESS QUARTERS"));
  assert.ok(!overPlays.includes("COVER 4 PRESS"));
  assert.ok(dimePlays.includes("COVER 2 MATCH"));
  assert.ok(!dimePlays.includes("COVER 2 SINK"));
});
