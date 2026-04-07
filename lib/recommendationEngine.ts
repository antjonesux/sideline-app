import { effectiveFieldZoneForRules, situationFromGameState } from "@/lib/gameStateMapping";
import { inferPlayCategories, playMatchesToken } from "@/lib/inferPlayCategories";
import type {
  CoverageAffinityRow,
  EnginePlay,
  FieldPositionRuleRow,
  LiveGameState,
  Recommendation,
} from "@/lib/mvp4Types";

function ruleForZone(
  zone: string,
  rules: FieldPositionRuleRow[],
): FieldPositionRuleRow | undefined {
  return rules.find((r) => r.field_zone === zone);
}

function scorePlay(
  play: EnginePlay,
  cats: string[],
  fieldRule: FieldPositionRuleRow | undefined,
  affinities: CoverageAffinityRow[],
  tags: string[],
  modifiers: { boostFeatured: boolean },
): number {
  let s = 0;
  if (modifiers.boostFeatured && play.is_featured) s += 50;
  s += play.is_featured ? 5 : 0;

  const pri = fieldRule?.prioritize_play_types ?? [];
  for (const t of pri) {
    if (playMatchesToken(cats, t)) s += 12;
  }

  for (const tag of tags) {
    const aff = affinities.find(
      (a) => a.coverage_tag.toUpperCase() === tag.toUpperCase(),
    );
    if (!aff) continue;
    for (const t of aff.favored_play_types ?? []) {
      if (playMatchesToken(cats, t)) s += 8;
    }
  }

  return s;
}

function isSuppressed(
  cats: string[],
  fieldRule: FieldPositionRuleRow | undefined,
  affinities: CoverageAffinityRow[],
  tags: string[],
  opts: { skipFieldSuppress: boolean; skipCoverageSuppress: boolean },
): { suppressed: boolean; reason?: string } {
  if (!opts.skipFieldSuppress && fieldRule?.suppress_play_types?.length) {
    for (const t of fieldRule.suppress_play_types) {
      if (playMatchesToken(cats, t))
        return { suppressed: true, reason: `Zone: avoid ${t}` };
    }
  }

  if (!opts.skipCoverageSuppress) {
    for (const tag of tags) {
      const aff = affinities.find(
        (a) => a.coverage_tag.toUpperCase() === tag.toUpperCase(),
      );
      if (!aff?.suppressed_play_types?.length) continue;
      for (const t of aff.suppressed_play_types) {
        if (playMatchesToken(cats, t))
          return { suppressed: true, reason: `${tag}: avoid ${t}` };
      }
    }
  }

  return { suppressed: false };
}

function applyScoreClockModifiers(gs: LiveGameState): {
  skipFieldSuppress: boolean;
  suppressExplosive: boolean;
  forcePassFriendly: boolean;
  twoMinuteBias: boolean;
  modifierNotes: string[];
} {
  const notes: string[] = [];
  const q = gs.quarter === "OT" ? 5 : gs.quarter;
  const q4 = q === 4;

  let skipFieldSuppress = false;
  let suppressExplosive = false;
  let forcePassFriendly = false;
  let twoMinuteBias = gs.twoMinuteDrill;

  if (gs.scoreContext === "DOWN_BIG" && q4) {
    skipFieldSuppress = true;
    forcePassFriendly = true;
    notes.push("Down big in Q4 — passing to score.");
  }

  if (gs.scoreContext === "UP_BIG" && q4) {
    suppressExplosive = true;
    notes.push("Up big in Q4 — ball control.");
  }

  if (gs.twoMinuteDrill) {
    twoMinuteBias = true;
    notes.push("2-minute: quick throws and clock stops.");
  }

  return {
    skipFieldSuppress,
    suppressExplosive,
    forcePassFriendly,
    twoMinuteBias,
    modifierNotes: notes,
  };
}

function twoMinuteAdjustScore(cats: string[], base: number): number {
  let s = base;
  if (cats.includes("empty_formation")) s += 10;
  if (cats.includes("quick_game")) s += 8;
  if (cats.includes("run") && !cats.includes("screen")) s -= 6;
  return s;
}

function fourthDownNote(gs: LiveGameState): string | null {
  if (gs.down !== 4) return null;
  return "4th down — consider sneak, power, or punt. Take the shot only if the sheet matches.";
}

export function getRecommendation(
  gameState: LiveGameState,
  playSheet: EnginePlay[],
  fieldPositionRules: FieldPositionRuleRow[],
  coverageAffinities: CoverageAffinityRow[],
): Recommendation {
  const situation = situationFromGameState(gameState);
  const zoneKey = effectiveFieldZoneForRules(gameState);
  const fieldRule = ruleForZone(zoneKey, fieldPositionRules);

  const mods = applyScoreClockModifiers(gameState);
  const suppressedReasons: string[] = [];

  const pool = playSheet.filter((p) => p.situation === situation);
  const ranked: { play: EnginePlay; score: number; cats: string[] }[] = [];

  for (const play of pool) {
    const cats = inferPlayCategories({
      formation: play.formation,
      play_name: play.play_name,
      play_type: play.play_type,
    });

    if (mods.suppressExplosive && cats.includes("explosive")) {
      suppressedReasons.push(`${play.play_name}: shelved (ball control).`);
      continue;
    }

    if (mods.forcePassFriendly && cats.includes("run") && !cats.includes("rpo")) {
      suppressedReasons.push(`${play.play_name}: shelved (need passing).`);
      continue;
    }

    const sup = isSuppressed(cats, fieldRule, coverageAffinities, gameState.coverageTags, {
      skipFieldSuppress: mods.skipFieldSuppress,
      skipCoverageSuppress: false,
    });
    if (sup.suppressed && sup.reason) {
      suppressedReasons.push(`${play.play_name}: ${sup.reason}`);
      continue;
    }

    let sc = scorePlay(
      play,
      cats,
      fieldRule,
      coverageAffinities,
      gameState.coverageTags,
      { boostFeatured: true },
    );

    if (mods.twoMinuteBias) sc = twoMinuteAdjustScore(cats, sc);

    if (gameState.down === 4) {
      if (cats.includes("qb_sneak") || cats.includes("power_run")) sc += 22;
    }

    ranked.push({ play, score: sc, cats });
  }

  const unused = ranked.filter((r) => !r.play.is_used);
  const bucket = unused.length ? unused : ranked;

  bucket.sort((a, b) => b.score - a.score);

  const orderedPlays = bucket.map((r) => r.play);
  const primary = orderedPlays[0] ?? null;
  const alternates = orderedPlays.slice(1, 3);

  const ruleNote =
    fieldRule?.rule_note?.trim() ||
    "Adjust to what the defense is giving you.";

  return {
    primary,
    alternates,
    ruleNote,
    modifierNotes: mods.modifierNotes,
    suppressedReasons,
    fourthDownNote: fourthDownNote(gameState),
  };
}
