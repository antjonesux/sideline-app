import type { PlaybookEntry } from "@/lib/playbook";
import type { GameState } from "@/lib/gameStateEngine";
import type { LoggedPlay, SheetPlayRow, SheetScenarioBlock } from "@/lib/types";
import {
  GUIDED_ONBOARDING_EDITOR_SCENARIO,
  ONBOARDING_DEFAULT_SHEET_NAME,
} from "@/lib/coachCopy";

/** CFB26 catalog label for QA screenshots (stable, local-only). */
export const ONBOARDING_QA_CFB26_PLAYBOOK = "Washington State";

/** Short list for combobox — avoids live `/api/cfb26-playbooks` on QA routes. */
export const onboardingQaStaticCfb26Playbooks: string[] = [
  "Michigan",
  "Ohio State",
  ONBOARDING_QA_CFB26_PLAYBOOK,
  "USC",
].sort((a, b) => a.localeCompare(b));

export const onboardingQaSheetName: string = ONBOARDING_DEFAULT_SHEET_NAME;

export const onboardingQaEditorScenario = GUIDED_ONBOARDING_EDITOR_SCENARIO;

export const onboardingQaSheetPlays: SheetPlayRow[] = [
  {
    id: "qa-onboarding-play-1",
    play_order: 0,
    formation: "GUN EMPTY",
    play_name: "JET TOUCH PASS",
    script_note: null,
    play_type: "PASS",
  },
  {
    id: "qa-onboarding-play-2",
    play_order: 1,
    formation: "GUN TRIPS",
    play_name: "CROSS DRAG",
    script_note: null,
    play_type: "PASS",
  },
  {
    id: "qa-onboarding-play-3",
    play_order: 2,
    formation: "ACE",
    play_name: "HB ZONE WK",
    script_note: null,
    play_type: "RUN",
  },
];

/** Selected play for YardageSheet QA — matches first mock sheet call. */
export const onboardingQaYardagePlaybookEntry: PlaybookEntry = {
  play_id: "qa-onboarding-yardage-play",
  formation: onboardingQaSheetPlays[0]!.formation,
  group: "QA",
  play_name: onboardingQaSheetPlays[0]!.play_name,
  play_type: "PASS",
};

/** 1st & 10 at opponent 37 (absolute yard 63). */
export const onboardingQaSnapGameState: GameState = {
  down: 1,
  distance: 10,
  isInches: false,
  absoluteYard: 63,
  driveNumber: 1,
  playNumber: 0,
};

/** Logger stream (empty for stable “1st & 10 @ OPP 37” QA frame). */
export const onboardingQaLoggerStreamPlays: LoggedPlay[] = [];

function sheetRowToPlaybookEntry(row: SheetPlayRow, i: number): PlaybookEntry {
  const t = (row.play_type ?? "RUN").toUpperCase();
  const play_type: PlaybookEntry["play_type"] =
    t === "RPO" ? "RPO" : t === "PASS" ? "PASS" : "RUN";
  return {
    play_id: `qa-onboarding-sheet-${i}`,
    formation: row.formation,
    group: "QA",
    play_name: row.play_name,
    play_type,
  };
}

export const onboardingQaMySheetRows: PlaybookEntry[] = onboardingQaSheetPlays.map(sheetRowToPlaybookEntry);

/** Situation strip for logger QA — active chip matches editor scenario with mock fill counts. */
export const onboardingQaLoggerSheetScenarios: SheetScenarioBlock[] = [
  {
    id: "qa-logger-sc-1",
    scenario: onboardingQaEditorScenario,
    scenario_order: 0,
    plays: onboardingQaSheetPlays,
  },
  {
    id: "qa-logger-sc-2",
    scenario: "1st Down",
    scenario_order: 1,
    plays: [],
  },
  {
    id: "qa-logger-sc-3",
    scenario: "2nd & Long",
    scenario_order: 2,
    plays: [],
  },
];

/** Remaining coach calls before breakdown (legacy QA fixture value). */
export const onboardingQaLoggerRemainingCalls = 2;
