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
  drive_count?: number;
  play_count?: number;
};

export type LoggedPlay = {
  id: string;
  play_number?: number;
  down: number;
  distance: number;
  side: "OWN" | "OPP";
  yard_line: number;
  hash: "LEFT" | "MIDDLE" | "RIGHT";
  formation: string;
  play_name: string;
  yards_gained: number;
  result_tag: string;
  note?: string | null;
};

export type Drive = {
  id: string;
  drive_number: number;
  quarter: number | null;
  time_remaining: string | null;
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
  scenario_filled: number;
  scenario_total: number;
  play_count: number;
  updated_at: string | null;
};

export type SheetPlayRow = {
  id: string;
  play_order: number;
  formation: string;
  play_name: string;
  script_note: string | null;
};

export type SheetScenarioBlock = {
  id: string;
  scenario: string;
  scenario_order: number;
  plays: SheetPlayRow[];
};
