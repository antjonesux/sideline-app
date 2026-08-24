"use client";

import { AddPlayDrawer } from "@/components/playbook/AddPlayDrawer";
import { SituationSideRail } from "@/components/shared/SituationSideRail";

/** Tablet / desktop add-play & browse-playbook side rail (Session 11). */
export function CallSheetBuilderSituationBrowsePanel({
  open,
  onClose,
  cfb26Playbook,
  scenarioName = "",
  panelTitle,
  panelSubtitle,
  onPick,
  showGoToStar,
  goToPlayKeys,
  goToBusyComboKey,
  onToggleGoTo,
  addedPlayKeys,
  addDisabled,
  qaStaticEntries,
  qaInitialUi,
  catalogSideOfBall,
  catalogGameVersion,
}: {
  open: boolean;
  onClose: () => void;
  cfb26Playbook: string;
  scenarioName?: string;
  panelTitle: string;
  panelSubtitle?: string;
  onPick: (formation: string, playName: string) => void | Promise<void>;
  showGoToStar?: boolean;
  goToPlayKeys?: Set<string>;
  goToBusyComboKey?: string | null;
  onToggleGoTo?: (formation: string, playName: string) => void;
  addedPlayKeys?: Set<string>;
  addDisabled?: boolean;
  qaStaticEntries?: import("@/lib/playbook").PlaybookEntry[];
  qaInitialUi?: { step: "formations" | "plays"; formation?: { group: string; name: string } };
  catalogSideOfBall?: import("@/lib/constants").CatalogSideOfBall;
  catalogGameVersion?: import("@/lib/constants").CatalogGameVersion;
}) {
  return (
    <SituationSideRail
      open={open}
      title={panelTitle}
      subtitle={panelSubtitle}
      onClose={onClose}
      closeAriaLabel="Close play browser"
    >
      <AddPlayDrawer
        open
        shell="panel"
        onClose={onClose}
        cfb26Playbook={cfb26Playbook}
        scenarioName={scenarioName}
        onPick={onPick}
        showGoToStar={showGoToStar}
        goToPlayKeys={goToPlayKeys}
        goToBusyComboKey={goToBusyComboKey}
        onToggleGoTo={onToggleGoTo}
        addedPlayKeys={addedPlayKeys}
        addDisabled={addDisabled}
        qaStaticEntries={qaStaticEntries}
        qaInitialUi={qaInitialUi}
        catalogSideOfBall={catalogSideOfBall}
        catalogGameVersion={catalogGameVersion}
      />
    </SituationSideRail>
  );
}
