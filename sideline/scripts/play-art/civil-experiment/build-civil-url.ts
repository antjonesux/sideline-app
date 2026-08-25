import { normalizeSlug } from "./normalize-slug";

export const CIVIL_PLAYS_BASE =
  "https://fatgvrcdozmbkxcwpwsc.supabase.co/storage/v1/object/public/college_plays_output";

/**
 * Build a Civil.GG CFB27 play-art URL from play + formation metadata.
 * Baseline convention only — no slug exception rules.
 */
export function buildCivilUrl(
  playName: string,
  formationType: string,
  formationSet: string,
  version = "27",
): string {
  const playSlug = normalizeSlug(playName);
  const formationTypeSlug = normalizeSlug(formationType);
  const formationSetSlug = normalizeSlug(formationSet);
  return `${CIVIL_PLAYS_BASE}/${playSlug}-${formationTypeSlug}-${formationSetSlug}-${version}.webp`;
}
