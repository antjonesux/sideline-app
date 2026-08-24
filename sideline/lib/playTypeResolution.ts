/**
 * Phase 1 — Supabase `the-sideline-app` baseline (2026-04-20, MCP `execute_sql`):
 * - COUNT diagnostics on `logged_plays.play_type` failed: column does not exist (42703).
 *
 * Code-path audit:
 * - Tendencies: `fetchLoggedPlaysForGames` omits `play_type`; `fetchCfbPlayTypeMap` + `attachPlayTypes`
 *   resolve type from `playbooks` using playbook labels from `game_sessions` (`playbookForGame`), with
 *   case-insensitive playbook matching (`ilike` / `or` filters). On catalog hits, `attachPlayTypes` can still
 *   prefer `deriveCfbPlayTypeFromName` for Screen / Play Action / RPO / Option so distribution matches call names.
 * - Film (play browser / suggestions / yardage): `/api/cfb26-plays` used `.eq("playbook", …)` (Postgres case-sensitive).
 * - Play Sheet: `/api/playbook/[id]/plays` duplicated lookup-key logic and used `.eq("playbook", …)` for the type map.
 *
 * Diagnosis: Hypothesis B (missing / divergent join path vs Tendencies) plus case-sensitivity on the playbook filter
 * (Hypothesis C on the `playbooks.playbook` predicate, not on formation/name keys — those already match Tendencies).
 * `logged_plays.play_type` was not populated in production; adding it keeps Film/API responses aligned with Tendencies.
 *
 * Numbered personnel calls (e.g. `94 WILL`): `playbooks.play_type` often marks them as pass family; `playbook.ts`
 * `shouldOverrideCfbPassLabelToRun` forces RUN when the play name matches `playNameLooksLikeNumberedPersonnelCall` and
 * has no explicit pass/RPO tokens (same rule in Tendencies `attachPlayTypes`).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { parseCatalogGameVersion } from "@/lib/constants";
import { FILM_LOGGER_SPECIAL_TEAMS_PLAYS } from "@/lib/filmLoggerSpecialTeams";
import {
  resolveDefensiveDisplayPlayType,
  type DefensivePlayType,
} from "@/lib/defensivePlayTypeResolution";
import { resolveCfbDisplayPlayType, type OffensiveCatalogPlayType, type PlaybookEntry } from "@/lib/playbook";
import { normalizePlayName } from "@/lib/utils";
import {
  fetchCfbPlayTypeMap,
  playbookForGame,
  playTypeLookupKey,
  type CfbPlayTypeMapOptions,
  type GameRow,
} from "@/lib/tendenciesServer";

export type CanonicalPlayType = PlaybookEntry["play_type"];

export {
  fetchCfbPlayTypeMap,
  playbookForGame,
  playTypeLookupKey,
  type CfbPlayTypeMapOptions,
  type GameRow,
} from "@/lib/tendenciesServer";

/** Playbook label for play-type lookup — offense uses coach playbook; defense uses opponent scheme catalog. */
export function playbookForDriveSide(
  game: GameRow & { opponent_scheme?: string | null },
  sideOfBall: "offense" | "defense",
): string {
  if (sideOfBall === "defense") {
    return String(game.opponent_scheme ?? "").trim();
  }
  return playbookForGame(game);
}

/** Prefer granular `playbooks.play_type` from the lookup map, then stored `logged_plays.play_type`, then name ladder (same as Tendencies `attachPlayTypes`). */
export function coalesceCfbAndLoggedPlayType(
  playName: string,
  fromCfbLookup: string | undefined,
  loggedPlayType: string | null | undefined,
): OffensiveCatalogPlayType {
  if ((fromCfbLookup ?? "").trim()) {
    return resolveCfbDisplayPlayType(playName, fromCfbLookup);
  }
  if ((loggedPlayType ?? "").trim()) {
    return resolveCfbDisplayPlayType(playName, loggedPlayType);
  }
  return resolveCfbDisplayPlayType(playName, null);
}

export async function loadCfbPlayTypeMapForPlaybooks(
  supabase: SupabaseClient,
  playbooks: string[],
  options?: CfbPlayTypeMapOptions,
): Promise<Map<string, string>> {
  const books = [...new Set(playbooks.map((p) => p.trim()).filter(Boolean))];
  return fetchCfbPlayTypeMap(supabase, books, options);
}

export type GameSessionForPlayType = GameRow & {
  opponent_scheme?: string | null;
  game_version?: string | null;
};

/** Catalog lookup options for a logged drive — defense uses scheme catalog + session game version. */
export function cfbPlayTypeMapOptionsForDriveSide(
  game: GameSessionForPlayType,
  sideOfBall: "offense" | "defense",
): CfbPlayTypeMapOptions | undefined {
  if (sideOfBall !== "defense") return undefined;
  return {
    sideOfBall: "defense",
    gameVersion: parseCatalogGameVersion(game.game_version ?? undefined),
  };
}

export async function loadCfbPlayTypeMapForDriveSide(
  supabase: SupabaseClient,
  game: GameSessionForPlayType,
  sideOfBall: "offense" | "defense",
): Promise<{ playbook: string; typeMap: Map<string, string> }> {
  const playbook = playbookForDriveSide(game, sideOfBall);
  if (!playbook) return { playbook: "", typeMap: new Map() };
  const typeMap = await loadCfbPlayTypeMapForPlaybooks(
    supabase,
    [playbook],
    cfbPlayTypeMapOptionsForDriveSide(game, sideOfBall),
  );
  return { playbook, typeMap };
}

export function storedPlayTypeFromMap(
  offensivePlaybookLabel: string,
  formation: string,
  playName: string,
  map: Map<string, string>,
  existingLoggedType: string | null | undefined,
): OffensiveCatalogPlayType {
  const key = playTypeLookupKey(offensivePlaybookLabel, formation, playName);
  const fromCfb = map.get(key);
  return coalesceCfbAndLoggedPlayType(playName, fromCfb, existingLoggedType);
}

/** Defensive drives — MAN/ZONE/BLITZ/MATCH from name ladder; never offensive RUN/PASS/RPO. */
export function storedDefensivePlayType(
  playName: string,
  existingLoggedType: string | null | undefined,
): DefensivePlayType | null {
  return resolveDefensiveDisplayPlayType(playName, existingLoggedType);
}

export function storedPlayTypeForDriveSide(
  sideOfBall: "offense" | "defense",
  playbookLabel: string,
  formation: string,
  playName: string,
  map: Map<string, string>,
  existingLoggedType: string | null | undefined,
): CanonicalPlayType | null {
  if (sideOfBall === "defense") {
    return storedDefensivePlayType(playName, existingLoggedType);
  }
  return storedPlayTypeFromMap(playbookLabel, formation, playName, map, existingLoggedType);
}

const SPECIAL_TEAMS_FORMATION_LC = FILM_LOGGER_SPECIAL_TEAMS_PLAYS[0]?.formation.trim().toLowerCase() ?? "";

const SPECIAL_TEAMS_PLAY_NAMES_LC = new Set(
  FILM_LOGGER_SPECIAL_TEAMS_PLAYS.map((p) => normalizePlayName(p.play_name).toLowerCase()).filter(Boolean),
);

/**
 * Film Browse Special Teams picks (formation + play_name aligned with `FILM_LOGGER_SPECIAL_TEAMS_PLAYS`).
 * Used to omit those rows from offensive-only lists (e.g. Plays to Reconsider). Punt is usually stripped earlier in tendencies fetch.
 */
export function isSpecialTeamsFormationPlayRow(formation: string, playName: string): boolean {
  if (!SPECIAL_TEAMS_FORMATION_LC) return false;
  if (formation.trim().toLowerCase() !== SPECIAL_TEAMS_FORMATION_LC) return false;
  const pn = normalizePlayName(playName).toLowerCase();
  return SPECIAL_TEAMS_PLAY_NAMES_LC.has(pn);
}
