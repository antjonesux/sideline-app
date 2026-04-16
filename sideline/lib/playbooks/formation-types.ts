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

export function sortFormationTypes(a: string, b: string): number {
  const order = FORMATION_TYPE_ORDER as readonly string[];
  const ia = order.indexOf(a);
  const ib = order.indexOf(b);
  if (ia === -1 && ib === -1) return a.localeCompare(b);
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
}
