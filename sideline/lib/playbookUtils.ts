import {
  CALL_SHEET_SCENARIO_DISPLAY,
  CALL_SHEET_SCENARIO_HELP,
  CALL_SHEET_SCENARIO_MARKER,
  CALL_SHEET_SCENARIO_SHORT,
  CALL_SHEET_SCENARIOS,
  CALL_SHEET_VIEWER_SCENARIO_HELP,
  CATALOG_SIDE_OF_BALL_LABELS,
  GO_TO_PLAYS_SCENARIO,
  SCENARIO_SHORT,
  SCENARIOS,
  catalogGameVersionCompactLabel,
} from "@/lib/constants";
import type { CallSheetScenario, PlaySheetScenario } from "@/lib/constants";
import type { CatalogPlaybookLookup } from "@/lib/playbooks/catalog-playbooks";
import { isGoToPlaysSituation } from "@/lib/situationApiHelpers";
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

/** Max calls per situation — uniform across all scenarios (API + Play Sheet + Film). */
export const PLAY_SHEET_SCENARIO_MAX_DEFAULT = 25;

/** Slot helper kept for existing call sites — always returns the shared uniform cap. */
export function scenarioMaxSlots(_scenario?: string): number {
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

function catalogLabelsMatch(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;
}

/** Call sheet list card metadata: game version, side of ball, scheme. */
export function callSheetListMetadataLabels(
  meta: CatalogPlaybookLookup,
  scheme?: string | null,
): string[] {
  const labels = [
    catalogGameVersionCompactLabel(meta.game_version),
    CATALOG_SIDE_OF_BALL_LABELS[meta.side_of_ball],
  ];
  const schemeTrim = scheme?.trim();
  if (schemeTrim) labels.push(schemeTrim);
  return labels;
}

/** Call sheet details metadata: adds source playbook when it adds context beyond scheme. */
export function callSheetDetailsMetadataLabels(
  meta: CatalogPlaybookLookup,
  scheme: string | undefined | null,
  playbookName: string,
): string[] {
  const labels = callSheetListMetadataLabels(meta, scheme);
  const schemeTrim = scheme?.trim();
  const playbookTrim = playbookName.trim();
  const omitPlaybook =
    meta.side_of_ball === "defense" &&
    schemeTrim &&
    playbookTrim &&
    catalogLabelsMatch(schemeTrim, playbookTrim);
  if (playbookTrim && !omitPlaybook) labels.push(playbookTrim);
  return labels;
}

export function orderedScenarioList(): typeof SCENARIOS {
  return SCENARIOS;
}

/** Order Call Sheet situations by persisted `scenario_order`. */
export function sortCallSheetScenariosByCanonicalOrder(blocks: SheetScenarioBlock[]): SheetScenarioBlock[] {
  return [...blocks].sort((a, b) => a.scenario_order - b.scenario_order);
}

function withSequentialScenarioOrder(blocks: SheetScenarioBlock[]): SheetScenarioBlock[] {
  return blocks.map((block, index) => ({ ...block, scenario_order: index + 1 }));
}

/** Keep Go-To Plays first; reassign sequential `scenario_order` (1-based). */
export function pinGoToPlaysFirst(blocks: SheetScenarioBlock[]): SheetScenarioBlock[] {
  const goTo = blocks.find((block) => isGoToPlaysSituation(block));
  if (!goTo) return withSequentialScenarioOrder(blocks);
  const rest = blocks.filter((block) => block.id !== goTo.id);
  return withSequentialScenarioOrder([goTo, ...rest]);
}

/** Reorder situations by id; Go-To stays at index 0; returns sequential `scenario_order`. */
export function reorderSituationBlocks(
  blocks: SheetScenarioBlock[],
  fromId: string,
  toIndex: number,
): SheetScenarioBlock[] {
  const ordered = pinGoToPlaysFirst(blocks);
  const goTo = ordered.find((block) => isGoToPlaysSituation(block));
  const reorderable = goTo ? ordered.filter((block) => !isGoToPlaysSituation(block)) : ordered;
  const moving = ordered.find((block) => block.id === fromId);

  if (!moving || (goTo && isGoToPlaysSituation(moving))) return ordered;

  const minFullIndex = goTo ? 1 : 0;
  const clampedFullIndex = Math.min(Math.max(minFullIndex, toIndex), ordered.length - 1);
  const reorderableTarget = goTo ? clampedFullIndex - 1 : clampedFullIndex;

  const reorderableIds = reorderable.map((block) => block.id);
  const without = reorderableIds.filter((id) => id !== fromId);
  const insertAt = Math.min(Math.max(0, reorderableTarget), without.length);
  const nextReorderableIds = [...without.slice(0, insertAt), fromId, ...without.slice(insertAt)];

  const byId = new Map(ordered.map((block) => [block.id, block]));
  const nextReorderable = nextReorderableIds
    .map((id) => byId.get(id))
    .filter((block): block is SheetScenarioBlock => Boolean(block));

  return withSequentialScenarioOrder(goTo ? [goTo, ...nextReorderable] : nextReorderable);
}

/** Max plays per tactical / custom Call Sheet situation (alias of the shared cap). */
export const CALL_SHEET_SCENARIO_MAX = PLAY_SHEET_SCENARIO_MAX_DEFAULT;

/** Max plays per tactical Call Sheet situation — uniform across all buckets. */
export function callSheetScenarioMaxSlots(_scenario?: string): number {
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

/** Slot cap for builder/API — uniform 25 for every situation (including Go-To Plays). */
export function maxSlotsForSheetScenario(_scenario?: string): number {
  return PLAY_SHEET_SCENARIO_MAX_DEFAULT;
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
