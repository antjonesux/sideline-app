import { DEFAULT_OFFENSIVE_SITUATIONS, GO_TO_PLAYS_SCENARIO } from "@/lib/constants";
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
import { CALL_SHEET_SCENARIO_MAX } from "@/lib/playbookUtils";

export const playSheetQaCfb26Playbook = ONBOARDING_QA_CFB26_PLAYBOOK;
export const playSheetQaStaticCfb26Playbooks = onboardingQaStaticCfb26Playbooks;
export const playSheetQaSheetName = ONBOARDING_DEFAULT_SHEET_NAME;
/** Call Sheet coach-view QA / mobile screenshots — product mock title. */
export const playSheetQaCallSheetName = "My First Sheet";
export const playSheetQaEditorScenario = GUIDED_ONBOARDING_EDITOR_SCENARIO;
export const playSheetQaSheetPlays = onboardingQaSheetPlays;

const QA_MAX_FILL_CATALOG: { formation: string; play_name: string; play_type: "RUN" | "PASS" | "RPO" }[] = [
  { formation: "GUN EMPTY", play_name: "JET TOUCH PASS", play_type: "PASS" },
  { formation: "GUN TRIPS", play_name: "CROSS DRAG", play_type: "PASS" },
  { formation: "ACE", play_name: "HB ZONE WK", play_type: "RUN" },
  { formation: "GUN Y OFF", play_name: "MESH", play_type: "PASS" },
  { formation: "GUN BUNCH", play_name: "FLOOD", play_type: "PASS" },
  { formation: "ACE TWINS", play_name: "POWER", play_type: "RUN" },
  { formation: "GUN TRIPS TE", play_name: "STICK", play_type: "PASS" },
  { formation: "PISTOL", play_name: "INSIDE ZONE", play_type: "RUN" },
  { formation: "GUN DOUBLES", play_name: "SMASH", play_type: "PASS" },
  { formation: "ACE SLOT", play_name: "COUNTER", play_type: "RUN" },
  { formation: "GUN EMPTY", play_name: "FOUR VERTS", play_type: "PASS" },
  { formation: "GUN TRIPS", play_name: "RPO PEEK", play_type: "RPO" },
  { formation: "ACE", play_name: "ISO", play_type: "RUN" },
  { formation: "GUN Y OFF", play_name: "CURL FLAT", play_type: "PASS" },
  { formation: "GUN BUNCH", play_name: "HITCH SEAM", play_type: "PASS" },
  { formation: "ACE TWINS", play_name: "TOSS", play_type: "RUN" },
  { formation: "GUN TRIPS TE", play_name: "LEVELS", play_type: "PASS" },
  { formation: "PISTOL", play_name: "SPLIT ZONE", play_type: "RUN" },
  { formation: "GUN DOUBLES", play_name: "DAGGERS", play_type: "PASS" },
  { formation: "ACE SLOT", play_name: "OUTSIDE ZONE", play_type: "RUN" },
  { formation: "GUN EMPTY", play_name: "SPACING", play_type: "PASS" },
  { formation: "GUN TRIPS", play_name: "Y CROSS", play_type: "PASS" },
  { formation: "ACE", play_name: "TRAP", play_type: "RUN" },
  { formation: "GUN Y OFF", play_name: "SHALLOW CROSS", play_type: "PASS" },
  { formation: "GUN BUNCH", play_name: "SNAG", play_type: "PASS" },
];

function qaMaxFilledPlays(scenarioKey: string): SheetPlayRow[] {
  return Array.from({ length: CALL_SHEET_SCENARIO_MAX }, (_, play_order) => {
    const entry = QA_MAX_FILL_CATALOG[play_order % QA_MAX_FILL_CATALOG.length]!;
    return {
      id: `qa-max-${scenarioKey}-${play_order}`,
      play_order,
      formation: entry.formation,
      play_name: entry.play_name,
      script_note: null,
      play_type: entry.play_type,
    };
  });
}

const QA_SCENARIO_META: Record<string, { description: string; icon: string; color: string; is_locked?: boolean }> = {
  "Go-To Plays": { description: "Your most trusted plays", icon: "Star", color: "amber", is_locked: true },
  Tempo: { description: "Speed up the pace", icon: "FastForward", color: "cyan" },
  "Run Game": { description: "Establish the run", icon: "Shield", color: "emerald" },
  "Pass Game": { description: "Move the chains through the air", icon: "Target", color: "blue" },
  "Man Beaters": { description: "Quick wins vs man coverage", icon: "Crosshair", color: "violet" },
  "Zone Beaters": { description: "Read the zone and attack", icon: "Eye", color: "rose" },
  "Take a Shot": { description: "Stretch the field", icon: "Rocket", color: "orange" },
  "Red Zone": { description: "Punch it in", icon: "Flag", color: "red" },
};

function qaScenarioBlock(scenario: string, index: number, plays: SheetPlayRow[] = []): SheetScenarioBlock {
  const meta = QA_SCENARIO_META[scenario] ?? { description: scenario, icon: null as string | null, color: "sky" };
  return {
    id: `qa-sc-${index}`,
    scenario,
    scenario_order: index + 1,
    description: meta.description,
    icon: meta.icon ?? null,
    color: meta.color,
    is_locked: meta.is_locked ?? false,
    plays,
  };
}

const callSheetQaMaxPlayCount = DEFAULT_OFFENSIVE_SITUATIONS.length * CALL_SHEET_SCENARIO_MAX;

export const playSheetQaSummaries: PlaybookSummary[] = [
  {
    id: "qa-sheet-1",
    name: playSheetQaCallSheetName,
    playbook: ONBOARDING_QA_CFB26_PLAYBOOK,
    game_version: "cfb26",
    scheme: "Spread",
    scenario_filled: DEFAULT_OFFENSIVE_SITUATIONS.length,
    scenario_total: DEFAULT_OFFENSIVE_SITUATIONS.length,
    play_count: callSheetQaMaxPlayCount,
    updated_at: new Date().toISOString(),
  },
  {
    id: "qa-sheet-2",
    name: "Goal Line Package",
    playbook: "Ohio State",
    game_version: "cfb26",
    scheme: "Spread",
    scenario_filled: 2,
    scenario_total: DEFAULT_OFFENSIVE_SITUATIONS.length,
    play_count: 6,
    updated_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  },
];

export function playSheetQaScenarios(filledScenario: string, plays: SheetPlayRow[]): SheetScenarioBlock[] {
  return DEFAULT_OFFENSIVE_SITUATIONS.map((situation, index) =>
    qaScenarioBlock(
      situation.scenario,
      index,
      situation.scenario === filledScenario ? plays : [],
    ),
  );
}

/** Editor QA: plays live on Run Game; first two also appear on Go-To for star states. */
export const playSheetQaRunGamePlays = playSheetQaSheetPlays;
export const playSheetQaGoToPlays = playSheetQaSheetPlays.slice(0, 2);

export const playSheetQaEditorScenarios: SheetScenarioBlock[] = DEFAULT_OFFENSIVE_SITUATIONS.map((situation, index) => {
  const goToSubset = playSheetQaSheetPlays.slice(0, 2);
  const plays =
    situation.scenario === GO_TO_PLAYS_SCENARIO
      ? goToSubset
      : situation.scenario === "Run Game"
        ? playSheetQaRunGamePlays
        : [];
  return qaScenarioBlock(situation.scenario, index, plays);
});

/** Call Sheet coach-view QA: every default situation filled to max play count. */
export const playSheetQaCoachViewScenarios: SheetScenarioBlock[] = DEFAULT_OFFENSIVE_SITUATIONS.map(
  (situation, index) =>
    qaScenarioBlock(
      situation.scenario,
      index,
      qaMaxFilledPlays(situation.scenario.replace(/\s+/g, "-").toLowerCase()),
    ),
);

export const playSheetQaEmptyScenarios: SheetScenarioBlock[] = DEFAULT_OFFENSIVE_SITUATIONS.map((situation, index) =>
  qaScenarioBlock(situation.scenario, index, []),
);

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
