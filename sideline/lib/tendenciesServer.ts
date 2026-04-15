import type { SupabaseClient } from "@supabase/supabase-js";
import { categorizeCfbPlayType, deriveCfbPlayTypeFromName, isRunLeanBucket, type PlayTypeBucket } from "@/lib/tendenciesPlayType";

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
  down: number;
  distance: number;
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

export async function fetchGamesOrdered(supabase: SupabaseClient): Promise<GameRow[]> {
  const { data, error } = await supabase
    .from("game_sessions")
    .select("id, my_playbook, offensive_playbook, opponent_team, game_date, result, my_score, opponent_score")
    .order("game_date", { ascending: false });
  if (error) {
    console.error("tendencies fetch games:", error);
    return [];
  }
  return (data ?? []) as GameRow[];
}

export function playbookForGame(g: Pick<GameRow, "offensive_playbook" | "my_playbook">): string {
  const o = (g.offensive_playbook ?? "").trim();
  if (o) return o;
  return (g.my_playbook ?? "").trim();
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
): Promise<LoggedPlayRow[]> {
  if (gameIds.length === 0) return [];
  const chunkSize = 120;
  const out: LoggedPlayRow[] = [];
  for (let i = 0; i < gameIds.length; i += chunkSize) {
    const slice = gameIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("logged_plays")
      .select("id, game_session_id, drive_id, play_number, down, distance, formation, play_name, yards_gained, result_tag, scenario, is_success")
      .in("game_session_id", slice);
    if (error) {
      console.error("tendencies fetch plays:", error);
      continue;
    }
    out.push(...((data ?? []) as LoggedPlayRow[]));
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

function lookupKey(playbook: string, formation: string, playName: string): PlayLookupKey {
  return `${normalizeLookupPart(playbook)}|${normalizeLookupPart(formation)}|${normalizeLookupPart(playName)}`;
}

export async function fetchCfbPlayTypeMap(
  supabase: SupabaseClient,
  playbooks: string[],
): Promise<Map<PlayLookupKey, string>> {
  const books = [...new Set(playbooks.map((p) => p.trim()).filter(Boolean))];
  const map = new Map<PlayLookupKey, string>();
  if (books.length === 0) return map;

  const chunkSize = 8;
  for (let i = 0; i < books.length; i += chunkSize) {
    const slice = books.slice(i, i + chunkSize);
    const ilikeFilters = slice
      .map((book) => sanitizeIlikeTerm(book))
      .filter(Boolean)
      .map((book) => `playbook.ilike."${book}"`)
      .join(",");
    const withPlayTypeQuery = supabase.from("cfb26_plays").select("playbook, formation, play_name, play_type");
    let data: { playbook: unknown; formation: unknown; play_name: unknown; play_type?: unknown }[] | null = null;
    let error: { message?: string } | null = null;
    const withPlayTypeResult = ilikeFilters ? await withPlayTypeQuery.or(ilikeFilters) : await withPlayTypeQuery.in("playbook", slice);
    data = (withPlayTypeResult.data as typeof data) ?? null;
    error = withPlayTypeResult.error as typeof error;
    const errorMessage =
      error && typeof error === "object" && "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
    if (errorMessage && /play_type/i.test(errorMessage) && /column/i.test(errorMessage)) {
      console.warn("[Tendencies] cfb26_plays.play_type missing; falling back to play_name-derived type.");
      const fallbackQuery = supabase.from("cfb26_plays").select("playbook, formation, play_name");
      const fallbackResult = ilikeFilters ? await fallbackQuery.or(ilikeFilters) : await fallbackQuery.in("playbook", slice);
      data = ((fallbackResult.data ?? []) as { playbook: unknown; formation: unknown; play_name: unknown }[]).map((row) => ({
        ...row,
        play_type: "",
      }));
      error = fallbackResult.error as typeof error;
    }
    if (error) {
      console.error("tendencies cfb26_plays:", error);
      continue;
    }
    for (const row of data ?? []) {
      const pb = String(row.playbook ?? "").trim();
      const f = String(row.formation ?? "").trim();
      const n = String(row.play_name ?? "").trim();
      const pt = String(row.play_type ?? "").trim();
      if (!pb || !f || !n) continue;
      map.set(lookupKey(pb, f, n), pt);
    }
  }
  return map;
}

export function attachPlayTypes(
  plays: LoggedPlayRow[],
  gamesById: Map<string, GameRow>,
  cfbTypes: Map<PlayLookupKey, string>,
): { bucket: PlayTypeBucket; matched: boolean; rawType: string }[] {
  return plays.map((p) => {
    const g = gamesById.get(p.game_session_id);
    const pb = g ? playbookForGame(g) : "";
    const key = pb ? lookupKey(pb, p.formation, p.play_name) : "";
    const matched = key ? cfbTypes.has(key) : false;
    const fromLookup = matched ? (cfbTypes.get(key) ?? "").trim() : "";
    const derived = deriveCfbPlayTypeFromName(p.play_name);
    const raw = fromLookup || derived;
    return { bucket: categorizeCfbPlayType(raw), matched, rawType: raw };
  });
}

export function isSuccessPlay(p: LoggedPlayRow): boolean {
  if (p.is_success === true) return true;
  const t = (p.result_tag ?? "").toUpperCase().replace(/\s+/g, "_");
  return t === "FIRST_DOWN" || t === "TOUCHDOWN";
}

export function aggregateByFormationPlay(plays: LoggedPlayRow[], minUses: number) {
  type Agg = { uses: number; yards: number; successes: number };
  const m = new Map<string, Agg>();
  for (const p of plays) {
    const k = `${p.formation}\u0000${p.play_name}`;
    const a = m.get(k) ?? { uses: 0, yards: 0, successes: 0 };
    a.uses += 1;
    a.yards += p.yards_gained ?? 0;
    if (isSuccessPlay(p)) a.successes += 1;
    m.set(k, a);
  }
  const rows = [...m.entries()]
    .map(([key, a]) => {
      const [formation, play_name] = key.split("\u0000");
      const success_rate = a.uses ? Math.round((a.successes * 100) / a.uses) : 0;
      return {
        formation,
        play_name,
        uses: a.uses,
        avg_yards: a.uses ? Math.round((a.yards / a.uses) * 10) / 10 : 0,
        success_rate,
      };
    })
    .filter((r) => r.uses >= minUses)
    .sort((a, b) => b.success_rate - a.success_rate || b.uses - a.uses);
  return rows;
}

export function mostCommonScenarioByFormationPlay(plays: LoggedPlayRow[]): Map<string, string> {
  const scenarioCounts = new Map<string, Map<string, number>>();
  for (const p of plays) {
    const key = `${p.formation}\u0000${p.play_name}`;
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
  type Agg = { uses: number; yards: number; successes: number };
  const m = new Map<string, Agg>();
  for (const p of plays) {
    const f = p.formation;
    const a = m.get(f) ?? { uses: 0, yards: 0, successes: 0 };
    a.uses += 1;
    a.yards += p.yards_gained ?? 0;
    if (isSuccessPlay(p)) a.successes += 1;
    m.set(f, a);
  }
  return [...m.entries()]
    .map(([formation, a]) => ({
      formation,
      uses: a.uses,
      avg_yards: a.uses ? Math.round((a.yards / a.uses) * 10) / 10 : 0,
      success_rate: a.uses ? Math.round((a.successes * 100) / a.uses) : 0,
    }))
    .filter((r) => r.uses >= minUses)
    .sort((a, b) => b.success_rate - a.success_rate || b.uses - a.uses);
}

export function bestPlayForFormation(plays: LoggedPlayRow[], formation: string, minUses: number) {
  const subset = plays.filter((p) => p.formation === formation);
  const ranked = aggregateByFormationPlay(subset, minUses);
  return ranked[0] ?? null;
}

export async function motionStatsForPlaybook(supabase: SupabaseClient, playbook: string) {
  const pb = playbook.trim();
  if (!pb) return { motionPlays: 0, totalPlays: 0, motionPct: 0 };
  const { data, error } = await supabase.from("cfb26_plays").select("play_name").eq("playbook", pb);
  if (error) return { motionPlays: 0, totalPlays: 0, motionPct: 0 };
  const names = (data ?? []).map((r) => String(r.play_name ?? ""));
  let motion = 0;
  for (const n of names) {
    const u = n.trim().toUpperCase();
    if (u.startsWith("MTN") || u.startsWith("JET")) motion += 1;
  }
  const total = names.length;
  const motionPct = total ? Math.round((motion * 1000) / total) / 10 : 0;
  return { motionPlays: motion, totalPlays: total, motionPct };
}

export function userMotionRate(plays: LoggedPlayRow[]): number {
  if (!plays.length) return 0;
  let m = 0;
  for (const p of plays) {
    const u = (p.play_name ?? "").trim().toUpperCase();
    if (u.startsWith("MTN") || u.startsWith("JET")) m += 1;
  }
  return Math.round((m * 1000) / plays.length) / 10;
}

const SCENARIO_ORDER = [
  "1st Down",
  "2nd & Short",
  "2nd & Medium",
  "2nd & Long",
  "3rd & Short",
  "3rd & Medium",
  "3rd & Long",
  "4th Down",
  "Red Zone",
  "Goal Line",
  "Backed Up",
];

function scenarioSortKey(s: string): number {
  const i = SCENARIO_ORDER.indexOf(s);
  return i === -1 ? 999 : i;
}

export function situationRunPassRows(plays: LoggedPlayRow[], buckets: PlayTypeBucket[]) {
  const map = new Map<string, { run: number; other: number }>();
  for (let i = 0; i < plays.length; i++) {
    const sc = plays[i]?.scenario ?? "Other";
    const b = buckets[i] ?? "Other";
    const row = map.get(sc) ?? { run: 0, other: 0 };
    if (isRunLeanBucket(b)) row.run += 1;
    else row.other += 1;
    map.set(sc, row);
  }
  return [...map.entries()]
    .map(([scenario, { run, other }]) => {
      const total = run + other;
      const run_pct = total ? Math.round((run * 1000) / total) / 10 : 0;
      const flag = run_pct > 75 || run_pct < 25;
      return { scenario, run_pct, total_plays: total, warn: total > 0 && flag };
    })
    .filter((r) => r.total_plays > 0)
    .sort((a, b) => scenarioSortKey(a.scenario) - scenarioSortKey(b.scenario));
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
