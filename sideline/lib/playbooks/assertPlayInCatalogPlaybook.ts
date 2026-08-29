import { parseCatalogGameVersion } from "@/lib/constants";
import {
  ADD_PLAY_FORMATION_NOT_IN_PLAYBOOK,
  ADD_PLAY_NOT_IN_PLAYBOOK,
  ADD_PLAY_PLAY_NOT_IN_FORMATION,
} from "@/lib/coachCopy";
import { normalizePlayLabel } from "@/lib/normalizePlayLabel";
import { playbookIlikeExactPattern } from "@/lib/playbookIlikeExact";
import { resolveCatalogGameVersionForPlaybook } from "@/lib/playbooks/catalog-playbook-server";
import { sheetPlaybookName } from "@/lib/playbookUtils";
import { normalizePlayName } from "@/lib/utils";
import { normalizePlayNameForComparison } from "@/lib/utils/normalizePlayName";
import type { SupabaseClient } from "@supabase/supabase-js";

function normalizePlayNameForGroup(playName: string, formation: string): string {
  const escaped = formation.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stripped = playName
    .trim()
    .replace(new RegExp(`^${escaped}\\s*(?:[-:>]+)?\\s*`, "i"), "")
    .replace(/\s+/g, " ")
    .trim();
  return normalizePlayName(stripped || playName.trim());
}

function playNamesMatch(catalogPlayName: string, formation: string, requestedPlayName: string): boolean {
  const displayName = normalizePlayNameForGroup(catalogPlayName, formation);
  const requested = normalizePlayName(requestedPlayName);
  const displayKey = normalizePlayLabel(displayName, formation);
  const requestedKey = normalizePlayLabel(requested, formation);
  if (displayKey && requestedKey && displayKey === requestedKey) return true;
  return normalizePlayNameForComparison(displayName) === normalizePlayNameForComparison(requested);
}

export async function assertPlayInSheetCatalog(
  supabase: SupabaseClient,
  sheet: { playbook: string | null | undefined; game_version?: string | null | undefined },
  formationRaw: string,
  playNameRaw: string,
): Promise<{ ok: true } | { error: string }> {
  const playbookName = sheetPlaybookName(sheet);
  const formation = formationRaw.trim();
  const playName = playNameRaw.trim();
  if (!playbookName) return { error: ADD_PLAY_NOT_IN_PLAYBOOK };
  if (!formation || !playName) return { error: ADD_PLAY_NOT_IN_PLAYBOOK };

  const gameVersion = sheet.game_version?.trim()
    ? parseCatalogGameVersion(sheet.game_version)
    : await resolveCatalogGameVersionForPlaybook(playbookName);

  const { data, error } = await supabase
    .from("playbooks")
    .select("play_name, formation")
    .ilike("game_version", gameVersion)
    .ilike("playbook", playbookIlikeExactPattern(playbookName))
    .ilike("formation", playbookIlikeExactPattern(formation))
    .limit(2000);

  if (error) {
    console.error("assertPlayInSheetCatalog:", error);
    return { error: ADD_PLAY_NOT_IN_PLAYBOOK };
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return { error: ADD_PLAY_FORMATION_NOT_IN_PLAYBOOK(playbookName, formation) };
  }

  const canonicalFormation = String(rows[0]?.formation ?? formation).trim() || formation;
  const matched = rows.some((row) =>
    playNamesMatch(String(row.play_name ?? ""), canonicalFormation, playName),
  );
  if (!matched) {
    return { error: ADD_PLAY_PLAY_NOT_IN_FORMATION(playbookName, formation, playName) };
  }

  return { ok: true };
}
