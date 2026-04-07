export type FieldZone =
  | "BACKED_UP"
  | "OWN_TERRITORY"
  | "MIDFIELD"
  | "SCORING"
  | "RED_ZONE"
  | "GOAL_LINE";

export type LiveGameState = {
  fieldZone: FieldZone;
  down: 1 | 2 | 3 | 4;
  distanceBucket: "SHORT" | "MED" | "LONG";
  scoreContext: "UP_BIG" | "UP" | "CLOSE" | "DOWN" | "DOWN_BIG";
  quarter: 1 | 2 | 3 | 4 | "OT";
  coverageTags: string[];
  twoMinuteDrill: boolean;
};

export type FieldPositionRuleRow = {
  field_zone: string;
  prioritize_play_types: string[] | null;
  suppress_play_types: string[] | null;
  rule_note: string | null;
};

export type CoverageAffinityRow = {
  coverage_tag: string;
  favored_play_types: string[] | null;
  suppressed_play_types: string[] | null;
};

export type EnginePlay = {
  id: string;
  situation: string;
  formation: string;
  play_name: string;
  coaching_note: string | null;
  counter_play: string | null;
  is_featured: boolean;
  is_used: boolean;
  play_type: string | null;
};

export type Recommendation = {
  primary: EnginePlay | null;
  alternates: EnginePlay[];
  ruleNote: string;
  modifierNotes: string[];
  suppressedReasons: string[];
  fourthDownNote: string | null;
};

export type LocalTimelineEvent = {
  id: string;
  createdAt: number;
  quarter: number | null;
  isOt: boolean;
  fieldZone: string | null;
  down: number | null;
  distanceBucket: string | null;
  scoreContext: string | null;
  coverageTags: string[];
  playFormation: string | null;
  playName: string | null;
  markedUsed: boolean;
  quickNote: string | null;
  eventType: "play_used" | "coverage_tag" | "note";
};
