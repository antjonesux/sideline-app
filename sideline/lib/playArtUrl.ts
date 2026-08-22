import type { CatalogGameVersion, CatalogSideOfBall } from "@/lib/constants";
import { resolveOwnedPlayArtPath } from "@/lib/playArtManifest";

export type PlayArtUrlInput = {
  formation: string;
  formationType: string;
  playName: string;
  gameVersion: CatalogGameVersion | string;
  side: CatalogSideOfBall;
};

export type PlayArtResolveInput = PlayArtUrlInput & {
  playbook: string;
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

/** Slug for owned asset directories (playbook team name). */
export function slugifyPlaybookName(playbook: string): string {
  return slugifyPlayArtSegment(playbook);
}

/**
 * Legacy playbook-scoped public path (formation/play slug layout).
 * Prefer {@link buildContentAddressedPlayArtAssetPath} for new publishes.
 */
export function buildOwnedPlayArtAssetPath(input: {
  gameVersion: string;
  sideOfBall: string;
  playbook: string;
  formation: string;
  playName: string;
  extension: string;
}): string {
  const gameVersion = input.gameVersion.trim().toLowerCase();
  const sideOfBall = input.sideOfBall.trim().toLowerCase();
  const playbook = slugifyPlaybookName(input.playbook);
  const formation = slugifyPlayArtSegment(input.formation);
  const play = slugifyPlayArtSegment(input.playName);
  const extension = input.extension.replace(/^\./, "").toLowerCase();
  if (!gameVersion || !sideOfBall || !playbook || !formation || !play || !extension) {
    return "";
  }
  return `/play-art/${gameVersion}/${sideOfBall}/${playbook}/${formation}/${play}.${extension}`;
}

/**
 * Content-addressed public path for a Sideline-owned play-art asset.
 * Physical identity is the content hash (`assetId`), not formation/play metadata.
 */
export function buildContentAddressedPlayArtAssetPath(input: {
  gameVersion: string;
  assetId: string;
  extension: string;
}): string {
  const gameVersion = input.gameVersion.trim().toLowerCase();
  const assetId = input.assetId.trim().toLowerCase();
  const extension = input.extension.replace(/^\./, "").toLowerCase();
  if (!gameVersion || !assetId || !extension) {
    return "";
  }
  return `/play-art/${gameVersion}/assets/${assetId}.${extension}`;
}

/**
 * Resolve play-art for Add Play browse: owned Sideline asset first, then cfb.fan URL.
 * Returns `null` when neither source can resolve (caller renders text-only).
 */
export function resolvePlayArtUrl(input: PlayArtResolveInput): string | null {
  const owned = resolveOwnedPlayArtPath({
    gameVersion: input.gameVersion,
    sideOfBall: input.side,
    playbook: input.playbook,
    formation: input.formation,
    playName: input.playName,
  });
  if (owned) return owned;
  return buildPlayArtUrl(input);
}
