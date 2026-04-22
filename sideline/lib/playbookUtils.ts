import { SCENARIO_SHORT, SCENARIOS } from "@/lib/constants";
import type { SheetScenarioBlock } from "@/lib/types";

const SCENARIO_ORDER_INDEX = new Map(SCENARIOS.map((label, index) => [label, index]));

/** Order situation badges like `SCENARIOS` even if the API returns another order. */
export function sortScenariosByCanonicalOrder(blocks: SheetScenarioBlock[]): SheetScenarioBlock[] {
  return [...blocks].sort((a, b) => {
    const ia = SCENARIO_ORDER_INDEX.get(a.scenario as (typeof SCENARIOS)[number]) ?? 999;
    const ib = SCENARIO_ORDER_INDEX.get(b.scenario as (typeof SCENARIOS)[number]) ?? 999;
    return ia - ib;
  });
}

export function scenarioMaxSlots(scenario: string): number {
  if (scenario === "Opening Script") return 15;
  if (scenario === "2 Minute" || scenario === "4 Minute" || scenario === "2-Minute Drill" || scenario === "4-Minute") {
    return 10;
  }
  return 5;
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
 * Wider scenario labels for Game Plan suggestions only.
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
