"use client";

import { PlaySheetQaEditor } from "@/components/qa/play-sheet/PlaySheetQaEditor";
import { PlaySheetQaSituationEditor } from "@/components/qa/play-sheet/PlaySheetQaSituationEditor";
import {
  playSheetQaCatalogEntries,
  playSheetQaCfb26Playbook,
  playSheetQaEditorScenario,
  playSheetQaEditorScenarios,
  playSheetQaEmptyScenarios,
  playSheetQaGoToPlays,
  playSheetQaRunGamePlays,
  playSheetQaSheetName,
  playSheetQaStaticCfb26Playbooks,
  playSheetQaSuggestions,
} from "@/lib/playSheetQaFixture";
import { GO_TO_PLAYS_SCENARIO } from "@/lib/constants";

export function PlaySheetQaEditorFilled() {
  return (
    <PlaySheetQaEditor
      sheetName={playSheetQaSheetName}
      cfb26Playbook={playSheetQaCfb26Playbook}
      scenarios={playSheetQaEditorScenarios}
    />
  );
}

export function PlaySheetQaEditorEmpty() {
  return (
    <PlaySheetQaEditor
      sheetName={playSheetQaSheetName}
      cfb26Playbook={playSheetQaCfb26Playbook}
      scenarios={playSheetQaEmptyScenarios}
    />
  );
}

export function PlaySheetQaAddPlayFormations() {
  return (
    <PlaySheetQaSituationEditor
      sheetName={playSheetQaSheetName}
      cfb26Playbook={playSheetQaCfb26Playbook}
      scenarios={playSheetQaEditorScenarios}
      activeScenario={playSheetQaEditorScenario}
      plays={playSheetQaRunGamePlays}
      drawerUi={{
        open: true,
        scenarioName: playSheetQaEditorScenario,
        catalogEntries: playSheetQaCatalogEntries,
      }}
    />
  );
}

export function PlaySheetQaAddPlayPlays() {
  return (
    <PlaySheetQaSituationEditor
      sheetName={playSheetQaSheetName}
      cfb26Playbook={playSheetQaCfb26Playbook}
      scenarios={playSheetQaEditorScenarios}
      activeScenario={playSheetQaEditorScenario}
      plays={playSheetQaRunGamePlays}
      drawerUi={{
        open: true,
        scenarioName: playSheetQaEditorScenario,
        catalogEntries: playSheetQaCatalogEntries,
        initialUi: { step: "plays", formation: { group: "10 Personnel", name: "GUN TRIPS" } },
      }}
    />
  );
}

export function PlaySheetQaEditSheet() {
  return (
    <PlaySheetQaEditor
      sheetName={playSheetQaSheetName}
      cfb26Playbook={playSheetQaCfb26Playbook}
      scenarios={playSheetQaEditorScenarios}
      editUi={{
        sheetName: playSheetQaSheetName,
        cfb26Playbook: playSheetQaCfb26Playbook,
        playbookOptions: playSheetQaStaticCfb26Playbooks,
      }}
    />
  );
}

export function PlaySheetQaSituationEditorFilled() {
  return (
    <PlaySheetQaSituationEditor
      sheetName={playSheetQaSheetName}
      cfb26Playbook={playSheetQaCfb26Playbook}
      scenarios={playSheetQaEditorScenarios}
      activeScenario="Run Game"
      plays={playSheetQaRunGamePlays}
      suggestions={playSheetQaSuggestions}
    />
  );
}

export function PlaySheetQaGoToEditorFilled() {
  return (
    <PlaySheetQaSituationEditor
      sheetName={playSheetQaSheetName}
      cfb26Playbook={playSheetQaCfb26Playbook}
      scenarios={playSheetQaEditorScenarios}
      activeScenario={GO_TO_PLAYS_SCENARIO}
      plays={playSheetQaGoToPlays}
    />
  );
}
