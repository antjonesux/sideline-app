import {
  DEFAULT_CATALOG_GAME_VERSION,
  parseCatalogGameVersion,
  type CatalogGameVersion,
} from "@/lib/constants";

export const FILM_ROOM_VERSION_ALL = "all" as const;

export type FilmRoomVersionFilterValue = CatalogGameVersion | typeof FILM_ROOM_VERSION_ALL;

export function parseFilmRoomVersionFilter(raw: string | null | undefined): FilmRoomVersionFilterValue {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === FILM_ROOM_VERSION_ALL) return FILM_ROOM_VERSION_ALL;
  if (v === "cfb26" || v === "cfb27") return v;
  return DEFAULT_CATALOG_GAME_VERSION;
}

export function filmRoomVersionQueryParam(value: FilmRoomVersionFilterValue): string {
  return value === FILM_ROOM_VERSION_ALL ? FILM_ROOM_VERSION_ALL : value;
}

export function filmRoomNewGameHref(version: FilmRoomVersionFilterValue): string {
  const v = version === FILM_ROOM_VERSION_ALL ? DEFAULT_CATALOG_GAME_VERSION : version;
  return `/film/new?version=${encodeURIComponent(v)}`;
}

/** Strict parse of stored `game_sessions.game_version` — no product default. */
export function resolveGameSessionVersion(
  raw: string | null | undefined,
): CatalogGameVersion | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "cfb26" || v === "cfb27") return v;
  return null;
}

export function gameMatchesFilmRoomVersionFilter(
  gameVersion: string | null | undefined,
  filter: FilmRoomVersionFilterValue,
): boolean {
  if (filter === FILM_ROOM_VERSION_ALL) return true;
  const resolved = resolveGameSessionVersion(gameVersion);
  // Pre-QA42 sessions lacked an explicit version; they belong to the CFB26 catalog era.
  const effective: CatalogGameVersion = resolved ?? "cfb26";
  return effective === filter;
}
