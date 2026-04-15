import { SCENARIOS } from "@/lib/constants";

export function scenarioMaxSlots(scenario: string): number {
  return scenario === "Opening Script" ? 15 : 5;
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

export function orderedScenarioList(): readonly string[] {
  return SCENARIOS;
}
