import {
  parseCatalogGameVersion,
  parseCatalogSideOfBall,
  type CatalogGameVersion,
  type CatalogSideOfBall,
} from "@/lib/constants";

export type CatalogPlaybookLookup = {
  game_version: CatalogGameVersion;
  side_of_ball: CatalogSideOfBall;
};

export function buildCatalogPlaybooksListUrl(
  gameVersion: CatalogGameVersion,
  sideOfBall: CatalogSideOfBall,
): string {
  const params = new URLSearchParams({
    game_version: gameVersion,
    side_of_ball: sideOfBall,
  });
  return `/api/cfb26-playbooks?${params.toString()}`;
}

export function buildCatalogPlaybookLookupUrl(playbookName: string): string {
  const params = new URLSearchParams({ lookup_playbook: playbookName.trim() });
  return `/api/cfb26-playbooks?${params.toString()}`;
}

export async function fetchCatalogPlaybooksList(
  gameVersion: CatalogGameVersion,
  sideOfBall: CatalogSideOfBall,
): Promise<{ playbooks: string[]; failed: boolean }> {
  const res = await fetch(buildCatalogPlaybooksListUrl(gameVersion, sideOfBall));
  const j = (await res.json()) as { playbooks?: string[]; error?: string };
  if (!res.ok) return { playbooks: [], failed: true };
  return { playbooks: j.playbooks ?? [], failed: false };
}

export async function lookupCatalogPlaybookMeta(
  playbookName: string,
): Promise<CatalogPlaybookLookup | null> {
  const trimmed = playbookName.trim();
  if (!trimmed) return null;
  const res = await fetch(buildCatalogPlaybookLookupUrl(trimmed));
  const j = (await res.json()) as {
    game_version?: string;
    side_of_ball?: string;
    error?: string;
  };
  if (!res.ok) return null;
  const side = parseCatalogSideOfBall(j.side_of_ball);
  if (!side) return null;
  return {
    game_version: parseCatalogGameVersion(j.game_version),
    side_of_ball: side,
  };
}
