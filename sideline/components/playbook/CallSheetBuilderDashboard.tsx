"use client";

import { CallSheetSituationGrid } from "@/components/playbook/CallSheetSituationGrid";
import { Button } from "@/components/ui/button";
import { BUILDER_BROWSE_PLAYBOOK } from "@/lib/coachCopy";
import { appShellSurfaceActionButtonClass, tokens } from "@/lib/constants/designTokens";
import type { SheetScenarioBlock } from "@/lib/types";

export function CallSheetBuilderDashboard({
  scenarios,
  onBrowsePlaybook,
  onSelectSituation,
}: {
  scenarios: SheetScenarioBlock[];
  onBrowsePlaybook: () => void;
  onSelectSituation: (scenario: string) => void;
}) {
  return (
    <div className="space-y-6">
      <Button
        type="button"
        variant="outline"
        className={appShellSurfaceActionButtonClass}
        onClick={onBrowsePlaybook}
      >
        {BUILDER_BROWSE_PLAYBOOK}
      </Button>

      <p className={tokens.typography.sectionLabel}>My Situations</p>

      <CallSheetSituationGrid scenarios={scenarios} onSelect={onSelectSituation} />
    </div>
  );
}
