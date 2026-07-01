import {
  CFB_CATALOG_GAME_VERSION,
  parseCatalogGameVersion,
  parseCatalogSideOfBall,
  type CatalogGameVersion,
  type CatalogSideOfBall,
} from "@/lib/constants";
import { playbookIlikeExactPattern } from "@/lib/playbookIlikeExact";
import { supabase } from "@/lib/supabase";

export type CatalogPlaybookMeta = {
  game_version: CatalogGameVersion;
  side_of_ball: CatalogSideOfBall;
};

/** Best-match catalog metadata for a playbook name (newest game version first). */
export async function lookupCatalogPlaybookMetaFromDb(
  playbookName: string,
): Promise<CatalogPlaybookMeta | null> {
  const trimmed = playbookName.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from("playbooks")
    .select("game_version, side_of_ball")
    .ilike("playbook", playbookIlikeExactPattern(trimmed))
    .not("playbook", "is", null);

  if (error) {
    console.error("lookupCatalogPlaybookMetaFromDb:", error);
    return null;
  }

  const rows = data ?? [];
  if (rows.length === 0) return null;

  const unique = new Map<string, CatalogPlaybookMeta>();
  for (const row of rows) {
    const side = parseCatalogSideOfBall(row.side_of_ball as string);
    if (!side) continue;
    const gameVersion = parseCatalogGameVersion(row.game_version as string);
    unique.set(`${gameVersion}:${side}`, { game_version: gameVersion, side_of_ball: side });
  }

  const ranked = [...unique.values()].sort((a, b) => {
    if (a.game_version !== b.game_version) return b.game_version.localeCompare(a.game_version);
    if (a.side_of_ball === b.side_of_ball) return 0;
    return a.side_of_ball === "offense" ? -1 : 1;
  });

  return ranked[0] ?? null;
}

/** Resolve `playbooks.game_version` for catalog queries (optional explicit override). */
export async function resolveCatalogGameVersionForPlaybook(
  playbookName: string,
  explicitGameVersion?: string | null,
): Promise<CatalogGameVersion> {
  if (explicitGameVersion?.trim()) {
    return parseCatalogGameVersion(explicitGameVersion);
  }
  const meta = await lookupCatalogPlaybookMetaFromDb(playbookName);
  return meta?.game_version ?? CFB_CATALOG_GAME_VERSION;
}
