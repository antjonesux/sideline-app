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

/** Tactical Call Sheet buckets (Builder + Viewer; seeded on new sheets). */
export const CALL_SHEET_SCENARIOS = [
  "Go-To Plays",
  "Red Zone",
  "Tempo",
  "Run Game",
  "Pass Game",
  "Take a Shot",
  "Man Beaters",
  "Zone Beaters",
] as const;

export type PlaySheetScenario = (typeof SCENARIOS)[number];
export type CallSheetScenario = (typeof CALL_SHEET_SCENARIOS)[number];

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
