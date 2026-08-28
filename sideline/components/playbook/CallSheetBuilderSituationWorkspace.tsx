"use client";

import { CallSheetBuilderSituationBrowsePanel } from "@/components/playbook/CallSheetBuilderSituationBrowsePanel";
import { CallSheetBuilderSituationHeader } from "@/components/playbook/CallSheetBuilderSituationHeader";
import {
  appShellSituationWorkspaceClass,
  appShellSituationWorkspaceInnerClass,
  appShellSituationWorkspaceInnerWithBrowseClass,
  appShellSituationWorkspaceWithBrowseClass,
} from "@/lib/constants/designTokens";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type HeaderProps = ComponentProps<typeof CallSheetBuilderSituationHeader>;
type BrowsePanelProps = ComponentProps<typeof CallSheetBuilderSituationBrowsePanel>;

/** Tablet / desktop situation detail workspace shell (Session 11 + QA51 container scroll). */
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
        browsePanel && appShellSituationWorkspaceWithBrowseClass,
        "hidden min-h-0 flex-col md:flex",
        className,
      )}
    >
      <div className={cn("flex min-h-0 flex-1 items-start", browsePanel && "gap-0")}>
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              browsePanel
                ? appShellSituationWorkspaceInnerWithBrowseClass
                : appShellSituationWorkspaceInnerClass,
              "min-w-0 py-0 md:py-1 lg:py-2",
              !browsePanel && "mx-auto",
            )}
          >
            <CallSheetBuilderSituationHeader {...header} layout="workspace" />
            {children}
          </div>
        </div>

        {browsePanel ? <CallSheetBuilderSituationBrowsePanel {...browsePanel} /> : null}
      </div>
    </div>
  );
}
