/**
 * Defensive catalog play types — separate from offensive RUN/PASS/RPO.
 * Resolved from play call names to match cfb.fan / play-art badge labels.
 */

export const DEFENSIVE_PLAY_TYPES = ["MAN", "ZONE", "BLITZ", "MATCH"] as const;

export type DefensivePlayType = (typeof DEFENSIVE_PLAY_TYPES)[number];

export function isDefensivePlayType(raw: string | null | undefined): raw is DefensivePlayType {
  const u = (raw ?? "").trim().toUpperCase();
  return DEFENSIVE_PLAY_TYPES.includes(u as DefensivePlayType);
}

export function normalizeDefensivePlayType(raw: string | null | undefined): DefensivePlayType | null {
  const u = (raw ?? "").trim().toUpperCase();
  return isDefensivePlayType(u) ? u : null;
}

/** Name ladder for defensive coverage family — order matters (BLITZ before ZONE, MATCH before ZONE). */
export function deriveDefensivePlayTypeFromName(playName: string): DefensivePlayType | null {
  const n = playName.trim().toUpperCase();
  if (!n) return null;

  if (
    /\bBLITZ\b/.test(n) ||
    /\bFIRE\b/.test(n) ||
    /PRESSURE/.test(n) ||
    /\bSTORM\b/.test(n) ||
    /\bZERO\b/.test(n)
  ) {
    return "BLITZ";
  }

  if (/\bMATCH\b/.test(n) || /\bPALMS\b/.test(n) || /\bQUARTERS\b/.test(n)) {
    return "MATCH";
  }

  if (
    /\bMAN\b/.test(n) ||
    /\bCOVER 0\b/.test(n) ||
    /\bCOVER 1\b/.test(n) ||
    /\bROBBER\b/.test(n) ||
    /\bHOLE\b/.test(n)
  ) {
    return "MAN";
  }

  if (
    /\bZONE\b/.test(n) ||
    /\bCOVER 2\b/.test(n) ||
    /\bCOVER 3\b/.test(n) ||
    /\bCOVER 4\b/.test(n) ||
    /\bCOVER 6\b/.test(n) ||
    /\bCOVER 9\b/.test(n) ||
    /\bTAMPA\b/.test(n) ||
    /\bSKY\b/.test(n) ||
    /\bCLOUD\b/.test(n) ||
    /\bDROP\b/.test(n) ||
    /\bSHOW\b/.test(n) ||
    /\bINVERT\b/.test(n) ||
    /\bTRAP\b/.test(n) ||
    /\bSIM\b/.test(n)
  ) {
    return "ZONE";
  }

  return null;
}

/** Prefer stored defensive label, then name ladder. Never maps to offensive RUN/PASS/RPO. */
export function resolveDefensiveDisplayPlayType(
  playName: string,
  storedType: string | null | undefined,
): DefensivePlayType | null {
  return normalizeDefensivePlayType(storedType) ?? deriveDefensivePlayTypeFromName(playName);
}

export function defensivePlayTypeBadgeClass(type: DefensivePlayType): string {
  if (type === "MAN") return "border-rose-700/70 bg-rose-900/30 text-rose-300";
  if (type === "ZONE") return "border-sky-700/70 bg-sky-900/30 text-sky-300";
  if (type === "BLITZ") return "border-orange-700/70 bg-orange-900/30 text-orange-300";
  return "border-violet-700/70 bg-violet-900/30 text-violet-300";
}

export function defensivePlayTypeAccentClass(type: DefensivePlayType): string {
  if (type === "MAN") return "bg-rose-500";
  if (type === "ZONE") return "bg-sky-500";
  if (type === "BLITZ") return "bg-orange-500";
  return "bg-violet-500";
}
