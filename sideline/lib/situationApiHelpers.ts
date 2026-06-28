import {
  DEFAULT_SHEET_SITUATIONS,
  GO_TO_PLAYS_SCENARIO,
  SITUATION_PRESET_COLORS,
  SITUATION_PRESET_ICONS,
} from "@/lib/constants";

export const MAX_SITUATIONS_PER_SHEET = 16;
export const MAX_PLAYS_PER_SITUATION = 25;

const PRESET_COLOR_KEYS = new Set<string>(SITUATION_PRESET_COLORS.map((c) => c.key));
const PRESET_ICON_NAMES = new Set<string>([...SITUATION_PRESET_ICONS, "Star"]);

export type SituationRow = {
  id: string;
  play_sheet_id: string;
  scenario: string;
  scenario_order: number;
  description: string | null;
  icon: string | null;
  color: string;
  is_locked: boolean;
};

export function isValidPresetColor(key: string): boolean {
  return PRESET_COLOR_KEYS.has(key);
}

export function isValidPresetIcon(name: string | null | undefined): boolean {
  if (name == null || name === "") return true;
  return PRESET_ICON_NAMES.has(name);
}

export function normalizeSituationName(name: string): string {
  return name.trim();
}

export function situationSelectColumns(): string {
  return "id, play_sheet_id, scenario, scenario_order, description, icon, color, is_locked";
}

export function mapSituationRow(row: SituationRow) {
  return {
    id: row.id,
    scenario: row.scenario,
    scenario_order: row.scenario_order,
    description: row.description ?? "",
    icon: row.icon,
    color: row.color,
    is_locked: row.is_locked,
  };
}

/** First preset color not already used on this sheet; falls back to blue. */
export function defaultColorForNewSituation(usedColors: string[]): string {
  const used = new Set(usedColors);
  const available = SITUATION_PRESET_COLORS.find((c) => !used.has(c.key));
  return available?.key ?? SITUATION_PRESET_COLORS[7].key;
}

export function isGoToPlaysSituation(row: Pick<SituationRow, "scenario" | "is_locked">): boolean {
  return row.is_locked || row.scenario === GO_TO_PLAYS_SCENARIO || row.scenario === "Go-to Plays";
}

export { DEFAULT_SHEET_SITUATIONS };
