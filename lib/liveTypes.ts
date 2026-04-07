export const SCENARIOS = [
  "Opening Script",
  "1st Down",
  "2nd & Short",
  "2nd & Medium",
  "2nd & Long",
  "3rd & Short",
  "3rd & Medium",
  "3rd & Long",
  "Red Zone",
  "Goal Line",
  "Backed Up",
  "2-Minute Drill",
  "4-Minute",
  "4th Down",
  "2-Point Conversion",
] as const;

export type Scenario = (typeof SCENARIOS)[number];
export type FieldZone =
  | "BACKED_UP"
  | "OWN_TERR"
  | "MIDFIELD"
  | "SCORING"
  | "RED_ZONE"
  | "GOAL_LINE";
export type ScoreContext = "TIED" | "UP_1_6" | "UP_7_PLUS" | "DOWN_1_6" | "DOWN_7_PLUS";
export type ResultTag =
  | "FIRST_DOWN"
  | "NO_GAIN"
  | "TOUCHDOWN"
  | "SACK"
  | "INCOMPLETE"
  | "TURNOVER"
  | "GAIN";

export interface GameState {
  fieldZone: FieldZone;
  down: 1 | 2 | 3 | 4;
  distance: number;
  scoreContext: ScoreContext;
  quarter: 1 | 2 | 3 | 4 | "OT";
  twoMinuteWarning: boolean;
  defensiveScheme: string;
}

export interface PlaySheetPlay {
  id: string;
  scenario: Scenario;
  playOrder: number;
  formation: string;
  playName: string;
  used?: boolean;
}
