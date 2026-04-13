export type GameSession = {
  id: string;
  opponent_team: string;
  opponent_scheme: string;
  game_date: string;
  result: "W" | "L" | null;
  my_score: number | null;
  opponent_score: number | null;
  drive_count?: number;
  play_count?: number;
};

export type LoggedPlay = {
  id: string;
  down: number;
  distance: number;
  side: "OWN" | "OPP";
  yard_line: number;
  hash: "LEFT" | "MIDDLE" | "RIGHT";
  formation: string;
  play_name: string;
  yards_gained: number;
  result_tag: string;
};

export type Drive = {
  id: string;
  drive_number: number;
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
