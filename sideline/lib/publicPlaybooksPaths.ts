/**
 * Evergreen public playbooks URL base — game version is resolved server-side, not in the path.
 * @see resolvePublicPlaybookGameVersion in publicPlaybooksServer.ts
 */
import type { CatalogGameVersion } from "@/lib/constants";
import { DEFAULT_CATALOG_GAME_VERSION } from "@/lib/constants";

export const PUBLIC_PLAYBOOKS_BASE_PATH = "/playbooks/college-football" as const;

/**
 * Sync catalog version for client play-art and evergreen copy.
 * Must match the preferred newest entry in `CATALOG_GAME_VERSIONS` once that catalog is seeded.
 * Server queries use `resolvePublicPlaybookGameVersion()` (may fall back if preferred has no rows).
 */
export const PUBLIC_PLAYBOOK_GAME_VERSION: CatalogGameVersion = DEFAULT_CATALOG_GAME_VERSION;

/** SEO year label from catalog version (`cfb27` → `27`). */
export function publicPlaybookSeoYear(version: CatalogGameVersion = PUBLIC_PLAYBOOK_GAME_VERSION): string {
  return version.replace(/^cfb/i, "");
}

/** Build a public playbooks path under `/playbooks/college-football`. */
export function publicPlaybooksHref(...segments: string[]): string {
  if (segments.length === 0) return PUBLIC_PLAYBOOKS_BASE_PATH;
  const path = segments.map((segment) => encodeURIComponent(segment)).join("/");
  return `${PUBLIC_PLAYBOOKS_BASE_PATH}/${path}`;
}

/** Same as `publicPlaybooksHref`, with optional `?side=defense` for dual-side playbooks. */
export function publicPlaybooksHrefWithSide(
  segments: string[],
  side?: "offense" | "defense" | null,
): string {
  const href = publicPlaybooksHref(...segments);
  if (side === "defense") return `${href}?side=defense`;
  return href;
}
