import {
  CALL_SHEET_SCENARIO_DISPLAY,
  CALL_SHEET_SCENARIO_HELP,
  CALL_SHEET_SCENARIO_MARKER,
  CALL_SHEET_SCENARIO_SHORT,
  CALL_SHEET_SCENARIOS,
  CALL_SHEET_VIEWER_SCENARIO_HELP,
  GO_TO_PLAYS_SCENARIO,
  SCENARIO_SHORT,
  SCENARIOS,
} from "@/lib/constants";
import type { CallSheetScenario, PlaySheetScenario } from "@/lib/constants";
import type { SheetScenarioBlock } from "@/lib/types";
import { normalizePlayName } from "@/lib/utils";

/** Yardage bands for down-and-distance scenarios (thresholds match derivePlayContext.deriveScenario / csvImportPreview). */
const SCENARIO_YARDAGE_SUFFIX: Partial<Record<PlaySheetScenario, string>> = {
  "2nd & Short": "1\u20133 yds",
  "2nd & Medium": "4\u20137 yds",
  "2nd & Long": "8+ yds",
  "3rd & Short": "1\u20133 yds",
  "3rd & Medium": "4\u20136 yds",
  "3rd & Long": "7+ yds",
};

/** Append the yardage band to a scenario label when one applies. */
export function scenarioDisplayLabel(scenario: string): string {
  const suffix = SCENARIO_YARDAGE_SUFFIX[scenario as PlaySheetScenario];
  return suffix ? `${scenario} (${suffix})` : scenario;
}

const SCENARIO_ORDER_INDEX = new Map(SCENARIOS.map((label, index) => [label, index]));

/** Order situation badges like `SCENARIOS` even if the API returns another order. */
export function sortScenariosByCanonicalOrder(blocks: SheetScenarioBlock[]): SheetScenarioBlock[] {
  return [...blocks].sort((a, b) => {
    const ia = SCENARIO_ORDER_INDEX.get(a.scenario as (typeof SCENARIOS)[number]) ?? 999;
    const ib = SCENARIO_ORDER_INDEX.get(b.scenario as (typeof SCENARIOS)[number]) ?? 999;
    return ia - ib;
  });
}

/** Default max calls per situation; see `scenarioMaxSlots` (API + Play Sheet + Film). */
export const PLAY_SHEET_SCENARIO_MAX_DEFAULT = 10;

export function scenarioMaxSlots(scenario: string): number {
  if (scenario === "Opening Script") return 15;
  if (scenario === "2 Minute" || scenario === "4 Minute" || scenario === "2-Minute Drill" || scenario === "4-Minute") {
    return 10;
  }
  return PLAY_SHEET_SCENARIO_MAX_DEFAULT;
}

export function isOpeningScript(scenario: string): boolean {
  return scenario === "Opening Script";
}

/**
 * Map a sheet scenario to the `logged_plays.scenario` values it should match.
 * Opening Script is a sheet-only concept — logged plays use "1st Down".
 * For all others, include the canonical label plus any SCENARIO_SHORT aliases
 * that resolve to the same canonical (e.g. "2-Minute Drill" → "2 Minute").
 */
export function loggedPlayScenarioLabels(sheetScenario: string): string[] {
  if (isOpeningScript(sheetScenario)) return ["1st Down"];
  const canonical = SCENARIO_SHORT[sheetScenario] ?? sheetScenario;
  const labels = new Set<string>([canonical]);
  for (const [alias, target] of Object.entries(SCENARIO_SHORT)) {
    if (target === canonical) labels.add(alias);
  }
  return Array.from(labels);
}

/**
 * Wider scenario labels for Play Sheet suggestions only.
 * Pools situationally related scenarios for sparse tabs so suggestions
 * reflect real logged outcomes from defensible proxy situations.
 */
export function loggedPlayScenarioLabelsForSuggestions(sheetScenario: string): string[] {
  const base = loggedPlayScenarioLabels(sheetScenario);

  const SUGGESTION_POOLS: Record<string, string[]> = {
    "4 Minute": ["2 Minute", "2-Minute Drill"],
    "2 Point": ["Goal Line", "Red Zone"],
    "3rd & Short": ["2nd & Short"],
    "4th Down": ["3rd & Short", "3rd & Medium"],
    "Backed Up": ["1st Down"],
  };

  const canonical = SCENARIO_SHORT[sheetScenario] ?? sheetScenario;
  const pooled = SUGGESTION_POOLS[canonical];
  if (!pooled) return base;

  const labels = new Set(base);
  for (const extra of pooled) {
    for (const l of loggedPlayScenarioLabels(extra)) labels.add(l);
  }
  return Array.from(labels);
}

/** CFB26 source name for pickers (prefers explicit column). */
export function sheetCfb26Playbook(row: { cfb26_playbook?: string | null; playbook: string }): string {
  const v = (row.cfb26_playbook ?? "").trim();
  if (v) return v;
  return (row.playbook ?? "").trim();
}

export function orderedScenarioList(): typeof SCENARIOS {
  return SCENARIOS;
}

/** Order Call Sheet situations by persisted `scenario_order`. */
export function sortCallSheetScenariosByCanonicalOrder(blocks: SheetScenarioBlock[]): SheetScenarioBlock[] {
  return [...blocks].sort((a, b) => a.scenario_order - b.scenario_order);
}

/** Max plays per tactical / custom Call Sheet situation. */
export const CALL_SHEET_SCENARIO_MAX = 25;

/** Max plays per tactical Call Sheet situation — uniform 25 across all buckets. */
export function callSheetScenarioMaxSlots(_scenario: string): number {
  return CALL_SHEET_SCENARIO_MAX;
}

export function orderedCallSheetScenarioList(): typeof CALL_SHEET_SCENARIOS {
  return CALL_SHEET_SCENARIOS;
}

const CALL_SHEET_ONLY_SCENARIOS = new Set<string>(
  CALL_SHEET_SCENARIOS.filter((scenario) => scenario !== "Red Zone"),
);

/** True when the sheet uses tactical Call Sheet buckets (not legacy down-and-distance tabs). */
export function isCallSheetPlaySheet(scenarios: Pick<SheetScenarioBlock, "scenario">[]): boolean {
  return scenarios.some((block) => CALL_SHEET_ONLY_SCENARIOS.has(block.scenario));
}

export function isCallSheetScenario(scenario: string): boolean {
  return (CALL_SHEET_SCENARIOS as readonly string[]).includes(scenario);
}

const LEGACY_SCENARIO_SET = new Set<string>(SCENARIOS);

/** Slot cap for builder/API — legacy down-and-distance tabs keep special cases; call sheet + custom buckets use 25. */
export function maxSlotsForSheetScenario(scenario: string): number {
  if (LEGACY_SCENARIO_SET.has(scenario)) return scenarioMaxSlots(scenario);
  return CALL_SHEET_SCENARIO_MAX;
}

export function sortSheetScenariosByCanonicalOrder(blocks: SheetScenarioBlock[]): SheetScenarioBlock[] {
  if (isCallSheetPlaySheet(blocks)) return sortCallSheetScenariosByCanonicalOrder(blocks);
  return sortScenariosByCanonicalOrder(blocks);
}

/** Chip / nav label — tactical buckets use compact copy; legacy sheets keep `SCENARIO_SHORT`. */
export function scenarioChipLabel(scenario: string): string {
  if (isCallSheetScenario(scenario)) {
    return CALL_SHEET_SCENARIO_SHORT[scenario as CallSheetScenario] ?? scenario;
  }
  return SCENARIO_SHORT[scenario] ?? scenario;
}

export function sheetPlayComboKey(formation: string, play_name: string): string {
  return `${formation.trim()}\t${normalizePlayName(play_name)}`;
}

/** Coach-facing play label — formation then play name (Call Sheet viewer). */
export function callSheetPlayDisplayLabel(formation: string, play_name: string): string {
  return `${formation.trim()} ${normalizePlayName(play_name)}`;
}

export function callSheetScenarioHelperText(scenario: string, description?: string | null): string {
  if (description?.trim()) return description.trim();
  if (isCallSheetScenario(scenario)) {
    return CALL_SHEET_SCENARIO_HELP[scenario as CallSheetScenario];
  }
  return "";
}

export function callSheetViewerScenarioHelperText(scenario: string): string {
  if (isCallSheetScenario(scenario)) {
    return CALL_SHEET_VIEWER_SCENARIO_HELP[scenario as CallSheetScenario];
  }
  return "";
}

export function callSheetScenarioMarker(scenario: string): string {
  if (isCallSheetScenario(scenario)) {
    return CALL_SHEET_SCENARIO_MARKER[scenario as CallSheetScenario];
  }
  return "•";
}

export function callSheetScenarioDisplayName(scenario: string): string {
  if (isCallSheetScenario(scenario)) {
    return CALL_SHEET_SCENARIO_DISPLAY[scenario as CallSheetScenario];
  }
  return scenarioDisplayLabel(scenario);
}

export function callSheetScenarioPlayCountLabel(count: number): string {
  if (count === 1) return "1 play";
  return `${count} plays`;
}

export function callSheetScenarioPlayCountHeaderLabel(count: number, max: number): string {
  return `${count}/${max}`;
}

export function callSheetScenarioPlayCountCompact(count: number, max: number): string {
  return `${count}/${max}`;
}
