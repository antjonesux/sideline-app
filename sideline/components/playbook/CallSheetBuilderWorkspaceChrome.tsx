"use client";

import { CallSheetBuilderSituationBrowsePanel } from "@/components/playbook/CallSheetBuilderSituationBrowsePanel";
import { CallSheetEditorTabBar, type CallSheetEditorTab } from "@/components/playbook/CallSheetEditorTabBar";
import { CallSheetMetadataRow } from "@/components/playbook/CallSheetMetadataRow";
import { IconBackButton } from "@/components/shared/IconBackButton";
import { BUILDER_ADD_SITUATION, BUILDER_BROWSE_PLAYBOOK } from "@/lib/coachCopy";
import { callSheetDetailsMetadataLabels } from "@/lib/playbookUtils";
import type { CatalogPlaybookLookup } from "@/lib/playbooks/catalog-playbooks";
import {
  appShellBuilderAddSituationClass,
  appShellBuilderBrowseButtonClass,
  appShellBuilderTitleClass,
  appShellWorkspaceBuilderClass,
  appShellWorkspaceStatLabelClass,
  appShellWorkspaceStatValueClass,
} from "@/lib/constants/designTokens";
import { cn } from "@/lib/utils";
import { BookOpen, Plus } from "lucide-react";
import type { ComponentProps } from "react";

type BrowsePanelProps = ComponentProps<typeof CallSheetBuilderSituationBrowsePanel>;

/** Desktop / tablet builder chrome — stats header, tab row, and toolbar actions (Session 10). */
export function CallSheetBuilderWorkspaceChrome({
  backHref,
  sheetName,
  cfb26Playbook,
  scheme,
  catalogMeta,
  situationCount,
  playCount,
  activeTab,
  onTabChange,
  onBrowsePlaybook,
  onAddSituation,
  addSituationDisabled,
  browseActive = false,
  browsePanel = null,
  children,
}: {
  backHref: string;
  sheetName: string;
  cfb26Playbook: string;
  scheme?: string;
  catalogMeta?: CatalogPlaybookLookup | null;
  situationCount: number;
  playCount: number;
  activeTab: CallSheetEditorTab;
  onTabChange: (tab: CallSheetEditorTab) => void;
  onBrowsePlaybook: () => void;
  onAddSituation: () => void;
  addSituationDisabled?: boolean;
  browseActive?: boolean;
  browsePanel?: BrowsePanelProps | null;
  children: React.ReactNode;
}) {
  return (
    <div className="hidden min-h-0 flex-col overflow-hidden md:flex md:min-h-[50vh]">
      <div
        className={cn(
          "flex min-h-0 flex-1 overflow-hidden",
          browseActive && "gap-4 lg:gap-6",
        )}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
          <div className={`${appShellWorkspaceBuilderClass} flex flex-col`}>
            <div className="flex items-start justify-between gap-6 pb-5">
              <div className="flex min-w-0 items-start gap-3">
                <IconBackButton href={backHref} aria-label="Back to play sheets" />
                <div className="min-w-0">
                  <h1 className={`${appShellBuilderTitleClass} min-w-0 truncate`}>{sheetName}</h1>
                  {catalogMeta ? (
                    <CallSheetMetadataRow
                      labels={callSheetDetailsMetadataLabels(catalogMeta, scheme, cfb26Playbook)}
                      className="mt-0.5 font-body text-sm text-slate-400"
                    />
                  ) : (
                    <p className="mt-0.5 truncate font-body text-sm text-slate-400">
                      Built from {cfb26Playbook} playbook
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-4 pt-0.5">
                <div className="text-right">
                  <p className={appShellWorkspaceStatValueClass}>{situationCount}</p>
                  <p className={appShellWorkspaceStatLabelClass}>situations</p>
                </div>
                <div className="h-8 w-px bg-slate-800/80" aria-hidden />
                <div className="text-right">
                  <p className={appShellWorkspaceStatValueClass}>{playCount}</p>
                  <p className={appShellWorkspaceStatLabelClass}>plays</p>
                </div>
                <div className="h-8 w-px bg-slate-800/80" aria-hidden />
                <button
                  type="button"
                  className={cn(
                    appShellBuilderBrowseButtonClass,
                    "border-slate-700/80 text-slate-400 hover:border-slate-600 hover:text-white",
                    browseActive &&
                      "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:border-emerald-500/30 hover:text-emerald-400",
                  )}
                  onClick={onBrowsePlaybook}
                  aria-pressed={browseActive}
                >
                  <BookOpen className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" aria-hidden />
                  {BUILDER_BROWSE_PLAYBOOK}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <CallSheetEditorTabBar activeTab={activeTab} onTabChange={onTabChange} />
              <button
                type="button"
                className={appShellBuilderAddSituationClass}
                disabled={addSituationDisabled}
                onClick={onAddSituation}
              >
                <Plus className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" aria-hidden />
                {BUILDER_ADD_SITUATION}
              </button>
            </div>

            <div className="my-4 border-t border-slate-800/80" aria-hidden />

            {children}
          </div>
        </div>

        {browsePanel ? <CallSheetBuilderSituationBrowsePanel {...browsePanel} /> : null}
      </div>
    </div>
  );
}
