export type Side = "OWN" | "OPP";

export function deriveFieldZone(yardLine: number, side: Side): string {
  if (side === "OPP" && yardLine <= 5) return "GOAL_LINE";
  if (side === "OPP" && yardLine <= 20) return "RED_ZONE";
  if (side === "OPP" && yardLine <= 39) return "SCORING";
  if (side === "OPP" || (side === "OWN" && yardLine >= 40)) return "MIDFIELD";
  if (side === "OWN" && yardLine >= 11) return "OWN_TERRITORY";
  return "BACKED_UP";
}

export function deriveScenario(down: number, distance: number, fieldZone: string): string {
  if (fieldZone === "GOAL_LINE") return "Goal Line";
  if (fieldZone === "RED_ZONE" && down === 1) return "Red Zone";
  if (fieldZone === "BACKED_UP") return "Backed Up";
  if (down === 4) return "4th Down";
  if (down === 1) return "1st Down";
  if (down === 2 && distance <= 3) return "2nd & Short";
  if (down === 2 && distance <= 7) return "2nd & Medium";
  if (down === 2) return "2nd & Long";
  if (down === 3 && distance <= 3) return "3rd & Short";
  if (down === 3 && distance <= 6) return "3rd & Medium";
  return "3rd & Long";
}
