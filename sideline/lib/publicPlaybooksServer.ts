import type { CatalogSideOfBall } from "@/lib/constants";
import { resolveDefensiveDisplayPlayType } from "@/lib/defensivePlayTypeResolution";
import {
  resolveCfbBrowserPlayType,
  resolveFormationSection,
  type CatalogPlayType,
} from "@/lib/playbook";
import { playbookIlikeExactPattern } from "@/lib/playbookIlikeExact";
import {
  classifyPlaybook,
  type PublicPlaybookClassification,
} from "@/lib/publicPlaybookClassification";
import {
  DEFENSE_TRAILING_FORMATION_GROUPS,
  OFFENSE_TRAILING_FORMATION_GROUPS,
  pinTrailingFormationGroups,
  sortFormationTypes,
} from "@/lib/playbooks/formation-types";
import { normalizePlayName } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export const PUBLIC_PLAYBOOK_GAME_VERSION = "cfb27" as const;

/** CDN / edge cache for public browse APIs (24h + SWR week). */
export const PUBLIC_PLAYBOOK_API_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
} as const;

/** ISR window for public playbook pages (seconds). */
export const PUBLIC_PLAYBOOK_REVALIDATE_SECONDS = 86400;

export type PublicPlaybookListData = {
  offensiveTeamPlaybooks: string[];
  alternativeOffensivePlaybooks: string[];
  defensivePlaybooks: string[];
};

export type PublicFormationGroup = {
  category: string;
  formations: string[];
};

export type PublicPlaybookFormationsData = {
  name: string;
  side_of_ball: CatalogSideOfBall;
  classification: PublicPlaybookClassification;
  formationGroups: PublicFormationGroup[];
};

type PlaybookSideRow = {
  playbook: string;
  side_of_ball: CatalogSideOfBall;
};

async function fetchDistinctPlaybookSides(gameVersion: string): Promise<PlaybookSideRow[]> {
  const seen = new Map<string, CatalogSideOfBall>();
  const pageSize = 1000;

  for (let offset = 0; offset < 200000; offset += pageSize) {
    const { data, error } = await supabase
      .from("playbooks")
      .select("playbook, side_of_ball")
      .ilike("game_version", gameVersion)
      .not("playbook", "is", null)
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("[publicPlaybooksServer] distinct page:", error);
      throw error;
    }

    const rows = data ?? [];
    for (const row of rows) {
      const name = String((row as { playbook?: string }).playbook ?? "").trim();
      if (!name || name.startsWith("_")) continue;
      const sideRaw = String((row as { side_of_ball?: string }).side_of_ball ?? "").trim();
      const side: CatalogSideOfBall | null =
        sideRaw === "defense" ? "defense" : sideRaw === "offense" ? "offense" : null;
      if (!side) continue;
      // Key includes side so "Multiple" can appear on both offense and defense.
      const key = `${side}:${name}`;
      if (!seen.has(key)) seen.set(key, side);
    }

    if (rows.length < pageSize) break;
  }

  return [...seen.entries()].map(([key, side]) => ({
    playbook: key.slice(key.indexOf(":") + 1),
    side_of_ball: side,
  }));
}

export async function fetchPublicPlaybookList(): Promise<PublicPlaybookListData> {
  const rows = await fetchDistinctPlaybookSides(PUBLIC_PLAYBOOK_GAME_VERSION);
  const offensiveTeamPlaybooks: string[] = [];
  const alternativeOffensivePlaybooks: string[] = [];
  const defensivePlaybooks: string[] = [];

  for (const row of rows) {
    const classification = classifyPlaybook(row.playbook, row.side_of_ball);
    if (classification === "team-offense") offensiveTeamPlaybooks.push(row.playbook);
    else if (classification === "alternative-offense") alternativeOffensivePlaybooks.push(row.playbook);
    else defensivePlaybooks.push(row.playbook);
  }

  const byName = (a: string, b: string) => a.localeCompare(b);
  offensiveTeamPlaybooks.sort(byName);
  alternativeOffensivePlaybooks.sort(byName);
  defensivePlaybooks.sort(byName);

  return { offensiveTeamPlaybooks, alternativeOffensivePlaybooks, defensivePlaybooks };
}

function groupFormationsByCategory(
  rows: { formation: string; formation_type: string | null }[],
  sideOfBall: CatalogSideOfBall,
): PublicFormationGroup[] {
  const byCategory = new Map<string, Set<string>>();

  for (const row of rows) {
    const formation = row.formation.trim() || "Other";
    const category = resolveFormationSection(formation, row.formation_type);
    if (!byCategory.has(category)) byCategory.set(category, new Set());
    byCategory.get(category)?.add(formation);
  }

  const groups = Array.from(byCategory.entries())
    .map(([category, formations]) => ({
      group: category,
      category,
      formations: [...formations].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => sortFormationTypes(a.category, b.category));

  const trailing =
    sideOfBall === "defense" ? DEFENSE_TRAILING_FORMATION_GROUPS : OFFENSE_TRAILING_FORMATION_GROUPS;
  const pinned = pinTrailingFormationGroups(groups, trailing);

  return pinned.map(({ category, formations }) => ({ category, formations }));
}

/**
 * Resolve side when a playbook name exists on both offense and defense (e.g. "Multiple").
 * Prefer an explicit side; otherwise prefer offense when both exist.
 */
export async function resolvePublicPlaybookSide(
  playbookName: string,
  preferredSide?: CatalogSideOfBall | null,
): Promise<CatalogSideOfBall | null> {
  const trimmed = playbookName.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from("playbooks")
    .select("side_of_ball")
    .ilike("game_version", PUBLIC_PLAYBOOK_GAME_VERSION)
    .ilike("playbook", playbookIlikeExactPattern(trimmed))
    .not("playbook", "is", null)
    .limit(500);

  if (error) {
    console.error("[publicPlaybooksServer] resolve side:", error);
    throw error;
  }

  const sides = new Set<CatalogSideOfBall>();
  for (const row of data ?? []) {
    const sideRaw = String((row as { side_of_ball?: string }).side_of_ball ?? "").trim();
    if (sideRaw === "offense" || sideRaw === "defense") sides.add(sideRaw);
  }

  if (sides.size === 0) return null;
  if (preferredSide && sides.has(preferredSide)) return preferredSide;
  if (sides.has("offense")) return "offense";
  return "defense";
}

export async function fetchPublicPlaybookFormations(
  playbookName: string,
  preferredSide?: CatalogSideOfBall | null,
): Promise<PublicPlaybookFormationsData | null> {
  const trimmed = playbookName.trim();
  if (!trimmed) return null;

  const sideOfBall = await resolvePublicPlaybookSide(trimmed, preferredSide);
  if (!sideOfBall) return null;

  const { data, error } = await supabase
    .from("playbooks")
    .select("formation, formation_type")
    .ilike("game_version", PUBLIC_PLAYBOOK_GAME_VERSION)
    .ilike("playbook", playbookIlikeExactPattern(trimmed))
    .eq("side_of_ball", sideOfBall)
    .order("formation", { ascending: true })
    .limit(12000);

  if (error) {
    console.error("[publicPlaybooksServer] formations:", error);
    throw error;
  }

  const rows = (data ?? []).map((r) => ({
    formation: String((r as { formation?: string }).formation ?? "").trim() || "Other",
    formation_type: ((r as { formation_type?: string | null }).formation_type ?? null) as string | null,
  }));

  if (rows.length === 0) return null;

  return {
    name: trimmed,
    side_of_ball: sideOfBall,
    classification: classifyPlaybook(trimmed, sideOfBall),
    formationGroups: groupFormationsByCategory(rows, sideOfBall),
  };
}

export type PublicFormationPlay = {
  play_name: string;
  play_type: CatalogPlayType;
  formation_type: string;
};

export type PublicFormationDetailData = {
  playbook: string;
  formation: string;
  side_of_ball: CatalogSideOfBall;
  classification: PublicPlaybookClassification;
  formation_type: string;
  plays: PublicFormationPlay[];
};

export type PublicPlayDetailData = {
  playbook: string;
  formation: string;
  formation_type: string;
  play_name: string;
  play_type: CatalogPlayType;
  side_of_ball: CatalogSideOfBall;
  classification: PublicPlaybookClassification;
};

export type PublicPlaybookCrossRef = {
  playbook: string;
  side_of_ball: CatalogSideOfBall;
  formation: string;
};

function catalogPlayTypeForSide(
  playName: string,
  rawType: string | null | undefined,
  sideOfBall: CatalogSideOfBall,
): CatalogPlayType {
  if (sideOfBall === "defense") {
    return resolveDefensiveDisplayPlayType(playName, rawType) ?? "ZONE";
  }
  return resolveCfbBrowserPlayType(playName, rawType);
}

export async function fetchPublicFormationPlays(
  playbookName: string,
  formationName: string,
  preferredSide?: CatalogSideOfBall | null,
): Promise<PublicFormationDetailData | null> {
  const playbook = playbookName.trim();
  const formation = formationName.trim();
  if (!playbook || !formation) return null;

  const sideOfBall = await resolvePublicPlaybookSide(playbook, preferredSide);
  if (!sideOfBall) return null;

  const { data, error } = await supabase
    .from("playbooks")
    .select("play_name, play_type, formation_type, formation")
    .ilike("game_version", PUBLIC_PLAYBOOK_GAME_VERSION)
    .ilike("playbook", playbookIlikeExactPattern(playbook))
    .eq("side_of_ball", sideOfBall)
    .ilike("formation", playbookIlikeExactPattern(formation))
    .order("play_name", { ascending: true })
    .limit(2000);

  if (error) {
    console.error("[publicPlaybooksServer] formation plays:", error);
    throw error;
  }

  const rows = data ?? [];
  if (rows.length === 0) return null;

  const seen = new Map<string, PublicFormationPlay>();
  let formationType = "";
  for (const row of rows) {
    const playName = normalizePlayName(String((row as { play_name?: string }).play_name ?? ""));
    if (!playName) continue;
    const ft = String((row as { formation_type?: string | null }).formation_type ?? "").trim();
    const f = String((row as { formation?: string }).formation ?? "").trim() || formation;
    if (!formationType) formationType = resolveFormationSection(f, ft);
    const key = playName.toLowerCase();
    if (seen.has(key)) continue;
    seen.set(key, {
      play_name: playName,
      play_type: catalogPlayTypeForSide(
        playName,
        (row as { play_type?: string | null }).play_type,
        sideOfBall,
      ),
      formation_type: formationType,
    });
  }

  const plays = [...seen.values()].sort((a, b) => a.play_name.localeCompare(b.play_name));
  if (plays.length === 0) return null;

  return {
    playbook,
    formation,
    side_of_ball: sideOfBall,
    classification: classifyPlaybook(playbook, sideOfBall),
    formation_type: formationType || resolveFormationSection(formation, null),
    plays,
  };
}

export async function fetchPublicPlayDetail(
  playbookName: string,
  formationName: string,
  playNameRaw: string,
  preferredSide?: CatalogSideOfBall | null,
): Promise<PublicPlayDetailData | null> {
  const playbook = playbookName.trim();
  const formation = formationName.trim();
  const playName = normalizePlayName(playNameRaw);
  if (!playbook || !formation || !playName) return null;

  const detail = await fetchPublicFormationPlays(playbook, formation, preferredSide);
  if (!detail) return null;

  const play = detail.plays.find((p) => p.play_name.toLowerCase() === playName.toLowerCase());
  if (!play) return null;

  return {
    playbook: detail.playbook,
    formation: detail.formation,
    formation_type: detail.formation_type,
    play_name: play.play_name,
    play_type: play.play_type,
    side_of_ball: detail.side_of_ball,
    classification: detail.classification,
  };
}

export async function fetchPlaybooksWithFormation(
  formationName: string,
  excludePlaybook?: string | null,
): Promise<PublicPlaybookCrossRef[]> {
  const formation = formationName.trim();
  if (!formation) return [];

  const { data, error } = await supabase
    .from("playbooks")
    .select("playbook, side_of_ball, formation")
    .ilike("game_version", PUBLIC_PLAYBOOK_GAME_VERSION)
    .ilike("formation", playbookIlikeExactPattern(formation))
    .not("playbook", "is", null)
    .limit(8000);

  if (error) {
    console.error("[publicPlaybooksServer] formation cross-refs:", error);
    throw error;
  }

  const exclude = (excludePlaybook ?? "").trim().toLowerCase();
  const seen = new Map<string, PublicPlaybookCrossRef>();
  for (const row of data ?? []) {
    const name = String((row as { playbook?: string }).playbook ?? "").trim();
    if (!name || name.startsWith("_")) continue;
    if (exclude && name.toLowerCase() === exclude) continue;
    const sideRaw = String((row as { side_of_ball?: string }).side_of_ball ?? "").trim();
    const side: CatalogSideOfBall | null =
      sideRaw === "defense" ? "defense" : sideRaw === "offense" ? "offense" : null;
    if (!side) continue;
    const f = String((row as { formation?: string }).formation ?? "").trim() || formation;
    const key = `${side}:${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.set(key, { playbook: name, side_of_ball: side, formation: f });
  }

  return [...seen.values()].sort((a, b) => a.playbook.localeCompare(b.playbook));
}

export async function fetchPlaybooksWithPlay(
  playNameRaw: string,
  excludePlaybook?: string | null,
): Promise<PublicPlaybookCrossRef[]> {
  const playName = normalizePlayName(playNameRaw);
  if (!playName) return [];

  const { data, error } = await supabase
    .from("playbooks")
    .select("playbook, side_of_ball, formation, play_name")
    .ilike("game_version", PUBLIC_PLAYBOOK_GAME_VERSION)
    .ilike("play_name", playbookIlikeExactPattern(playName))
    .not("playbook", "is", null)
    .limit(8000);

  if (error) {
    console.error("[publicPlaybooksServer] play cross-refs:", error);
    throw error;
  }

  const exclude = (excludePlaybook ?? "").trim().toLowerCase();
  const seen = new Map<string, PublicPlaybookCrossRef>();
  for (const row of data ?? []) {
    const name = String((row as { playbook?: string }).playbook ?? "").trim();
    if (!name || name.startsWith("_")) continue;
    if (exclude && name.toLowerCase() === exclude) continue;
    const sideRaw = String((row as { side_of_ball?: string }).side_of_ball ?? "").trim();
    const side: CatalogSideOfBall | null =
      sideRaw === "defense" ? "defense" : sideRaw === "offense" ? "offense" : null;
    if (!side) continue;
    const f = String((row as { formation?: string }).formation ?? "").trim();
    if (!f) continue;
    const key = `${side}:${name.toLowerCase()}:${f.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.set(key, { playbook: name, side_of_ball: side, formation: f });
  }

  return [...seen.values()].sort((a, b) => {
    const byBook = a.playbook.localeCompare(b.playbook);
    if (byBook !== 0) return byBook;
    return a.formation.localeCompare(b.formation);
  });
}

/** Params for playbook detail SSG. */
export async function listPublicPlaybookStaticParams(): Promise<{ playbookId: string }[]> {
  const list = await fetchPublicPlaybookList();
  const names = [
    ...list.offensiveTeamPlaybooks,
    ...list.alternativeOffensivePlaybooks,
    ...list.defensivePlaybooks,
  ];
  const unique = [...new Set(names)];
  // Raw segment values — Next.js encodes when building the path.
  return unique.map((name) => ({ playbookId: name }));
}

/** Params for formation detail SSG — one catalog scan (not N playbook fetches). */
export async function listPublicFormationStaticParams(): Promise<
  { playbookId: string; formationId: string }[]
> {
  const pairs = new Set<string>();
  const pageSize = 1000;
  for (let offset = 0; offset < 500000; offset += pageSize) {
    const { data, error } = await supabase
      .from("playbooks")
      .select("playbook, formation")
      .ilike("game_version", PUBLIC_PLAYBOOK_GAME_VERSION)
      .not("playbook", "is", null)
      .not("formation", "is", null)
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("[publicPlaybooksServer] formation params:", error);
      throw error;
    }
    const rows = data ?? [];
    for (const row of rows) {
      const playbook = String((row as { playbook?: string }).playbook ?? "").trim();
      const formation = String((row as { formation?: string }).formation ?? "").trim();
      if (!playbook || playbook.startsWith("_") || !formation) continue;
      pairs.add(`${playbook}\t${formation}`);
    }
    if (rows.length < pageSize) break;
  }

  return [...pairs]
    .map((key) => {
      const [playbook, formation] = key.split("\t");
      return {
        playbookId: playbook ?? "",
        formationId: formation ?? "",
      };
    })
    .filter((p) => p.playbookId && p.formationId)
    .sort((a, b) => a.playbookId.localeCompare(b.playbookId) || a.formationId.localeCompare(b.formationId));
}
