export const PLAY_TYPES = [
  "Inside Run",
  "Outside Run",
  "QB Run",
  "Option",
  "Quick Pass",
  "Medium Pass",
  "Deep Pass",
  "Play Action",
  "Screen",
  "RPO",
] as const;

export type SeedPlayType = (typeof PLAY_TYPES)[number];

const GLOBAL_EXACT_OVERRIDES: Record<string, SeedPlayType> = {
  "SMASH": "Quick Pass",
  "ANGLE SMASH": "Quick Pass",
  "DBL SMASH": "Quick Pass",
  "DOUBLE SMASH": "Quick Pass",
  "MTN SMASH": "Quick Pass",
  "MTN WHEEL SMASH": "Quick Pass",
  "SMASH UNDER": "Quick Pass",
  "SPRINT SMASH": "Quick Pass",
  "WR UNDER": "Quick Pass",
  "GL RUB RETURN": "Quick Pass",
  "SPRINT DOUBLE OUT": "Quick Pass",
  "MTN BENCH": "Quick Pass",
  "MTN SPRINT BENCH": "Quick Pass",

  "SMASH DAGGER": "Medium Pass",
  "Y TRAIL": "Medium Pass",
  "MIDDLE HI LO": "Medium Pass",
  "RZ DOUBLE UNDER": "Medium Pass",
  "MTN WHEEL OVER": "Medium Pass",
  "SHOCK": "Medium Pass",
  "94 WILL": "Medium Pass",
  "RZ DUSTY": "Medium Pass",

  "CHINA N GO": "Deep Pass",
  "FORK WHEEL": "Deep Pass",
  "ALL GO": "Deep Pass",

  "MTN PA SLIDE": "Play Action",

  "JET QB COUNTER": "Outside Run",
  "COUNTER F ALERT X SMOKE": "Outside Run",
  "HB OFF TACKLE": "Outside Run",
  "HB SPLIT O": "Outside Run",
  "HB STING": "Outside Run",
  "DIY REVERSE": "Outside Run",
  "DIY ZONE REVERSE": "Outside Run",
  "ZONE FAKE JET": "Outside Run",
  "JET DASH WK": "Outside Run",
  "RD OPT WK": "Outside Run",
  "HB COUNTER": "Outside Run",
  "COUNTER Y": "Outside Run",
  "COUNTER WEAK": "Outside Run",
  "HB COUNTER WK": "Outside Run",
  "MTN COUNTER": "Outside Run",
  "MTN COUNTER Y": "Outside Run",
  "MTN HB COUNTER": "Outside Run",
  "WIDE ZONE": "Outside Run",

  "HB BASE": "Inside Run",
  "HB GUT": "Inside Run",
  "HB DRAW": "Inside Run",
  "HB MID DRAW": "Inside Run",
  "0 1 TRAP": "Inside Run",
  "01 TRAP": "Inside Run",
  "MTN 01 TRAP": "Inside Run",
  "MTN O 1 TRAP": "Inside Run",
  "SPLIT ZONE": "Inside Run",
  "SPLIT ZONE WK": "Inside Run",
  "HB ZONE": "Inside Run",
  "HB ZONE WK": "Inside Run",
  "MTN HB ZONE WK": "Inside Run",

  "JET TOUCH PASS": "Screen",
  "JET PASS FK ZONE": "Screen",

  "FAKE JET HB WHEEL": "RPO",
  "FAKE JET SCISSORS": "RPO",
  "MTN REDZONE HB SCISSORS": "Medium Pass",
};

const TEAM_EXACT_OVERRIDES: Record<string, Record<string, SeedPlayType>> = {};

function normalizePlayName(playName: string): string {
  return playName.trim().toUpperCase().replace(/\s+/g, " ");
}

function hasAny(name: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => name.includes(pattern));
}

function classifyByPattern(playName: string): SeedPlayType | null {
  const name = normalizePlayName(playName);

  if (name.startsWith("PA ") || hasAny(name, ["PLAY ACTION", "BOOT"])) return "Play Action";
  if (hasAny(name, ["RPO"])) return "RPO";
  if (
    hasAny(name, ["READ"]) &&
    hasAny(name, [
      "SLANT",
      "STICK",
      "QUICK",
      "HITCH",
      "SPOT",
      "FLAT",
      "CHECK",
      "MESH",
      "SHALLOW",
      "CROSS",
      "CURL",
      "DIG",
      "SAIL",
      "DRIVE",
      "LEVELS",
      "VERT",
      "FADE",
      "POST",
      "CORNER",
      "GO",
      "4 VERTS",
      "FLOOD",
      "SEAM",
      "DEEP",
      "SCREEN",
      "BUBBLE",
      "TUNNEL",
      "SWING",
    ])
  ) {
    return "RPO";
  }

  if (name.startsWith("QB ") || hasAny(name, ["QB POWER", "QB SNEAK", "QB KEEP", "QB DRAW"])) {
    return "QB Run";
  }
  if (hasAny(name, ["OPTION", "TRIPLE", "VEER", "MIDLINE", "LOAD", "SPEED OPT"])) return "Option";
  if (hasAny(name, ["SCREEN", "BUBBLE", "TUNNEL", "SWING"])) return "Screen";
  if (hasAny(name, ["VERT", "FADE", "POST", "CORNER", "GO", "4 VERTS", "FLOOD", "SEAM", "DEEP"])) {
    return "Deep Pass";
  }
  if (hasAny(name, ["MESH", "SHALLOW", "CROSS", "CURL", "DIG", "SAIL", "DRIVE", "LEVELS"])) {
    return "Medium Pass";
  }
  if (hasAny(name, ["SLANT", "STICK", "QUICK", "HITCH", "SPOT", "FLAT", "CHECK"])) return "Quick Pass";
  if (hasAny(name, ["OUTSIDE ZONE", "OZ", "STRETCH", "SWEEP", "TOSS", "CRACK", "PITCH"])) {
    return "Outside Run";
  }
  if (hasAny(name, ["INSIDE ZONE", " IZ ", "DUO", "POWER O", "POWER", "DIVE", "BLAST", "LEAD", "ISO"])) {
    return "Inside Run";
  }

  return null;
}

export function resolveSeedPlayType(params: {
  team: string;
  playName: string;
  explicitPlayType?: string | null;
}): SeedPlayType {
  const explicit = params.explicitPlayType?.trim();
  if (explicit && PLAY_TYPES.includes(explicit as SeedPlayType)) {
    return explicit as SeedPlayType;
  }

  const normalizedName = normalizePlayName(params.playName);
  const teamOverride = TEAM_EXACT_OVERRIDES[params.team.trim()]?.[normalizedName];
  if (teamOverride) return teamOverride;

  const globalOverride = GLOBAL_EXACT_OVERRIDES[normalizedName];
  if (globalOverride) return globalOverride;

  return classifyByPattern(normalizedName) ?? "Medium Pass";
}
