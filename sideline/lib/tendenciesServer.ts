import type { SupabaseClient } from "@supabase/supabase-js";
import { GAME_SESSION_IMPORT_SOURCE_ONBOARDING } from "@/lib/onboardingImportSource";
import { isStandardSuccessfulPlay } from "@/lib/loggedPlaySuccess";
import { shouldOverrideCfbPassLabelToRun } from "@/lib/playbook";
import { playbookIlikeExactPattern } from "@/lib/playbookIlikeExact";
import { normalizePlayName } from "@/lib/utils";
import { CFB_CATALOG_GAME_VERSION, SCENARIO_SHORT, SCOUTING_REPORT_SCENARIOS, parseCatalogGameVersion, type CatalogGameVersion, type CatalogSideOfBall } from "@/lib/constants";
import {
  categorizeCfbPlayType,
  deriveCfbPlayTypeFromName,
  derivedRawOverridesCatalogForTendencies,
  isRunLeanBucket,
  type PlayTypeBucket,
} from "@/lib/tendenciesPlayType";

export type GameRow = {
  id: string;
  my_playbook: string;
  offensive_playbook: string | null;
  opponent_team: string;
  game_date: string;
  result: "W" | "L" | null;
  my_score: number | null;
  opponent_score: number | null;
};

export type LoggedPlayRow = {
  id: string;
  game_session_id: string;
  drive_id: string;
  play_number: number;
  down: number | null;
  distance: number | null;
  is_inches?: boolean | null;
  formation: string;
  play_name: string;
  yards_gained: number | null;
  result_tag: string;
  scenario: string;
  is_success: boolean | null;
};

export type TendencyScope = "all" | "last5" | "last10" | "opponent";

function isPunt(play: Pick<LoggedPlayRow, "play_name" | "result_tag">): boolean {
  return (play.play_name ?? "").trim().toLowerCase() === "punt" || (play.result_tag ?? "").trim().toLowerCase() === "punt";
}

export function parseScope(raw: string | null): TendencyScope {
  if (raw === "last5" || raw === "last10" || raw === "opponent") return raw;
  return "all";
}

/** Game-detail tendencies tab: filter logged plays by drive side (defaults to offense). */
export function parseSideOfBallFilter(raw: string | null | undefined): "offense" | "defense" {
  return raw === "defense" ? "defense" : "offense";
}

/** Resolved playbook for tendencies aggregation on a given side of ball. */
export function playbookForTendenciesSide(
  g: Pick<GameRow, "offensive_playbook" | "my_playbook"> & { opponent_scheme?: string | null },
  side: "offense" | "defense",
): string {
  if (side === "defense") return (g.opponent_scheme ?? "").trim();
  return playbookForGame(g);
}

/** Resolved playbook label for a session (matches film UI / `COALESCE(offensive_playbook, my_playbook)`). */
export function playbookForGame(g: Pick<GameRow, "offensive_playbook" | "my_playbook">): string {
  const o = (g.offensive_playbook ?? "").trim();
  if (o) return o;
  return (g.my_playbook ?? "").trim();
}

/** Optional `playbook` query param for tendencies APIs (exact match to `playbookForGame` per session). */
export function parsePlaybookFilter(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  return t ? t : null;
}

/** Sessions that have a usable playbook label for tendencies (offensive_playbook or my_playbook). */
export function gamesWithOffensivePlaybookOnly(games: GameRow[]): GameRow[] {
  return games.filter((g) => playbookForGame(g).trim().length > 0);
}

export function filterGameRowsByOffensivePlaybook(games: GameRow[], playbook: string | null): GameRow[] {
  if (!playbook?.trim()) return games;
  const p = playbook.trim();
  return games.filter((g) => playbookForGame(g) === p);
}

export async function fetchDistinctOffensivePlaybooks(supabase: SupabaseClient, userId?: string): Promise<string[]> {
  let query = supabase
    .from("game_sessions")
    .select("offensive_playbook, my_playbook")
    .neq("import_source", GAME_SESSION_IMPORT_SOURCE_ONBOARDING);
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query;
  if (error) {
    console.error("distinct game_sessions playbooks:", error);
    return [];
  }
  const set = new Set<string>();
  for (const row of data ?? []) {
    const v = playbookForGame(row as GameRow);
    if (v.trim()) set.add(v.trim());
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Dropdown source for tendencies playbook filter: logged games only. */
export async function fetchDistinctTendenciesPlaybooks(supabase: SupabaseClient, userId?: string): Promise<string[]> {
  return fetchDistinctOffensivePlaybooks(supabase, userId);
}

export async function fetchGamesOrdered(supabase: SupabaseClient, userId?: string): Promise<GameRow[]> {
  let query = supabase
    .from("game_sessions")
    .select("id, my_playbook, offensive_playbook, opponent_team, game_date, result, my_score, opponent_score")
    .neq("import_source", GAME_SESSION_IMPORT_SOURCE_ONBOARDING);
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query.order("game_date", { ascending: false });
  if (error) {
    console.error("tendencies fetch games:", error);
    return [];
  }
  return (data ?? []) as GameRow[];
}

export function resolveFilteredGameIds(
  games: GameRow[],
  scope: TendencyScope,
  opponentTeam: string | null,
): string[] {
  if (games.length === 0) return [];
  if (scope === "all") return games.map((g) => g.id);
  if (scope === "last5") return games.slice(0, 5).map((g) => g.id);
  if (scope === "last10") return games.slice(0, 10).map((g) => g.id);
  if (scope === "opponent" && opponentTeam) {
    const target = opponentTeam.trim().toLowerCase();
    return games.filter((g) => g.opponent_team.trim().toLowerCase() === target).map((g) => g.id);
  }
  return games.map((g) => g.id);
}

export async function fetchLoggedPlaysForGames(
  supabase: SupabaseClient,
  gameIds: string[],
  userId?: string,
): Promise<LoggedPlayRow[]> {
  if (gameIds.length === 0) return [];
  const chunkSize = 120;
  const out: LoggedPlayRow[] = [];
  for (let i = 0; i < gameIds.length; i += chunkSize) {
    const slice = gameIds.slice(i, i + chunkSize);
    let query = supabase
      .from("logged_plays")
      .select(
        "id, game_session_id, drive_id, play_number, down, distance, is_inches, formation, play_name, yards_gained, result_tag, scenario, is_success",
      )
      .in("game_session_id", slice);
    if (userId) query = query.eq("user_id", userId);
    const { data, error } = await query;
    if (error) {
      console.error("tendencies fetch plays:", error);
      continue;
    }
    out.push(
      ...((data ?? []) as LoggedPlayRow[]).map((row) => ({
        ...row,
        play_name: normalizePlayName(row.play_name ?? ""),
      })),
    );
  }
  return out.filter((play) => !isPunt(play));
}

type PlayLookupKey = string;

function normalizeLookupPart(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

function sanitizeIlikeTerm(raw: string): string {
  return raw.replace(/[%_"]/g, (m) => `\\${m}`).trim();
}

/** Normalized (playbook, formation, play_name) key — must match SQL `LOWER(TRIM(...))` join semantics via the same normalization ladder. */
export function playTypeLookupKey(playbook: string, formation: string, playName: string): PlayLookupKey {
  return `${normalizeLookupPart(playbook)}|${normalizeLookupPart(formation)}|${normalizePlayName(playName).toLowerCase()}`;
}

export type CfbPlayTypeMapOptions = {
  sideOfBall?: CatalogSideOfBall;
  gameVersion?: CatalogGameVersion | string;
};

export async function fetchCfbPlayTypeMap(
  supabase: SupabaseClient,
  playbooks: string[],
  options?: CfbPlayTypeMapOptions,
): Promise<Map<PlayLookupKey, string>> {
  const books = [...new Set(playbooks.map((p) => p.trim()).filter(Boolean))];
  const map = new Map<PlayLookupKey, string>();
  if (books.length === 0) return map;

  const gameVersion = options?.gameVersion?.trim()
    ? parseCatalogGameVersion(options.gameVersion)
    : CFB_CATALOG_GAME_VERSION;

  const chunkSize = 8;
  for (let i = 0; i < books.length; i += chunkSize) {
    const slice = books.slice(i, i + chunkSize);
    const ilikeFilters = slice
      .map((book) => sanitizeIlikeTerm(book))
      .filter(Boolean)
      .map((book) => `playbook.ilike."${book}"`)
      .join(",");
    let withPlayTypeQuery = supabase
      .from("playbooks")
      .select("playbook, formation, play_name, play_type")
      .eq("game_version", gameVersion);
    if (options?.sideOfBall) {
      withPlayTypeQuery = withPlayTypeQuery.eq("side_of_ball", options.sideOfBall);
    }
    let data: { playbook: unknown; formation: unknown; play_name: unknown; play_type?: unknown }[] | null = null;
    let error: { message?: string } | null = null;
    const withPlayTypeResult = ilikeFilters ? await withPlayTypeQuery.or(ilikeFilters) : await withPlayTypeQuery.in("playbook", slice);
    data = (withPlayTypeResult.data as typeof data) ?? null;
    error = withPlayTypeResult.error as typeof error;
    const errorMessage =
      error && typeof error === "object" && "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
    if (errorMessage && /play_type/i.test(errorMessage) && /column/i.test(errorMessage)) {
      console.warn("[Tendencies] playbooks.play_type missing; falling back to play_name-derived type.");
      let fallbackQuery = supabase
        .from("playbooks")
        .select("playbook, formation, play_name")
        .eq("game_version", gameVersion);
      if (options?.sideOfBall) {
        fallbackQuery = fallbackQuery.eq("side_of_ball", options.sideOfBall);
      }
      const fallbackResult = ilikeFilters ? await fallbackQuery.or(ilikeFilters) : await fallbackQuery.in("playbook", slice);
      data = ((fallbackResult.data ?? []) as { playbook: unknown; formation: unknown; play_name: unknown }[]).map((row) => ({
        ...row,
        play_type: "",
      }));
      error = fallbackResult.error as typeof error;
    }
    if (error) {
      console.error("tendencies playbooks:", error);
      continue;
    }
    for (const row of data ?? []) {
      const pb = String(row.playbook ?? "").trim();
      const f = String(row.formation ?? "").trim();
      const n = normalizePlayName(String(row.play_name ?? ""));
      const pt = String(row.play_type ?? "").trim();
      if (!pb || !f || !n) continue;
      map.set(playTypeLookupKey(pb, f, n), pt);
    }
  }
  return map;
}

export function attachPlayTypes(
  plays: LoggedPlayRow[],
  gamesById: Map<string, GameRow>,
  cfbTypes: Map<PlayLookupKey, string>,
  catalogPlaybookLabel?: string,
): { bucket: PlayTypeBucket; matched: boolean; rawType: string }[] {
  return plays.map((p) => {
    const g = gamesById.get(p.game_session_id);
    const pb =
      (catalogPlaybookLabel ?? "").trim() ||
      (g ? playbookForGame(g) : "");
    const key = pb ? playTypeLookupKey(pb, p.formation, p.play_name) : "";
    const matched = key ? cfbTypes.has(key) : false;
    // QA24: Tendencies prefer `playbooks.play_type` via this map (`fetchCfbPlayTypeMap`); Film/Play Sheet UI reads the same column through `/api/cfb26-plays` + scenario enrichment.
    const fromLookup = matched ? (cfbTypes.get(key) ?? "").trim() : "";
    const derived = deriveCfbPlayTypeFromName(p.play_name);
    let raw = fromLookup || derived;
    // Catalog rows are often generic (e.g. quick_pass / PASS). Name ladder picks Screen, PA, RPO, Option — use it for Tendencies.
    if (derived && derivedRawOverridesCatalogForTendencies(derived)) {
      raw = derived;
    }
    if (fromLookup && shouldOverrideCfbPassLabelToRun(p.play_name, fromLookup)) {
      raw = "inside_run";
    }
    return { bucket: categorizeCfbPlayType(raw), matched, rawType: raw };
  });
}

/** Success = standard analytics rule (down-aware); see `isStandardSuccessfulPlay` in `loggedPlaySuccess.ts`. */
export function isSuccessPlay(p: LoggedPlayRow): boolean {
  return isStandardSuccessfulPlay(p);
}

export { isStandardSuccessfulPlay };

function normalizedResultTag(p: LoggedPlayRow): string {
  return (p.result_tag ?? "").toUpperCase().replace(/\s+/g, "_");
}

export function isTouchdownPlay(p: LoggedPlayRow): boolean {
  return normalizedResultTag(p) === "TOUCHDOWN";
}

/** First-down result only (not tagged as touchdown). */
export function isFirstDownResultPlay(p: LoggedPlayRow): boolean {
  return normalizedResultTag(p) === "FIRST_DOWN";
}

export type FormationPlayAggSort = "composite" | "success_rate";

/** Composite ranking: (TD×50) + (1st×5) + (total yards / uses). */
export function compositePlayScore(touchdowns: number, firstDowns: number, totalYards: number, uses: number): number {
  if (uses <= 0) return 0;
  return touchdowns * 50 + firstDowns * 5 + totalYards / uses;
}

export function aggregateByFormationPlay(
  plays: LoggedPlayRow[],
  minUses: number,
  sort: FormationPlayAggSort = "composite",
  countSuccess: (p: LoggedPlayRow) => boolean = isSuccessPlay,
) {
  type Agg = { uses: number; yards: number; successes: number; touchdowns: number; first_downs: number };
  const m = new Map<string, Agg>();
  for (const p of plays) {
    const pn = normalizePlayName(p.play_name ?? "");
    const k = `${p.formation}\u0000${pn}`;
    const a = m.get(k) ?? { uses: 0, yards: 0, successes: 0, touchdowns: 0, first_downs: 0 };
    a.uses += 1;
    a.yards += p.yards_gained ?? 0;
    if (countSuccess(p)) a.successes += 1;
    if (isTouchdownPlay(p)) a.touchdowns += 1;
    else if (isFirstDownResultPlay(p)) a.first_downs += 1;
    m.set(k, a);
  }
  const rows = [...m.entries()]
    .map(([key, a]) => {
      const [formation, play_name] = key.split("\u0000");
      const success_rate = a.uses ? Math.round((a.successes * 100) / a.uses) : 0;
      const avg_yards = a.uses ? Math.round((a.yards / a.uses) * 10) / 10 : 0;
      const composite_score = compositePlayScore(a.touchdowns, a.first_downs, a.yards, a.uses);
      return {
        formation,
        play_name,
        uses: a.uses,
        avg_yards,
        touchdowns: a.touchdowns,
        first_downs: a.first_downs,
        composite_score,
        success_rate,
      };
    })
    .filter((r) => r.uses >= minUses)
    .sort((a, b) => {
      if (sort === "success_rate") {
        return b.success_rate - a.success_rate || b.uses - a.uses || b.composite_score - a.composite_score;
      }
      return (
        b.composite_score - a.composite_score ||
        b.touchdowns - a.touchdowns ||
        b.first_downs - a.first_downs ||
        b.uses - a.uses
      );
    });
  return rows;
}

export type ReconsiderAggRow = {
  uses: number;
  touchdowns: number;
  first_downs: number;
  avg_yards: number;
};

/**
 * Plays to Reconsider: 3+ uses, 0 TD, under 3.0 yds/use — or 4+ uses with 0 TD and 0 first downs.
 */
export function qualifiesForReconsiderPlay(r: ReconsiderAggRow): boolean {
  if (r.touchdowns !== 0) return false;
  const lowMovement = r.uses >= 3 && r.avg_yards < 3.0;
  const noConversions = r.uses >= 4 && r.first_downs === 0;
  return lowMovement || noConversions;
}

export function mostCommonScenarioByFormationPlay(plays: LoggedPlayRow[]): Map<string, string> {
  const scenarioCounts = new Map<string, Map<string, number>>();
  for (const p of plays) {
    const key = `${p.formation}\u0000${normalizePlayName(p.play_name ?? "")}`;
    const sc = p.scenario?.trim() || "Unknown";
    if (!scenarioCounts.has(key)) {
      scenarioCounts.set(key, new Map<string, number>());
    }
    const row = scenarioCounts.get(key)!;
    row.set(sc, (row.get(sc) ?? 0) + 1);
  }

  const out = new Map<string, string>();
  for (const [key, counts] of scenarioCounts.entries()) {
    let winner = "Unknown";
    let max = -1;
    for (const [scenario, count] of counts.entries()) {
      if (count > max) {
        winner = scenario;
        max = count;
      }
    }
    out.set(key, winner);
  }
  return out;
}

export function aggregateByFormation(plays: LoggedPlayRow[], minUses: number) {
  type Agg = { uses: number; yards: number; successes: number; touchdowns: number; first_downs: number };
  const m = new Map<string, Agg>();
  for (const p of plays) {
    const f = p.formation;
    const a = m.get(f) ?? { uses: 0, yards: 0, successes: 0, touchdowns: 0, first_downs: 0 };
    a.uses += 1;
    a.yards += p.yards_gained ?? 0;
    if (isSuccessPlay(p)) a.successes += 1;
    if (isTouchdownPlay(p)) a.touchdowns += 1;
    else if (isFirstDownResultPlay(p)) a.first_downs += 1;
    m.set(f, a);
  }
  return [...m.entries()]
    .map(([formation, a]) => {
      const avg_yards = a.uses ? Math.round((a.yards / a.uses) * 10) / 10 : 0;
      const composite_score = compositePlayScore(a.touchdowns, a.first_downs, a.yards, a.uses);
      return {
        formation,
        uses: a.uses,
        avg_yards,
        touchdowns: a.touchdowns,
        first_downs: a.first_downs,
        composite_score,
        success_rate: a.uses ? Math.round((a.successes * 100) / a.uses) : 0,
      };
    })
    .filter((r) => r.uses >= minUses)
    .sort(
      (a, b) =>
        b.composite_score - a.composite_score ||
        b.touchdowns - a.touchdowns ||
        b.first_downs - a.first_downs ||
        b.uses - a.uses,
    );
}

export function bestPlayForFormation(plays: LoggedPlayRow[], formation: string, minUses: number) {
  const subset = plays.filter((p) => p.formation === formation);
  const ranked = aggregateByFormationPlay(subset, minUses, "composite");
  return ranked[0] ?? null;
}

export async function motionStatsForPlaybook(supabase: SupabaseClient, playbook: string) {
  const pb = playbook.trim();
  if (!pb) return { motionPlays: 0, totalPlays: 0, motionPct: 0 };
  const { data, error } = await supabase
    .from("playbooks")
    .select("play_name")
    .eq("game_version", CFB_CATALOG_GAME_VERSION)
    .ilike("playbook", playbookIlikeExactPattern(pb));
  if (error) return { motionPlays: 0, totalPlays: 0, motionPct: 0 };
  const names = (data ?? []).map((r) => normalizePlayName(String(r.play_name ?? "")));
  let motion = 0;
  for (const n of names) {
    const u = n.trim().toUpperCase();
    if (u.startsWith("MTN") || u.startsWith("JET")) motion += 1;
  }
  const total = names.length;
  const motionPct = total ? Math.round((motion * 1000) / total) / 10 : 0;
  return { motionPlays: motion, totalPlays: total, motionPct };
}

export function motionUsageStats(plays: LoggedPlayRow[]): { motion_plays: number; total_plays: number; pct: number } {
  if (!plays.length) return { motion_plays: 0, total_plays: 0, pct: 0 };
  let m = 0;
  for (const p of plays) {
    const u = normalizePlayName(p.play_name ?? "");
    if (u.startsWith("MTN") || u.startsWith("JET")) m += 1;
  }
  const total = plays.length;
  return { motion_plays: m, total_plays: total, pct: Math.round((m * 1000) / total) / 10 };
}

export function userMotionRate(plays: LoggedPlayRow[]): number {
  return motionUsageStats(plays).pct;
}

/** TDs only (not first downs) in Red Zone + Goal Line scenarios. */
export function redZoneTdStats(plays: LoggedPlayRow[]): { touchdowns: number; plays: number; pct: number } {
  const rz = plays.filter((p) => {
    const s = (p.scenario ?? "").trim();
    return s === "Red Zone" || s === "Goal Line";
  });
  const n = rz.length;
  if (n === 0) return { touchdowns: 0, plays: 0, pct: 0 };
  const td = rz.filter((p) => {
    const t = (p.result_tag ?? "").toUpperCase().replace(/\s+/g, "_");
    return t === "TOUCHDOWN";
  }).length;
  return { touchdowns: td, plays: n, pct: Math.round((td * 1000) / n) / 10 };
}

/** 3rd & Short / Medium / Long: standard success (conversion tags or down-aware rule). */
export function thirdDownConvStats(plays: LoggedPlayRow[]): { conversions: number; plays: number; pct: number } {
  const third = plays.filter((p) => {
    const s = (p.scenario ?? "").trim();
    return s === "3rd & Short" || s === "3rd & Medium" || s === "3rd & Long";
  });
  const n = third.length;
  if (n === 0) return { conversions: 0, plays: 0, pct: 0 };
  const conv = third.filter(isSuccessPlay).length;
  return { conversions: conv, plays: n, pct: Math.round((conv * 1000) / n) / 10 };
}

/** Map legacy / alternate scenario labels onto canonical `TENDENCIES_SCENARIOS` keys. */
function tendenciesScenarioKey(raw: string | null | undefined): string {
  const t = (raw ?? "").trim();
  if (!t) return "Other";
  if (Object.prototype.hasOwnProperty.call(SCENARIO_SHORT, t)) {
    return SCENARIO_SHORT[t as keyof typeof SCENARIO_SHORT];
  }
  return t;
}

export type ScoutingTopPlayRow = {
  play_name: string;
  formation: string;
  success_rate: number;
  uses: number;
};

/**
 * Top calls for scouting: group by normalized `play_name` only (same call from different formations rolls up).
 * Sort by call count descending. `formation` is the most frequent formation paired with that play in the slice.
 */
export function aggregateTopPlaysByPlayNameFrequency(plays: LoggedPlayRow[], topN: number): ScoutingTopPlayRow[] {
  type Bucket = { uses: number; successes: number; formationCounts: Map<string, number> };
  const m = new Map<string, Bucket>();
  for (const p of plays) {
    const pn = normalizePlayName(p.play_name ?? "");
    if (!pn) continue;
    const f = (p.formation ?? "").trim();
    const b = m.get(pn) ?? { uses: 0, successes: 0, formationCounts: new Map<string, number>() };
    b.uses += 1;
    if (isSuccessPlay(p)) b.successes += 1;
    if (f) b.formationCounts.set(f, (b.formationCounts.get(f) ?? 0) + 1);
    m.set(pn, b);
  }
  const rows: ScoutingTopPlayRow[] = [...m.entries()].map(([play_name, b]) => {
    let formation = "";
    let maxC = -1;
    for (const [fname, c] of b.formationCounts) {
      if (c > maxC) {
        maxC = c;
        formation = fname;
      } else if (c === maxC && fname.localeCompare(formation) < 0) {
        formation = fname;
      }
    }
    return {
      play_name,
      formation,
      uses: b.uses,
      success_rate: b.uses > 0 ? Math.round((b.successes * 100) / b.uses) : 0,
    };
  });
  rows.sort((a, b) => b.uses - a.uses || a.play_name.localeCompare(b.play_name));
  return rows.slice(0, topN);
}

export type ScoutingReportRow = {
  scenario: string;
  total_plays: number;
  run_pct: number;
  pass_pct: number;
  success_pct: number;
  top_play: {
    play_name: string;
    formation: string;
    success_rate: number;
    uses: number;
  } | null;
  top_plays: {
    play_name: string;
    formation: string;
    success_rate: number;
    uses: number;
  }[];
};

/** Situation scouting rows for all canonical situations, including zero-play empty states. */
export function scoutingReportRows(plays: LoggedPlayRow[], buckets: PlayTypeBucket[]): ScoutingReportRow[] {
  const map = new Map<string, { run: number; other: number; success: number }>();
  for (let i = 0; i < plays.length; i++) {
    const p = plays[i];
    if (!p) continue;
    const sc = tendenciesScenarioKey(p.scenario);
    if (sc === "Opening Script") continue;
    const b = buckets[i] ?? "Other";
    const row = map.get(sc) ?? { run: 0, other: 0, success: 0 };
    if (isRunLeanBucket(b)) row.run += 1;
    else row.other += 1;
    if (isSuccessPlay(p)) row.success += 1;
    map.set(sc, row);
  }

  const out: ScoutingReportRow[] = [];
  for (const scenario of SCOUTING_REPORT_SCENARIOS) {
    const counters = map.get(scenario) ?? { run: 0, other: 0, success: 0 };
    const { run, other, success } = counters;
    const total = run + other;
    const run_pct = total > 0 ? Math.round((run * 1000) / total) / 10 : 0;
    const pass_pct = total > 0 ? Math.round((other * 1000) / total) / 10 : 0;
    const success_pct = total > 0 ? Math.round((success * 1000) / total) / 10 : 0;
    const scenarioPlays = plays.filter((p) => tendenciesScenarioKey(p.scenario) === scenario);
    const topRanked = aggregateTopPlaysByPlayNameFrequency(scenarioPlays, 3);
    const top = topRanked[0];
    const top_plays = topRanked.map((entry) => ({
      play_name: entry.play_name,
      formation: entry.formation,
      success_rate: entry.success_rate,
      uses: entry.uses,
    }));
    const top_play = top
      ? {
          play_name: top.play_name,
          formation: top.formation,
          success_rate: top.success_rate,
          uses: top.uses,
        }
      : null;
    out.push({ scenario, total_plays: total, run_pct, pass_pct, success_pct, top_play, top_plays });
  }
  return out;
}

export type ScoutingFormationReportRow = {
  formation: string;
  uses: number;
  snap_pct: number;
  run_pct: number;
  pass_pct: number;
  success_pct: number;
  flag_over_used: boolean;
  flag_under_performing: boolean;
  flag_one_dimensional: boolean;
  top_play: {
    play_name: string;
    formation: string;
    success_rate: number;
    uses: number;
  } | null;
  top_plays: {
    play_name: string;
    formation: string;
    success_rate: number;
    uses: number;
  }[];
};

/**
 * Formations that need attention: over 15% of scoped snaps, or 5+ uses with success below 40%,
 * or 5+ uses with ≥80% run or pass lean. Sorted by success rate ascending (worst first).
 */
export function scoutingFormationReportRows(plays: LoggedPlayRow[], buckets: PlayTypeBucket[]): ScoutingFormationReportRow[] {
  const scopeTotal = plays.length;
  if (scopeTotal === 0) return [];

  const map = new Map<string, { run: number; other: number; success: number }>();
  for (let i = 0; i < plays.length; i++) {
    const p = plays[i];
    if (!p) continue;
    const f = (p.formation ?? "").trim() || "(unknown formation)";
    const b = buckets[i] ?? "Other";
    const row = map.get(f) ?? { run: 0, other: 0, success: 0 };
    if (isRunLeanBucket(b)) row.run += 1;
    else row.other += 1;
    if (isSuccessPlay(p)) row.success += 1;
    map.set(f, row);
  }

  const out: ScoutingFormationReportRow[] = [];
  for (const [formation, { run, other, success }] of map.entries()) {
    const uses = run + other;
    if (uses === 0) continue;
    const snap_pct = Math.round((uses * 1000) / scopeTotal) / 10;
    const run_pct = Math.round((run * 1000) / uses) / 10;
    const pass_pct = Math.round((other * 1000) / uses) / 10;
    const success_pct = Math.round((success * 1000) / uses) / 10;
    const flag_over_used = snap_pct > 15;
    const flag_under_performing = uses >= 5 && success_pct < 40;
    const flag_one_dimensional = uses >= 5 && (run_pct >= 80 || pass_pct >= 80);
    if (!flag_over_used && !flag_under_performing && !flag_one_dimensional) continue;

    const subset = plays.filter((p) => ((p.formation ?? "").trim() || "(unknown formation)") === formation);
    const rankedByFrequency = aggregateTopPlaysByPlayNameFrequency(subset, 3);
    const best = rankedByFrequency[0];
    const top_plays = rankedByFrequency.map((row) => ({
      play_name: row.play_name,
      formation: row.formation || formation,
      success_rate: row.success_rate,
      uses: row.uses,
    }));
    const top_play = best
      ? {
          play_name: best.play_name,
          formation: best.formation,
          success_rate: best.success_rate,
          uses: best.uses,
        }
      : null;

    out.push({
      formation,
      uses,
      snap_pct,
      run_pct,
      pass_pct,
      success_pct,
      flag_over_used,
      flag_under_performing,
      flag_one_dimensional,
      top_play,
      top_plays,
    });
  }

  return out.sort((a, b) => a.success_pct - b.success_pct);
}

export function playTypeCounts(buckets: PlayTypeBucket[]) {
  const c: Record<PlayTypeBucket, number> = { Run: 0, Pass: 0, "Play Action": 0, Screen: 0, RPO: 0, Option: 0, Other: 0 };
  for (const b of buckets) c[b] += 1;
  return c;
}

export function formationFrequency(plays: LoggedPlayRow[]) {
  const total = plays.length || 1;
  const m = new Map<string, number>();
  for (const p of plays) {
    const f = p.formation;
    m.set(f, (m.get(f) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([formation, count]) => ({
      formation,
      count,
      pct: Math.round((count * 1000) / total) / 10,
    }))
    .sort((a, b) => b.count - a.count);
}
