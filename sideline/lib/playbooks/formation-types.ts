export const FORMATION_TYPE_ORDER = [
  "I Form",
  "Pistol",
  "Gun",
  "Flexbone",
  "Wingbone",
  "Singleback",
  "Goal Line",
  "Hail Mary",
] as const;

/** Play Sheet add-play browse: pin these section labels to the bottom (offense). */
export const OFFENSE_TRAILING_FORMATION_GROUPS = ["Goal Line", "Hail Mary"] as const;

/** Play Sheet add-play browse: pin these section labels to the bottom (defense). */
export const DEFENSE_TRAILING_FORMATION_GROUPS = ["Goal Line", "Prevent"] as const;

export function sortFormationTypes(a: string, b: string): number {
  const order = FORMATION_TYPE_ORDER as readonly string[];
  const ia = order.indexOf(a);
  const ib = order.indexOf(b);
  if (ia === -1 && ib === -1) return a.localeCompare(b);
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
}

/** Move trailing formation-type sections to the end in catalog order (Goal Line, then Hail Mary / Prevent). */
export function pinTrailingFormationGroups<T extends { group: string }>(
  groups: T[],
  trailing: readonly string[],
): T[] {
  const trailingSet = new Set(trailing);
  const rest = groups.filter((g) => !trailingSet.has(g.group));
  const pinned = trailing
    .map((name) => groups.find((g) => g.group === name))
    .filter((g): g is T => Boolean(g));
  return [...rest, ...pinned];
}
