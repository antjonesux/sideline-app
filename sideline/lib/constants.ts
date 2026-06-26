/** Master order for play sheets (Play Sheet editor) and DB `scenario_order`. */
export const SCENARIOS = [
  "Opening Script",
  "1st Down",
  "2nd & Short",
  "2nd & Medium",
  "2nd & Long",
  "3rd & Short",
  "3rd & Medium",
  "3rd & Long",
  "4th Down",
  "Red Zone",
  "Goal Line",
  "Backed Up",
  "2 Minute",
  "4 Minute",
  "2 Point",
] as const;

/** Situational labels for logging, Tendencies, and legacy play sheets. */
export const LOGGING_SCENARIOS = SCENARIOS;

/** Tactical Call Sheet buckets (Builder + Viewer; seeded on new sheets). Grid order: L→R, top→bottom. */
export const CALL_SHEET_SCENARIOS = [
  "Go-To Plays",
  "Tempo",
  "Run Game",
  "Pass Game",
  "Man Beaters",
  "Zone Beaters",
  "Take a Shot",
  "Red Zone",
] as const;

export type PlaySheetScenario = (typeof SCENARIOS)[number];
export type CallSheetScenario = (typeof CALL_SHEET_SCENARIOS)[number];

/** First tactical bucket — Go-To is a normal situation, not a separate data model. */
export const GO_TO_PLAYS_SCENARIO = CALL_SHEET_SCENARIOS[0];

/** Compact labels for mobile situation chips in the Call Sheet builder. */
export const CALL_SHEET_SCENARIO_SHORT: Record<CallSheetScenario, string> = {
  "Go-To Plays": "Go-To",
  "Red Zone": "Red Zone",
  Tempo: "Tempo",
  "Run Game": "Run",
  "Pass Game": "Pass",
  "Take a Shot": "Shot",
  "Man Beaters": "Man",
  "Zone Beaters": "Zone",
};

/** Coach-facing helper lines for Call Sheet builder situation cards. */
export const CALL_SHEET_SCENARIO_HELP: Record<CallSheetScenario, string> = {
  "Go-To Plays": "Your most trusted plays",
  "Red Zone": "Inside the 20",
  Tempo: "Push tempo and keep the defense off balance",
  "Run Game": "Establish and lean on the run",
  "Pass Game": "Move the ball through the air",
  "Take a Shot": "Take a shot downfield",
  "Man Beaters": "Attack man coverage",
  "Zone Beaters": "Find holes in zone coverage",
};

/** Text markers for Call Sheet builder cards (no icon library). */
export const CALL_SHEET_SCENARIO_MARKER: Record<CallSheetScenario, string> = {
  "Go-To Plays": "★",
  Tempo: "»",
  "Run Game": "—",
  "Pass Game": "↗",
  "Man Beaters": "M",
  "Zone Beaters": "Z",
  "Take a Shot": "↓",
  "Red Zone": "◎",
};

/** Dashboard card titles (sentence case). */
export const CALL_SHEET_SCENARIO_DISPLAY: Record<CallSheetScenario, string> = {
  "Go-To Plays": "Go-to Plays",
  "Red Zone": "Red Zone",
  Tempo: "Tempo",
  "Run Game": "Run Game",
  "Pass Game": "Pass Game",
  "Take a Shot": "Take a Shot",
  "Man Beaters": "Man Beaters",
  "Zone Beaters": "Zone Beaters",
};

/** Same order as the play sheet, minus Opening Script (not shown in Tendencies scouting). */
export const TENDENCIES_SCENARIOS = SCENARIOS.filter(
  (s): s is Exclude<PlaySheetScenario, "Opening Script"> => s !== "Opening Script",
);

/** Situations omitted from the Tendencies scouting report (niche / low-signal for the summary). */
const SCOUTING_REPORT_EXCLUDED = new Set<string>(["2 Point", "2 Minute", "4 Minute"]);

/** `TENDENCIES_SCENARIOS` minus niche situations not shown in the scouting summary. */
export const SCOUTING_REPORT_SCENARIOS = TENDENCIES_SCENARIOS.filter((s) => !SCOUTING_REPORT_EXCLUDED.has(s));

export const SCENARIO_SHORT: Record<string, string> = {
  "Opening Script": "Opening Script",
  "1st Down": "1st Down",
  "2nd & Short": "2nd & Short",
  "2nd & Medium": "2nd & Medium",
  "2nd & Long": "2nd & Long",
  "3rd & Short": "3rd & Short",
  "3rd & Medium": "3rd & Medium",
  "3rd & Long": "3rd & Long",
  "4th Down": "4th Down",
  "Red Zone": "Red Zone",
  "Goal Line": "Goal Line",
  "Backed Up": "Backed Up",
  "2 Minute": "2 Minute",
  "4 Minute": "4 Minute",
  "2 Point": "2 Point",
  "2-Minute Drill": "2 Minute",
  "4-Minute": "4 Minute",
  "2-Point Conversion": "2 Point",
};

/** `cfb26_plays.game_version` for the shipped reference catalog (migrations + seeds; future cycles add new values). */
export const CFB_CATALOG_GAME_VERSION = "cfb26" as const;
