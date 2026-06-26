export type GameSession = {
  id: string;
  my_playbook: string;
  my_scheme: string;
  /** Offensive playbook name (may differ from my_playbook team label). */
  offensive_playbook?: string | null;
  opponent_team: string;
  opponent_scheme: string;
  game_date: string;
  result: "W" | "L" | null;
  my_score: number | null;
  opponent_score: number | null;
  quarter_started_logging: number | null;
  import_source?: string | null;
  ended_at?: string | null;
  /** UUID of the play sheet chosen for this game (nullable = no sheet). */
  play_sheet_id?: string | null;
  drive_count?: number;
  play_count?: number;
};

export type LoggedPlay = {
  id: string;
  play_number?: number;
  drive_number?: number | null;
  down: number;
  distance: number;
  side: "OWN" | "OPP";
  yard_line: number;
  hash: "LEFT" | "MIDDLE" | "RIGHT";
  formation: string;
  play_name: string;
  yards_gained: number;
  result_tag: string;
  /** When persisted: absolute line 1–99 on field, or 100 for end zone (e.g. TD). */
  ending_field_position?: number | null;
  note?: string | null;
  /** Canonical RUN | PASS | RPO from `cfb26_plays`, kept in sync on write. */
  play_type?: "RUN" | "PASS" | "RPO" | null;
  /** UX flag when distance is 1 — stored as distance 1; same scenario buckets as 1 yard. */
  is_inches?: boolean | null;
};

export type Drive = {
  id: string;
  drive_number: number;
  quarter: number | null;
  time_remaining: string | null;
  starting_down?: number | null;
  starting_distance?: number | null;
  /** When starting distance is 1, true means "& inches" display. */
  is_inches?: boolean | null;
  starting_absolute_yard?: number | null;
  starting_yard_line: number | null;
  starting_side: "OWN" | "OPP" | null;
  score_mine: number | null;
  score_opponent: number | null;
  note: string | null;
  plays: LoggedPlay[];
};

export type PlayStatRow = {
  id: string;
  formation: string;
  play_name: string;
  play_count: number;
  avg_yards: number;
  success_rate: number;
};

export type PlaybookSummary = {
  id: string;
  name: string;
  cfb26_playbook: string;
  scheme: string;
  scenario_filled: number;
  scenario_total: number;
  play_count: number;
  updated_at: string | null;
};

export type PlaybookListResponse = {
  playbooks: PlaybookSummary[];
  active_call_sheet_id: string | null;
};

export type SheetPlayRow = {
  id: string;
  play_order: number;
  formation: string;
  play_name: string;
  script_note: string | null;
  /** Joined from `cfb26_plays` for the sheet's CFB26 playbook (same source as Tendencies). */
  play_type?: string | null;
};

export type SheetScenarioBlock = {
  id: string;
  scenario: string;
  scenario_order: number;
  plays: SheetPlayRow[];
};
