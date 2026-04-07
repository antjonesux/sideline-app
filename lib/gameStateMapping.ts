import type { FieldZone, LiveGameState } from "@/lib/mvp4Types";

/** Map live game state to play-sheet situation row label. */
export function situationFromGameState(gs: LiveGameState): string {
  if (gs.twoMinuteDrill) return "2-Minute Drill";

  if (gs.quarter === "OT") {
    return "Red Zone";
  }

  if (gs.fieldZone === "BACKED_UP") return "Backed Up";
  if (gs.fieldZone === "GOAL_LINE") return "Goal Line";
  if (gs.fieldZone === "RED_ZONE") return "Red Zone";

  if (gs.down === 1) return "1st & 10";

  if (gs.down === 2) {
    if (gs.distanceBucket === "LONG") return "2nd & Long";
    return "2nd & Medium";
  }

  if (gs.down === 3 || gs.down === 4) {
    if (gs.distanceBucket === "SHORT") return "3rd & Short";
    if (gs.distanceBucket === "MED") return "3rd & Medium";
    return "3rd & Long";
  }

  return "1st & 10";
}

export function effectiveFieldZoneForRules(gs: LiveGameState): FieldZone {
  if (gs.quarter === "OT") return "SCORING";
  return gs.fieldZone;
}

export function fieldZoneLabel(zone: FieldZone): string {
  const m: Record<FieldZone, string> = {
    GOAL_LINE: "GOAL LINE",
    RED_ZONE: "RED ZONE",
    SCORING: "SCORING",
    MIDFIELD: "MIDFIELD",
    OWN_TERRITORY: "OWN TERR",
    BACKED_UP: "BACKED UP",
  };
  return m[zone];
}

export function downLabel(down: 1 | 2 | 3 | 4): string {
  return ["1ST", "2ND", "3RD", "4TH"][down - 1] ?? `${down}`;
}

export function distanceLabel(bucket: "SHORT" | "MED" | "LONG"): string {
  if (bucket === "SHORT") return "SHORT";
  if (bucket === "MED") return "MED";
  return "LONG";
}

export function scoreContextShortLabel(
  ctx: LiveGameState["scoreContext"],
): string {
  switch (ctx) {
    case "UP_BIG":
      return "↑14+";
    case "UP":
      return "↑7";
    case "CLOSE":
      return "EVEN";
    case "DOWN":
      return "↓7";
    case "DOWN_BIG":
      return "↓14+";
    default:
      return "EVEN";
  }
}
