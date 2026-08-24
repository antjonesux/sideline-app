/**
 * Returns true if the given user ID is in the Film Room beta list.
 * Reads from NEXT_PUBLIC_FILM_BETA_USER_IDS (comma-separated).
 * Returns false if the env var is unset or empty.
 */
export function isFilmRoomBetaUser(userId: string | undefined | null): boolean {
  if (!userId) return false;
  const raw = process.env.NEXT_PUBLIC_FILM_BETA_USER_IDS;
  if (!raw?.trim()) return false;
  const allowed = raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return allowed.includes(userId);
}

/** Request header set by `proxy.ts` when `/film/*?guided=1` so layout can allow onboarding. */
export const FILM_GUIDED_ONBOARDING_HEADER = "x-sideline-film-guided";
