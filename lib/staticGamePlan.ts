import {
  GAME_PLAN_IDS,
  type AdjustedSituationalCall,
  type FormationExploit,
  type GamePlan,
  type GamePlanBundle,
} from "@/lib/gamePlanTypes";
import { SCHEME_IDS } from "@/lib/staticData";
import { getStaticDefensiveProfile } from "@/lib/staticDefensiveSchemes";

const ARBUCKLE = SCHEME_IDS.arbuckle;

function arbuckleVs425Bundle(): GamePlanBundle | null {
  const defensiveProfile = getStaticDefensiveProfile("4-2-5");
  if (!defensiveProfile) return null;

  const gamePlan: GamePlan = {
    id: GAME_PLAN_IDS.arbuckleVs425,
    offensive_scheme_id: ARBUCKLE,
    defensive_scheme: "4-2-5",
    vulnerability_summary:
      "Against Air Raid: the two-linebacker box is susceptible to mesh concepts and crossing routes. The safeties have to choose — run support or deep coverage. Make them wrong every time.",
  };

  const formationExploits: FormationExploit[] = [
    {
      id: "static-fe-1",
      game_plan_id: gamePlan.id,
      formation_name: "Gun Empty Base Flex",
      why_it_works:
        "Forces the 2 LBs out of the box — no run support, pure coverage. Attack the seams.",
      counter_threat: "If they bring a safety down, you have a 1-on-1 deep.",
      leverage_level: "High Leverage",
      priority: 1,
    },
    {
      id: "static-fe-2",
      game_plan_id: gamePlan.id,
      formation_name: "Pistol Wing Slot",
      why_it_works:
        "RPO reads the overhang defender. If he stays, hand off. If he crashes, throw the flat.",
      counter_threat:
        "They can't stop both without showing blitz pre-snap.",
      leverage_level: "Situational",
      priority: 2,
    },
    {
      id: "static-fe-3",
      game_plan_id: gamePlan.id,
      formation_name: "Gun Trio Offset",
      why_it_works:
        "Overloads the boundary. 3 routes vs 2 DBs. One of them is open.",
      counter_threat:
        "Safety rotation reveals the coverage — read it pre-snap.",
      leverage_level: "Constraint Play",
      priority: 3,
    },
  ];

  const adjustedCalls: AdjustedSituationalCall[] = [
    {
      id: "static-ac-1",
      game_plan_id: gamePlan.id,
      situation: "1st & 10",
      down: 1,
      distance_min: 10,
      distance_max: 10,
      formation: "Gun Empty Base Flex",
      play_type: "Mesh Concept",
      rationale:
        "Forces 2 LBs to declare — mesh creates natural rubs on crossing routes vs the nickel box.",
      priority: 1,
    },
    {
      id: "static-ac-2",
      game_plan_id: gamePlan.id,
      situation: "2nd & Medium",
      down: 2,
      distance_min: 4,
      distance_max: 6,
      formation: "Pistol Wing Slot",
      play_type: "RPO Bubble",
      rationale:
        "4-2-5 overhang is the read — he can't play both the bubble and the run fit.",
      priority: 2,
    },
    {
      id: "static-ac-3",
      game_plan_id: gamePlan.id,
      situation: "2nd & Long",
      down: 2,
      distance_min: 7,
      distance_max: 99,
      formation: "Gun Doubles Offset",
      play_type: "Play Action Deep",
      rationale:
        "Safety rotation after play fake — attack the vacated deep third when nickel safeties bite.",
      priority: 3,
    },
    {
      id: "static-ac-4",
      game_plan_id: gamePlan.id,
      situation: "3rd & Short",
      down: 3,
      distance_min: 1,
      distance_max: 2,
      formation: "Pistol U Off",
      play_type: "QB Power",
      rationale:
        "5 DBs on the field — only 6 run defenders in the box. You have the numbers vs nickel.",
      priority: 4,
    },
    {
      id: "static-ac-5",
      game_plan_id: gamePlan.id,
      situation: "3rd & Long",
      down: 3,
      distance_min: 6,
      distance_max: 99,
      formation: "Gun Empty Trips Y Off",
      play_type: "Spacing / Flood",
      rationale:
        "Nickel means more zone — flood the zone with 3 routes to one side and make the overhang choose.",
      priority: 5,
    },
    {
      id: "static-ac-6",
      game_plan_id: gamePlan.id,
      situation: "Red Zone",
      down: null,
      distance_min: null,
      distance_max: null,
      formation: "Gun Bunch Open TE",
      play_type: "Fade or Back Shoulder",
      rationale:
        "Compressed field + red-zone man = boundary 1-on-1. Win with timing vs 4-2-5 leverage.",
      priority: 6,
    },
    {
      id: "static-ac-7",
      game_plan_id: gamePlan.id,
      situation: "2-Minute Drill",
      down: null,
      distance_min: null,
      distance_max: null,
      formation: "Gun Empty Base Flex",
      play_type: "Slants + Checkdowns",
      rationale:
        "Keep tempo — nickel zones widen late; slants and checks move the chains without letting coverage dictate pace.",
      priority: 7,
    },
    {
      id: "static-ac-8",
      game_plan_id: gamePlan.id,
      situation: "3rd & Medium",
      down: 3,
      distance_min: 4,
      distance_max: 6,
      formation: "Gun Empty Base Flex",
      play_type: "Quick Game / Levels",
      rationale:
        "Nickel LBs widen — attack the intermediate windows before safeties can drive.",
      priority: 8,
    },
    {
      id: "static-ac-9",
      game_plan_id: gamePlan.id,
      situation: "Goal Line",
      down: null,
      distance_min: null,
      distance_max: null,
      formation: "Pistol U Off",
      play_type: "Power / Gap Run",
      rationale:
        "Extra DBs shrink the box — gap schemes and double teams win at the goal line.",
      priority: 9,
    },
    {
      id: "static-ac-10",
      game_plan_id: gamePlan.id,
      situation: "Backed Up",
      down: null,
      distance_min: null,
      distance_max: null,
      formation: "Pistol U Off",
      play_type: "Outside Run / PA",
      rationale:
        "Own 1–10: horizontal stretch clears space before taking a shot off play action.",
      priority: 10,
    },
  ];

  return {
    defensiveProfile,
    gamePlan,
    formationExploits,
    adjustedCalls,
  };
}

export function getStaticGamePlanBundle(
  offensiveSchemeId: string,
  defensiveScheme: string,
): GamePlanBundle | null {
  if (offensiveSchemeId === ARBUCKLE && defensiveScheme === "4-2-5") {
    return arbuckleVs425Bundle();
  }
  return null;
}
