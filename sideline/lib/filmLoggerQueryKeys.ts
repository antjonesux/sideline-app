const FILM_LOGGER_PREFIX = ["film-logger"] as const;

/** TanStack Query keys for Film Play Logger fetches (shared across logger + browse overlay). */
export const filmLoggerQueryKeys = {
  /** Use with `invalidateQueries({ queryKey: filmLoggerQueryKeys.prefix })` to drop cached logger fetches after game refresh. */
  prefix: FILM_LOGGER_PREFIX,
  cfb26Catalog: (playbook: string) => [...FILM_LOGGER_PREFIX, "cfb26-catalog", playbook] as const,
  sheetScenario: (sheetId: string, scenario: string) =>
    [...FILM_LOGGER_PREFIX, "play-sheet-scenario", sheetId, scenario] as const,
};
