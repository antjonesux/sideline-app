import type { CatalogSideOfBall } from "@/lib/constants";
import { resolveFormationSection } from "@/lib/playbook";
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
import { supabase } from "@/lib/supabase";

export const PUBLIC_PLAYBOOK_GAME_VERSION = "cfb27" as const;

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
