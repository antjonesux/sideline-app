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
import type { ComponentProps, ReactNode } from "react";

type HeaderProps = ComponentProps<typeof CallSheetBuilderSituationHeader>;
type BrowsePanelProps = ComponentProps<typeof CallSheetBuilderSituationBrowsePanel>;

/** Tablet / desktop situation detail workspace shell (Session 11 + QA51 container scroll). */
export function CallSheetBuilderSituationWorkspace({
  header,
  browsePanel,
  sideRail,
  children,
  className,
}: {
  header: Omit<HeaderProps, "layout">;
  browsePanel?: BrowsePanelProps | null;
  /** Prefer over `browsePanel` when set (e.g. play detail side rail). */
  sideRail?: ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const rail = sideRail ?? (browsePanel ? <CallSheetBuilderSituationBrowsePanel {...browsePanel} /> : null);
  const hasRail = Boolean(rail);

  return (
    <div
      className={cn(
        appShellSituationWorkspaceClass,
        hasRail && appShellSituationWorkspaceWithBrowseClass,
        "hidden min-h-0 flex-col md:flex",
        className,
      )}
    >
      <div className={cn("flex min-h-0 flex-1 items-start", hasRail && "gap-0")}>
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              hasRail
                ? appShellSituationWorkspaceInnerWithBrowseClass
                : appShellSituationWorkspaceInnerClass,
              "min-w-0 py-0 md:py-1 lg:py-2",
              !hasRail && "mx-auto",
            )}
          >
            <CallSheetBuilderSituationHeader {...header} layout="workspace" />
            {children}
          </div>
        </div>

        {rail}
      </div>
    </div>
  );
}
