import type { CatalogSideOfBall } from "@/lib/constants";

/** EA generic offensive playbooks (not tied to a college team). */
export const GENERIC_OFFENSIVE_PLAYBOOKS = [
  "Air Raid",
  "Go Go",
  "Multiple",
  "Option",
  "Pistol",
  "Power Spread",
  "Pro Style",
  "Run & Shoot",
  "Spread",
  "Spread Option",
  "Veer & Shoot",
] as const;

export type GenericOffensivePlaybook = (typeof GENERIC_OFFENSIVE_PLAYBOOKS)[number];

const GENERIC_OFFENSIVE_PLAYBOOK_SET = new Set<string>(GENERIC_OFFENSIVE_PLAYBOOKS);

export function isGenericOffensivePlaybook(playbookName: string): boolean {
  return GENERIC_OFFENSIVE_PLAYBOOK_SET.has(playbookName.trim());
}

export const PLAYBOOK_CATALOG_SECTIONS = [
  { id: "team", label: "Team Playbooks" },
  { id: "generic", label: "Generic Playbooks" },
] as const;

export const OFFENSE_CATALOG_SECTIONS = [
  { id: "team", label: "Team Offensive Playbooks" },
  { id: "generic", label: "Generic Offensive Playbooks" },
] as const;

export const DEFENSE_CATALOG_SECTIONS = [{ id: "generic", label: "Generic Defensive Playbooks" }] as const;

export type PlaybookCatalogSectionId =
  | (typeof PLAYBOOK_CATALOG_SECTIONS)[number]["id"]
  | (typeof OFFENSE_CATALOG_SECTIONS)[number]["id"]
  | (typeof DEFENSE_CATALOG_SECTIONS)[number]["id"];

export function getCatalogSectionsForSide(side: CatalogSideOfBall) {
  return side === "defense" ? DEFENSE_CATALOG_SECTIONS : OFFENSE_CATALOG_SECTIONS;
}

export function getCatalogPlaybookSection(playbookName: string): PlaybookCatalogSectionId {
  return isGenericOffensivePlaybook(playbookName) ? "generic" : "team";
}

export function getCatalogPlaybookSectionForSide(
  playbookName: string,
  side: CatalogSideOfBall,
): PlaybookCatalogSectionId {
  if (side === "defense") return "generic";
  return getCatalogPlaybookSection(playbookName);
}

export function sortCatalogPlaybookNames(playbooks: string[]): string[] {
  const team: string[] = [];
  const generic: string[] = [];
  for (const name of playbooks) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    if (isGenericOffensivePlaybook(trimmed)) generic.push(trimmed);
    else team.push(trimmed);
  }
  team.sort((a, b) => a.localeCompare(b));
  generic.sort((a, b) => a.localeCompare(b));
  return [...team, ...generic];
}

export function sortCatalogPlaybookNamesForSide(playbooks: string[], side: CatalogSideOfBall): string[] {
  if (side === "defense") {
    return [...playbooks]
      .map((name) => name.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }
  return sortCatalogPlaybookNames(playbooks);
}

export function sortByCatalogPlaybookSection<T extends { playbook_name: string }>(rows: T[]): T[] {
  const team: T[] = [];
  const generic: T[] = [];
  for (const row of rows) {
    if (isGenericOffensivePlaybook(row.playbook_name)) generic.push(row);
    else team.push(row);
  }
  const byName = (a: T, b: T) => a.playbook_name.localeCompare(b.playbook_name);
  team.sort(byName);
  generic.sort(byName);
  return [...team, ...generic];
}
