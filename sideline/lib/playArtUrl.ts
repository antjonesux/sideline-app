import type { CatalogGameVersion, CatalogSideOfBall } from "@/lib/constants";

export type PlayArtUrlInput = {
  formation: string;
  formationType: string;
  playName: string;
  gameVersion: CatalogGameVersion | string;
  side: CatalogSideOfBall;
};

/** Lowercase → literal `-` to `--` → spaces to `-`. */
export function slugifyPlayArtSegment(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/-/g, "--")
    .replace(/\s+/g, "-");
}

/** Extract `"27"` from `"cfb27"` (digits only). */
export function playArtVersionNumber(gameVersion: string): string | null {
  const match = gameVersion.trim().toLowerCase().match(/(\d+)/);
  return match?.[1] ?? null;
}

/**
 * Strip `formationType` prefix from `formation` (case-insensitive) and trim.
 * `"Gun Bunch"` + `"Gun"` → `"Bunch"`.
 */
export function formationSetRemainder(formation: string, formationType: string): string {
  const f = formation.trim();
  const t = formationType.trim();
  if (!t) return f;
  if (f.toLowerCase().startsWith(t.toLowerCase())) {
    return f.slice(t.length).trim();
  }
  return f;
}

/**
 * Deterministic cfb.fan play-art URL from catalog fields already on the play row.
 * Returns `null` when required pieces are missing (caller should render text-only).
 *
 * When `formation` equals `formationType` (no set suffix), the set slug repeats the
 * category slug — e.g. `hail-mary/hail-mary/...` — matching cfb.fan paths.
 */
export function buildPlayArtUrl(input: PlayArtUrlInput): string | null {
  const version = playArtVersionNumber(input.gameVersion);
  const formationType = input.formationType.trim();
  const formation = input.formation.trim();
  const playName = input.playName.trim();
  if (!version || !formationType || !formation || !playName) return null;

  const setRemainder = formationSetRemainder(formation, formationType) || formationType;

  const categorySlug = slugifyPlayArtSegment(formationType);
  const setSlug = slugifyPlayArtSegment(setRemainder);
  const playSlug = slugifyPlayArtSegment(playName);
  if (!categorySlug || !setSlug || !playSlug) return null;

  return `https://media.cfb.fan/${version}/playbookdb/${input.side}/${categorySlug}/${setSlug}/${playSlug}.jpg`;
}
