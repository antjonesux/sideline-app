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
  /** Catalog game version for this session (cfb26 | cfb27). */
  game_version?: string | null;
  /** UUID of the defensive call sheet (nullable = none). */
  defensive_play_sheet_id?: string | null;
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
  /** Defensive drives only — multi-select outcome tags; null on offensive plays. */
  result_tags?: string[] | null;
  /** When persisted: absolute line 1–99 on field, or 100 for end zone (e.g. TD). */
  ending_field_position?: number | null;
  note?: string | null;
  /** Offense: RUN | PASS | RPO. Defense: MAN | ZONE | BLITZ | MATCH (resolved at read time). */
  play_type?: "RUN" | "PASS" | "RPO" | "MAN" | "ZONE" | "BLITZ" | "MATCH" | null;
  /** UX flag when distance is 1 — stored as distance 1; same scenario buckets as 1 yard. */
  is_inches?: boolean | null;
};

export type DriveSideOfBall = "offense" | "defense";

export type Drive = {
  id: string;
  drive_number: number;
  /** Offense or defense possession — fixed at drive creation. */
  side_of_ball?: DriveSideOfBall;
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
  playbook: string;
  game_version: string;
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

export type SchemeSummary = {
  id: string;
  name: string;
  description: string | null;
  note: string | null;
  offense_call_sheet_id: string | null;
  defense_call_sheet_id: string | null;
  offense_call_sheet_name: string | null;
  defense_call_sheet_name: string | null;
  updated_at: string | null;
};

export type SchemeDetail = {
  id: string;
  name: string;
  description: string | null;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
  call_sheets: {
    call_sheet_id: string;
    side_of_ball: "offense" | "defense";
    call_sheet: {
      id: string;
      name: string;
      playbook: string;
      scheme: string;
    };
  }[];
};

export type SheetPlayRow = {
  id: string;
  play_order: number;
  formation: string;
  play_name: string;
  script_note: string | null;
  /** Joined from `playbooks` for the sheet's CFB26 playbook (same source as Tendencies). */
  play_type?: string | null;
};

export type SheetScenarioBlock = {
  id: string;
  scenario: string;
  scenario_order: number;
  description?: string;
  icon?: string | null;
  color?: string;
  is_locked?: boolean;
  plays: SheetPlayRow[];
};
