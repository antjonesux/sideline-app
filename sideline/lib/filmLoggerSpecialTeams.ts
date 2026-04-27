import type { PlaybookEntry } from "@/lib/playbook";

/** Film logger / Browse Playbook only — not in `cfb26_plays`; excluded from Game Plan via `excludePlaySheetSpecialTeams`. */
export const FILM_LOGGER_ST_PUNT: PlaybookEntry = {
  play_id: "__film_logger_st_punt__",
  formation: "Special Teams",
  group: "Special Teams",
  play_name: "Punt",
  play_type: "RUN",
};

export const FILM_LOGGER_ST_FIELD_GOAL: PlaybookEntry = {
  play_id: "__film_logger_st_fg__",
  formation: "Special Teams",
  group: "Special Teams",
  play_name: "Field Goal",
  play_type: "RUN",
};

export const FILM_LOGGER_SPECIAL_TEAMS_PLAYS: PlaybookEntry[] = [FILM_LOGGER_ST_PUNT, FILM_LOGGER_ST_FIELD_GOAL];

export function isFilmLoggerSpecialTeamsEntry(play: Pick<PlaybookEntry, "play_id">): boolean {
  return play.play_id === FILM_LOGGER_ST_PUNT.play_id || play.play_id === FILM_LOGGER_ST_FIELD_GOAL.play_id;
}

export function isFilmLoggerPuntEntry(play: Pick<PlaybookEntry, "play_id">): boolean {
  return play.play_id === FILM_LOGGER_ST_PUNT.play_id;
}

/** Shared Tailwind tokens for Film-only Special Teams rows in logger / yardage UI. */
export const FILM_LOGGER_SPECIAL_TEAMS_BADGE_CLASS =
  "border-violet-700/70 bg-violet-900/30 text-violet-200";

export const FILM_LOGGER_SPECIAL_TEAMS_ACCENT_CLASS = "bg-violet-500";
