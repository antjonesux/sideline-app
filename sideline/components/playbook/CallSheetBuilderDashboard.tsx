"use client";

import { CallSheetBuilderSheetHeader } from "@/components/playbook/CallSheetBuilderSheetHeader";
import { CallSheetSituationGrid } from "@/components/playbook/CallSheetSituationGrid";
import { Button } from "@/components/ui/button";
import { BUILDER_BROWSE_PLAYBOOK } from "@/lib/coachCopy";
import { appShellSurfaceActionButtonClass } from "@/lib/constants/designTokens";
import type { SheetScenarioBlock } from "@/lib/types";

export function CallSheetBuilderDashboard({
  sheetName,
  cfb26Playbook,
  scenarios,
  onBrowsePlaybook,
  onSelectSituation,
  onEditSheet,
}: {
  sheetName: string;
  cfb26Playbook: string;
  scenarios: SheetScenarioBlock[];
  onBrowsePlaybook: () => void;
  onSelectSituation: (scenario: string) => void;
  onEditSheet: () => void;
}) {
  return (
    <div className="space-y-6">
      <CallSheetBuilderSheetHeader
        backHref="/playbook"
        sheetName={sheetName}
        cfb26Playbook={cfb26Playbook}
        onEditSheet={onEditSheet}
      />

      <Button
        type="button"
        variant="outline"
        className={appShellSurfaceActionButtonClass}
        onClick={onBrowsePlaybook}
      >
        {BUILDER_BROWSE_PLAYBOOK}
      </Button>

      <CallSheetSituationGrid scenarios={scenarios} onSelect={onSelectSituation} />
    </div>
  );
}
