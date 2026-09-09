import type { CatalogGameVersion } from "@/lib/constants";
import { DEFAULT_CATALOG_GAME_VERSION, parseCatalogGameVersion } from "@/lib/constants";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Normalize stored / request game_version to a catalog key used on style tables. */
export function teamStylesGameVersion(raw: string | null | undefined): CatalogGameVersion {
  return parseCatalogGameVersion(raw ?? DEFAULT_CATALOG_GAME_VERSION);
}

/**
 * Offensive scheme style for a team playbook name + game version.
 * Returns null when no row (callers fall back as needed).
 */
export async function lookupOffensiveSchemeStyle(
  supabase: SupabaseClient,
  playbookName: string,
  gameVersion: CatalogGameVersion,
): Promise<string | null> {
  const name = playbookName.trim();
  if (!name) return null;

  const { data, error } = await supabase
    .from("team_offensive_playbooks")
    .select("scheme_style")
    .eq("playbook_name", name)
    .eq("game_version", gameVersion)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[teamStylesLookup] offensive:", error.message);
    return null;
  }
  const style = typeof data?.scheme_style === "string" ? data.scheme_style.trim() : "";
  return style || null;
}

/**
 * Teams that run a defensive scheme playbook (exact scheme name match), A–Z.
 */
export async function lookupTeamsForDefensiveScheme(
  supabase: SupabaseClient,
  defensiveScheme: string,
  gameVersion: CatalogGameVersion,
): Promise<string[]> {
  const scheme = defensiveScheme.trim();
  if (!scheme) return [];

  const { data, error } = await supabase
    .from("team_defensive_schemes")
    .select("team_name")
    .eq("defensive_scheme", scheme)
    .eq("game_version", gameVersion)
    .order("team_name", { ascending: true })
    .limit(500);

  if (error) {
    console.error("[teamStylesLookup] defensive teams:", error.message);
    return [];
  }

  const names = (data ?? [])
    .map((row) => String((row as { team_name?: string }).team_name ?? "").trim())
    .filter(Boolean);

  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}
