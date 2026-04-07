import type { PlaySheetPlay, Scenario } from "@/lib/liveTypes";

export const TEAM_SCHEME_MAP: Record<string, { offensiveScheme: string; defensiveScheme: string }> = {
  "Washington State": { offensiveScheme: "Power Spread", defensiveScheme: "4-2-5" },
  Georgia: { offensiveScheme: "Pro Style", defensiveScheme: "3-3-5 Tite" },
};

const base: Array<[Scenario, string, string]> = [
  ["Opening Script", "Pistol Wing Slot", "HB STRETCH"],
  ["Opening Script", "Gun Empty Base Flex", "Y SHALLOW CROSS"],
  ["1st Down", "Gun Wing Slot Offset", "INSIDE ZONE"],
  ["2nd & Short", "Pistol U Off", "RPO PEEK SLANT FLAT"],
  ["2nd & Medium", "Gun Empty Base Flex", "LEVELS SWITCH"],
  ["2nd & Long", "Gun Empty Base Flex", "VERTICALS"],
  ["3rd & Short", "Gun Empty Base Flex", "STICK"],
  ["3rd & Medium", "Gun Empty Trips Y Off", "LEVELS SEAM"],
  ["3rd & Long", "Gun Trio 4WR Str", "ALL GO"],
  ["Red Zone", "Gun Empty Base Flex", "Y CORNER"],
  ["Goal Line", "Pistol Wing Slot", "POWER O"],
  ["Backed Up", "Gun Empty Base Flex", "WR SCREEN"],
  ["2-Minute Drill", "Gun Empty Base Flex", "STICK"],
  ["4-Minute", "Pistol U Off", "HB DIVE"],
  ["4th Down", "Gun Wing Slot Offset", "QB POWER"],
  ["2-Point Conversion", "Pistol U Off", "RPO PEEK SLANT FLAT"],
];

export function powerSpreadBaseSheet(): PlaySheetPlay[] {
  return base.map(([scenario, formation, playName], idx) => ({
    id: `seed-${idx + 1}`,
    scenario,
    formation,
    playName,
    playOrder: idx + 1,
  }));
}
