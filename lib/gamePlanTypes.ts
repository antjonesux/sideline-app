export interface DefensiveSchemeProfile {
  id: string;
  scheme_name: string;
  description: string | null;
  coverage_tendency: string | null;
  pressure_tendency: string | null;
  created_at?: string;
}

export interface GamePlan {
  id: string;
  offensive_scheme_id: string;
  defensive_scheme: string;
  vulnerability_summary: string | null;
  created_at?: string;
}

export interface FormationExploit {
  id: string;
  game_plan_id: string;
  formation_name: string;
  why_it_works: string | null;
  counter_threat: string | null;
  leverage_level: string | null;
  priority: number | null;
  created_at?: string;
}

export interface AdjustedSituationalCall {
  id: string;
  game_plan_id: string;
  situation: string;
  down: number | null;
  distance_min: number | null;
  distance_max: number | null;
  formation: string;
  play_type: string;
  rationale: string;
  priority: number;
  created_at?: string;
}

export interface GamePlanBundle {
  defensiveProfile: DefensiveSchemeProfile;
  gamePlan: GamePlan;
  formationExploits: FormationExploit[];
  adjustedCalls: AdjustedSituationalCall[];
}

export const DEFENSIVE_SCHEME_OPTIONS = [
  "3-2-6",
  "3-3-5",
  "3-3-5 Tite",
  "3-4",
  "3-4 Multiple",
  "4-2-5",
  "4-3",
  "4-3 Multiple",
  "Multiple D",
] as const;

export const GAME_PLAN_IDS = {
  arbuckleVs425: "00000002-0000-4000-8000-000000000001",
} as const;
