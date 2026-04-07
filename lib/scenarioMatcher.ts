import type { GameState, Scenario } from "@/lib/liveTypes";

export function matchScenario(gameState: GameState): Scenario {
  const { fieldZone, down, distance, scoreContext, quarter, twoMinuteWarning } = gameState;
  if (fieldZone === "GOAL_LINE") return "Goal Line";
  if (twoMinuteWarning && (quarter === 2 || quarter === 4)) return "2-Minute Drill";
  if (scoreContext === "UP_7_PLUS" && quarter === 4 && distance <= 4) return "4-Minute";
  if (down === 4) return "4th Down";
  if (fieldZone === "BACKED_UP") return "Backed Up";
  if (fieldZone === "RED_ZONE") return "Red Zone";
  if (down === 1) return "1st Down";
  if (down === 2 && distance <= 3) return "2nd & Short";
  if (down === 2 && distance <= 7) return "2nd & Medium";
  if (down === 2) return "2nd & Long";
  if (down === 3 && distance <= 3) return "3rd & Short";
  if (down === 3 && distance <= 6) return "3rd & Medium";
  if (down === 3) return "3rd & Long";
  return "1st Down";
}
