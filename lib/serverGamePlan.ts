import type { DefensiveSchemeProfile, GamePlanBundle } from "@/lib/gamePlanTypes";
import { getSupabase } from "@/lib/supabase";
import {
  getStaticDefensiveProfile,
  STATIC_DEFENSIVE_SCHEMES,
} from "@/lib/staticDefensiveSchemes";
import { getStaticGamePlanBundle } from "@/lib/staticGamePlan";

function sortExploits(list: GamePlanBundle["formationExploits"]) {
  return [...list].sort(
    (a, b) => (a.priority ?? 0) - (b.priority ?? 0),
  );
}

function sortAdjusted(list: GamePlanBundle["adjustedCalls"]) {
  return [...list].sort((a, b) => a.priority - b.priority);
}

/** Fill missing situations from static bundle (same matchup) when DB seed is partial. */
function mergeAdjustedCallsFromFallback(
  dbRows: GamePlanBundle["adjustedCalls"],
  fallbackBundle: GamePlanBundle | null,
  gamePlanId: string,
): GamePlanBundle["adjustedCalls"] {
  if (!fallbackBundle?.adjustedCalls.length) {
    return sortAdjusted(dbRows);
  }
  const bySituation = new Map(
    dbRows.map((r) => [r.situation, r] as const),
  );
  for (const row of fallbackBundle.adjustedCalls) {
    if (!bySituation.has(row.situation)) {
      bySituation.set(row.situation, { ...row, game_plan_id: gamePlanId });
    }
  }
  return sortAdjusted(Array.from(bySituation.values()));
}

export async function loadDefensiveSchemes(): Promise<DefensiveSchemeProfile[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return STATIC_DEFENSIVE_SCHEMES;
  }

  const { data, error } = await supabase
    .from("defensive_schemes")
    .select("*")
    .order("scheme_name", { ascending: true });

  if (error || !data?.length) {
    return STATIC_DEFENSIVE_SCHEMES;
  }

  return data as DefensiveSchemeProfile[];
}

export async function loadGamePlanBundle(
  offensiveSchemeId: string,
  defensiveScheme: string,
): Promise<GamePlanBundle | null> {
  const fallback = getStaticGamePlanBundle(offensiveSchemeId, defensiveScheme);
  const supabase = getSupabase();

  if (!supabase) {
    return fallback;
  }

  const { data: plan, error: planError } = await supabase
    .from("game_plans")
    .select("*")
    .eq("offensive_scheme_id", offensiveSchemeId)
    .eq("defensive_scheme", defensiveScheme)
    .maybeSingle();

  if (planError || !plan) {
    return fallback;
  }

  const { data: profileRow } = await supabase
    .from("defensive_schemes")
    .select("*")
    .eq("scheme_name", defensiveScheme)
    .maybeSingle();

  const profile =
    (profileRow as DefensiveSchemeProfile | null) ??
    getStaticDefensiveProfile(defensiveScheme);

  if (!profile) {
    return fallback;
  }

  const planId = plan.id as string;

  const [exRes, callRes] = await Promise.all([
    supabase
      .from("formation_exploits")
      .select("*")
      .eq("game_plan_id", planId)
      .order("priority", { ascending: true }),
    supabase
      .from("adjusted_situational_calls")
      .select("*")
      .eq("game_plan_id", planId)
      .order("priority", { ascending: true }),
  ]);

  const formationExploits = exRes.data ?? [];
  const adjustedCalls = callRes.data ?? [];

  if (!formationExploits.length || !adjustedCalls.length) {
    return fallback;
  }

  return {
    defensiveProfile: profile,
    gamePlan: plan as GamePlanBundle["gamePlan"],
    formationExploits: sortExploits(
      formationExploits as GamePlanBundle["formationExploits"],
    ),
    adjustedCalls: mergeAdjustedCallsFromFallback(
      adjustedCalls as GamePlanBundle["adjustedCalls"],
      fallback,
      planId,
    ),
  };
}
