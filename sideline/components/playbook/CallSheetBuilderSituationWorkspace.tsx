"use client";

import { CallSheetBuilderSituationBrowsePanel } from "@/components/playbook/CallSheetBuilderSituationBrowsePanel";
import { CallSheetBuilderSituationHeader } from "@/components/playbook/CallSheetBuilderSituationHeader";
import {
  appShellSituationWorkspaceClass,
  appShellSituationWorkspaceInnerClass,
} from "@/lib/constants/designTokens";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type HeaderProps = ComponentProps<typeof CallSheetBuilderSituationHeader>;
type BrowsePanelProps = ComponentProps<typeof CallSheetBuilderSituationBrowsePanel>;

/** Tablet / desktop situation detail workspace shell (Session 11). */
export function CallSheetBuilderSituationWorkspace({
  header,
  browsePanel,
  children,
  className,
}: {
  header: Omit<HeaderProps, "layout">;
  browsePanel?: BrowsePanelProps | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        appShellSituationWorkspaceClass,
        "hidden min-h-0 flex-col overflow-hidden md:flex",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-full min-h-0 flex-1 overflow-hidden",
          browsePanel && "gap-3 lg:gap-6",
        )}
      >
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain">
          <div className={cn(appShellSituationWorkspaceInnerClass, "min-w-0 px-0 py-0 md:px-2 md:py-1 lg:px-8 lg:py-2")}>
            <CallSheetBuilderSituationHeader {...header} layout="workspace" />
            {children}
          </div>
        </div>

        {browsePanel ? <CallSheetBuilderSituationBrowsePanel {...browsePanel} /> : null}
      </div>
    </div>
  );
}
