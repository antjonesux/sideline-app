"use client";

import { CallSheetBuilderSituationBrowsePanel } from "@/components/playbook/CallSheetBuilderSituationBrowsePanel";
import { CallSheetBuilderSituationHeader } from "@/components/playbook/CallSheetBuilderSituationHeader";
import { CallSheetBuilderSituationToolbar } from "@/components/playbook/CallSheetBuilderSituationToolbar";
import { appShellSituationWorkspaceInnerClass } from "@/lib/constants/designTokens";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type HeaderProps = ComponentProps<typeof CallSheetBuilderSituationHeader>;
type BrowsePanelProps = ComponentProps<typeof CallSheetBuilderSituationBrowsePanel>;

/** Tablet / desktop situation detail workspace shell (Session 11). */
export function CallSheetBuilderSituationWorkspace({
  header,
  browseActive,
  onBrowsePlaybook,
  browsePanel,
  children,
  className,
}: {
  header: Omit<HeaderProps, "layout">;
  browseActive: boolean;
  onBrowsePlaybook: () => void;
  browsePanel?: BrowsePanelProps | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("hidden min-h-0 flex-col overflow-hidden md:flex md:min-h-[50vh]", className)}>
      <div
        className={cn(
          "flex min-h-0 flex-1 overflow-hidden",
          browsePanel && "gap-3 lg:gap-6",
        )}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
          <div className={cn(appShellSituationWorkspaceInnerClass, "min-w-0 px-0 py-0 md:px-2 md:py-1 lg:px-8 lg:py-2")}>
            <CallSheetBuilderSituationHeader {...header} layout="workspace" />
            <CallSheetBuilderSituationToolbar
              browseActive={browseActive}
              onBrowsePlaybook={onBrowsePlaybook}
            />
            {children}
          </div>
        </div>

        {browsePanel ? <CallSheetBuilderSituationBrowsePanel {...browsePanel} /> : null}
      </div>
    </div>
  );
}
