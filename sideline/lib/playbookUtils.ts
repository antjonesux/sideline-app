import { SCENARIOS } from "@/lib/constants";
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

/** CFB26 source name for pickers (prefers explicit column). */
export function sheetCfb26Playbook(row: { cfb26_playbook?: string | null; playbook: string }): string {
  const v = (row.cfb26_playbook ?? "").trim();
  if (v) return v;
  return (row.playbook ?? "").trim();
}

export function orderedScenarioList(): typeof SCENARIOS {
  return SCENARIOS;
}
