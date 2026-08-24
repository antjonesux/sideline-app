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

/** Default situations seeded on new offensive call sheets — database is runtime source of truth. */
export const DEFAULT_OFFENSIVE_SITUATIONS = [
  { scenario: "Go-To Plays", description: "Your most trusted plays", icon: "Star", color: "amber", isLocked: true },
  { scenario: "Red Zone", description: "Punch it in", icon: "Flag", color: "red", isLocked: false },
  { scenario: "Run Game", description: "Establish the run", icon: "Shield", color: "emerald", isLocked: false },
  { scenario: "Pass Game", description: "Move the chains through the air", icon: "Target", color: "blue", isLocked: false },
  { scenario: "Man Beaters", description: "Quick wins vs man coverage", icon: "Crosshair", color: "violet", isLocked: false },
  { scenario: "Zone Beaters", description: "Read the zone and attack", icon: "Eye", color: "rose", isLocked: false },
] as const;

/** Default situations seeded on new defensive call sheets. */
export const DEFAULT_DEFENSIVE_SITUATIONS = [
  { scenario: "Go-To Plays", description: "Your most trusted calls", icon: "Star", color: "amber", isLocked: true },
  { scenario: "Red Zone", description: "Protect the goal line", icon: "Flag", color: "red", isLocked: false },
  { scenario: "Stop the Run", description: "Shut down the ground game", icon: "Shield", color: "emerald", isLocked: false },
  { scenario: "Man-to-Man", description: "Lock down your assignment", icon: "User", color: "violet", isLocked: false },
  { scenario: "Zone Coverage", description: "Defend the deep field", icon: "Eye", color: "rose", isLocked: false },
  { scenario: "Send the Blitz", description: "Create pressure", icon: "Zap", color: "orange", isLocked: false },
] as const;

export type DefaultSheetSituation = {
  scenario: string;
  description: string;
  icon: string;
  color: string;
  isLocked: boolean;
};

/** @deprecated Use `DEFAULT_OFFENSIVE_SITUATIONS`. */
export const DEFAULT_SHEET_SITUATIONS = DEFAULT_OFFENSIVE_SITUATIONS;

/** 16 selectable Lucide icon names for custom situations. Star is reserved for Go-to Plays. */
export const SITUATION_PRESET_ICONS = [
  "Zap",
  "Flame",
  "Rocket",
  "Swords",
  "Target",
  "Eye",
  "Crosshair",
  "FastForward",
  "Wind",
  "Timer",
  "Shield",
  "Lock",
  "Trophy",
  "Flag",
  "TrendingUp",
  "ArrowUpRight",
] as const;

/** 12 accessible color presets for situations — Tailwind 400 shade for dark backgrounds. */
export const SITUATION_PRESET_COLORS = [
  { key: "red", label: "Red", text: "text-red-400", border: "border-l-red-400", bg: "bg-red-400/10", swatch: "bg-red-400" },
  { key: "orange", label: "Orange", text: "text-orange-400", border: "border-l-orange-400", bg: "bg-orange-400/10", swatch: "bg-orange-400" },
  { key: "amber", label: "Amber", text: "text-amber-400", border: "border-l-amber-400", bg: "bg-amber-400/10", swatch: "bg-amber-400" },
  { key: "emerald", label: "Emerald", text: "text-emerald-400", border: "border-l-emerald-400", bg: "bg-emerald-400/10", swatch: "bg-emerald-400" },
  { key: "teal", label: "Teal", text: "text-teal-400", border: "border-l-teal-400", bg: "bg-teal-400/10", swatch: "bg-teal-400" },
  { key: "cyan", label: "Cyan", text: "text-cyan-400", border: "border-l-cyan-400", bg: "bg-cyan-400/10", swatch: "bg-cyan-400" },
  { key: "sky", label: "Sky", text: "text-sky-400", border: "border-l-sky-400", bg: "bg-sky-400/10", swatch: "bg-sky-400" },
  { key: "blue", label: "Blue", text: "text-blue-400", border: "border-l-blue-400", bg: "bg-blue-400/10", swatch: "bg-blue-400" },
  { key: "violet", label: "Violet", text: "text-violet-400", border: "border-l-violet-400", bg: "bg-violet-400/10", swatch: "bg-violet-400" },
  { key: "purple", label: "Purple", text: "text-purple-400", border: "border-l-purple-400", bg: "bg-purple-400/10", swatch: "bg-purple-400" },
  { key: "pink", label: "Pink", text: "text-pink-400", border: "border-l-pink-400", bg: "bg-pink-400/10", swatch: "bg-pink-400" },
  { key: "rose", label: "Rose", text: "text-rose-400", border: "border-l-rose-400", bg: "bg-rose-400/10", swatch: "bg-rose-400" },
] as const;

export type SituationPresetColor = (typeof SITUATION_PRESET_COLORS)[number];

/** Resolve a color key to its Tailwind classes — defaults to blue. */
export function getSituationColor(key: string): SituationPresetColor {
  return SITUATION_PRESET_COLORS.find((c) => c.key === key) ?? SITUATION_PRESET_COLORS[7];
}

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

/** Glanceable copy for the Call Sheet viewer situation grid (sideline reference surface). */
export const CALL_SHEET_VIEWER_SCENARIO_HELP: Record<CallSheetScenario, string> = {
  "Go-To Plays": "Your most trusted plays",
  Tempo: "On the ball",
  "Run Game": "Pound the rock",
  "Pass Game": "Air it out",
  "Man Beaters": "Speed kills",
  "Zone Beaters": "Find the spot",
  "Take a Shot": "Go deep",
  "Red Zone": "Get points",
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

/** `playbooks.game_version` for the shipped reference catalog (migrations + seeds; future cycles add new values). */
export const CFB_CATALOG_GAME_VERSION = "cfb26" as const;

/** Supported catalog game versions in `playbooks.game_version`. */
export type CatalogGameVersion = "cfb26" | "cfb27";

export const CATALOG_GAME_VERSIONS = ["cfb27", "cfb26"] as const satisfies readonly CatalogGameVersion[];

/** Default when creating a play sheet (CFB27-first product default). */
export const DEFAULT_CATALOG_GAME_VERSION: CatalogGameVersion = "cfb27";

export const CATALOG_GAME_VERSION_LABELS: Record<CatalogGameVersion, string> = {
  cfb27: "CFB 27",
  cfb26: "CFB 26",
};

export function parseCatalogGameVersion(raw: string | null | undefined): CatalogGameVersion {
  const v = (raw ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (v === "cfb26" || v === "26") return "cfb26";
  if (v === "cfb27" || v === "27") return "cfb27";
  return DEFAULT_CATALOG_GAME_VERSION;
}

/** `playbooks.side_of_ball` — offense or defense catalog slice. */
export type CatalogSideOfBall = "offense" | "defense";

export const CATALOG_SIDES_OF_BALL = ["offense", "defense"] as const satisfies readonly CatalogSideOfBall[];

export const CATALOG_SIDE_OF_BALL_LABELS: Record<CatalogSideOfBall, string> = {
  offense: "Offense",
  defense: "Defense",
};

/** Uppercase badge copy for call sheet metadata (`OFFENSE` / `DEFENSE`). */
export const CATALOG_SIDE_OF_BALL_BADGE_LABELS: Record<CatalogSideOfBall, string> = {
  offense: "OFFENSE",
  defense: "DEFENSE",
};

/** Compact game label for call sheet metadata rows (`CFB27`, `CFB26`). */
export function catalogGameVersionCompactLabel(version: CatalogGameVersion): string {
  return version.toUpperCase();
}

export function parseCatalogSideOfBall(raw: string | null | undefined): CatalogSideOfBall | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "offense" || v === "defense") return v;
  return null;
}

export function defaultSheetSituationsForSide(sideOfBall: CatalogSideOfBall): readonly DefaultSheetSituation[] {
  return sideOfBall === "defense" ? DEFAULT_DEFENSIVE_SITUATIONS : DEFAULT_OFFENSIVE_SITUATIONS;
}
