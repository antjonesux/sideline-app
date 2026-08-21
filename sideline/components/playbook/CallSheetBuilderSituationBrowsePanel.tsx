"use client";

import { AddPlayDrawer } from "@/components/playbook/AddPlayDrawer";
import {
  appShellBrowsePanelSubtitleClass,
  appShellBrowsePanelTitleClass,
} from "@/lib/constants/designTokens";
import { cn } from "@/lib/utils";

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
  if (!open) return null;

  return (
    <aside
      className={cn(
        "app-shell-situation-browse-panel hidden h-full min-h-0 flex-col overflow-hidden border-l border-slate-800/80 bg-slate-950 md:flex",
      )}
      aria-label={panelTitle}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-800/80 px-5 py-4">
        <div className="min-w-0">
          <h2 className={cn(appShellBrowsePanelTitleClass, "truncate")}>{panelTitle}</h2>
          {panelSubtitle ? (
            <p className={cn(appShellBrowsePanelSubtitleClass, "truncate")}>{panelSubtitle}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-800/60 hover:text-white"
          onClick={onClose}
          aria-label="Close play browser"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="M6 6 18 18M18 6 6 18" />
          </svg>
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
      </div>
    </aside>
  );
}
