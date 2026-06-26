"use client";

import { PlaySheetQaEditor } from "@/components/qa/play-sheet/PlaySheetQaEditor";
import {
  playSheetQaCatalogEntries,
  playSheetQaCfb26Playbook,
  playSheetQaEditorScenario,
  playSheetQaEditorScenarios,
  playSheetQaSheetName,
  playSheetQaSheetPlays,
  playSheetQaStaticCfb26Playbooks,
  playSheetQaSuggestions,
} from "@/lib/playSheetQaFixture";

export function PlaySheetQaEditorFilled() {
  return (
    <PlaySheetQaEditor
      sheetName={playSheetQaSheetName}
      cfb26Playbook={playSheetQaCfb26Playbook}
      scenarios={playSheetQaEditorScenarios}
      activeScenario={playSheetQaEditorScenario}
      plays={playSheetQaSheetPlays}
      suggestions={playSheetQaSuggestions}
    />
  );
}

export function PlaySheetQaEditorEmpty() {
  return (
    <PlaySheetQaEditor
      sheetName={playSheetQaSheetName}
      cfb26Playbook={playSheetQaCfb26Playbook}
      scenarios={playSheetQaEditorScenarios}
      activeScenario="1st Down"
      plays={[]}
      emptyScenario
    />
  );
}

export function PlaySheetQaAddPlayFormations() {
  return (
    <PlaySheetQaEditor
      sheetName={playSheetQaSheetName}
      cfb26Playbook={playSheetQaCfb26Playbook}
      scenarios={playSheetQaEditorScenarios}
      activeScenario={playSheetQaEditorScenario}
      plays={playSheetQaSheetPlays}
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
    <PlaySheetQaEditor
      sheetName={playSheetQaSheetName}
      cfb26Playbook={playSheetQaCfb26Playbook}
      scenarios={playSheetQaEditorScenarios}
      activeScenario={playSheetQaEditorScenario}
      plays={playSheetQaSheetPlays}
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
      activeScenario={playSheetQaEditorScenario}
      plays={playSheetQaSheetPlays}
      suggestions={playSheetQaSuggestions}
      editUi={{
        sheetName: playSheetQaSheetName,
        cfb26Playbook: playSheetQaCfb26Playbook,
        playbookOptions: playSheetQaStaticCfb26Playbooks,
      }}
    />
  );
}
