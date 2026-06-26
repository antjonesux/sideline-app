import { CALL_SHEET_SCENARIOS, GO_TO_PLAYS_SCENARIO } from "@/lib/constants";
import type { SuggestionRow } from "@/lib/loggedPlayStats";
import type { PlaybookEntry } from "@/lib/playbook";
import type { PlaybookSummary, SheetPlayRow, SheetScenarioBlock } from "@/lib/types";
import {
  GUIDED_ONBOARDING_EDITOR_SCENARIO,
  ONBOARDING_DEFAULT_SHEET_NAME,
} from "@/lib/coachCopy";
import {
  ONBOARDING_QA_CFB26_PLAYBOOK,
  onboardingQaSheetPlays,
  onboardingQaStaticCfb26Playbooks,
} from "@/lib/onboardingQaFixture";

export const playSheetQaCfb26Playbook = ONBOARDING_QA_CFB26_PLAYBOOK;
export const playSheetQaStaticCfb26Playbooks = onboardingQaStaticCfb26Playbooks;
export const playSheetQaSheetName = ONBOARDING_DEFAULT_SHEET_NAME;
export const playSheetQaEditorScenario = GUIDED_ONBOARDING_EDITOR_SCENARIO;
export const playSheetQaSheetPlays = onboardingQaSheetPlays;

export const playSheetQaSummaries: PlaybookSummary[] = [
  {
    id: "qa-sheet-1",
    name: "Week 5 vs Washington",
    cfb26_playbook: ONBOARDING_QA_CFB26_PLAYBOOK,
    scheme: "Spread",
    scenario_filled: 4,
    scenario_total: CALL_SHEET_SCENARIOS.length,
    play_count: 12,
    updated_at: new Date().toISOString(),
  },
  {
    id: "qa-sheet-2",
    name: "Goal Line Package",
    cfb26_playbook: "Ohio State",
    scheme: "Spread",
    scenario_filled: 2,
    scenario_total: CALL_SHEET_SCENARIOS.length,
    play_count: 6,
    updated_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  },
];

export function playSheetQaScenarios(filledScenario: string, plays: SheetPlayRow[]): SheetScenarioBlock[] {
  return CALL_SHEET_SCENARIOS.map((scenario, index) => ({
    id: `qa-sc-${index}`,
    scenario,
    scenario_order: index + 1,
    plays: scenario === filledScenario ? plays : [],
  }));
}

/** Editor QA: plays live on Run Game; first two also appear on Go-To for star states. */
export const playSheetQaRunGamePlays = playSheetQaSheetPlays;
export const playSheetQaGoToPlays = playSheetQaSheetPlays.slice(0, 2);

export const playSheetQaEditorScenarios: SheetScenarioBlock[] = CALL_SHEET_SCENARIOS.map((scenario, index) => {
  const goToSubset = playSheetQaSheetPlays.slice(0, 2);
  const plays =
    scenario === GO_TO_PLAYS_SCENARIO ? goToSubset : scenario === "Run Game" ? playSheetQaRunGamePlays : [];
  return {
    id: `qa-sc-${index}`,
    scenario,
    scenario_order: index + 1,
    plays,
  };
});

export const playSheetQaEmptyScenarios: SheetScenarioBlock[] = CALL_SHEET_SCENARIOS.map((scenario, index) => ({
  id: `qa-sc-empty-${index}`,
  scenario,
  scenario_order: index + 1,
  plays: [],
}));

export const playSheetQaSuggestions: SuggestionRow[] = [
  {
    formation: "GUN TRIPS",
    play_name: "MESH",
    uses: 8,
    success_rate: 62.5,
    avg_yards: 7.2,
    play_type: "PASS",
  },
  {
    formation: "ACE",
    play_name: "POWER",
    uses: 5,
    success_rate: 80,
    avg_yards: 4.8,
    play_type: "RUN",
    pooled: true,
  },
  {
    formation: "GUN EMPTY",
    play_name: "STICK",
    uses: 3,
    success_rate: 66.7,
    avg_yards: 5.1,
    play_type: "PASS",
  },
];

export const playSheetQaCatalogEntries: PlaybookEntry[] = [
  {
    play_id: "qa-gun-trips-mesh",
    formation: "GUN TRIPS",
    group: "10 Personnel",
    play_name: "MESH",
    play_type: "PASS",
  },
  {
    play_id: "qa-gun-trips-flood",
    formation: "GUN TRIPS",
    group: "10 Personnel",
    play_name: "FLOOD",
    play_type: "PASS",
  },
  {
    play_id: "qa-gun-empty-jet",
    formation: "GUN EMPTY",
    group: "10 Personnel",
    play_name: "JET TOUCH PASS",
    play_type: "PASS",
  },
  {
    play_id: "qa-ace-zone",
    formation: "ACE",
    group: "21 Personnel",
    play_name: "HB ZONE WK",
    play_type: "RUN",
  },
  {
    play_id: "qa-ace-power",
    formation: "ACE",
    group: "21 Personnel",
    play_name: "POWER",
    play_type: "RUN",
  },
];
