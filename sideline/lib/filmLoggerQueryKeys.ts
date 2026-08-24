import type { CatalogSideOfBall } from "@/lib/constants";

const FILM_LOGGER_PREFIX = ["film-logger"] as const;

/** TanStack Query keys for Film Play Logger fetches (shared across logger + browse overlay). */
export const filmLoggerQueryKeys = {
  /** Use with `invalidateQueries({ queryKey: filmLoggerQueryKeys.prefix })` to drop cached logger fetches after game refresh. */
  prefix: FILM_LOGGER_PREFIX,
  cfb26Catalog: (playbook: string, sideOfBall: CatalogSideOfBall = "offense") =>
    [...FILM_LOGGER_PREFIX, "cfb26-catalog", playbook, sideOfBall] as const,
  sheetScenario: (sheetId: string, scenario: string) =>
    [...FILM_LOGGER_PREFIX, "play-sheet-scenario", sheetId, scenario] as const,
  /** Full sheet + scenarios (existing GET `/api/playbook/[id]`) — Film logger My Sheet badge strip. */
  playSheetOverview: (sheetId: string) => [...FILM_LOGGER_PREFIX, "play-sheet-overview", sheetId] as const,
};
