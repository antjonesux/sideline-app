"use client";

import { BUILDER_BROWSE_PLAYBOOK } from "@/lib/coachCopy";
import { SituationPlayTypeSummary } from "@/components/playbook/SituationPlayTypeSummary";
import { appShellSituationToolbarBrowseButtonClass } from "@/lib/constants/designTokens";
import type { SheetPlayRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BookOpen } from "lucide-react";

/** Situation detail workspace toolbar — play-type pills and Browse Playbook (Session 11). */
export function CallSheetBuilderSituationToolbar({
  browseActive,
  onBrowsePlaybook,
  plays = [],
}: {
  browseActive: boolean;
  onBrowsePlaybook: () => void;
  plays?: SheetPlayRow[];
}) {
  return (
    <div className="mb-4 flex items-center gap-2 md:gap-3">
      <SituationPlayTypeSummary plays={plays} className="mt-0 min-w-0 flex-1" />
      <button
        type="button"
        className={cn(
          appShellSituationToolbarBrowseButtonClass,
          "ml-auto shrink-0",
          browseActive
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            : "border-slate-700/80 text-slate-400 hover:border-slate-600 hover:text-white",
        )}
        onClick={onBrowsePlaybook}
        aria-pressed={browseActive}
      >
        <BookOpen className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" aria-hidden />
        <span className="hidden sm:inline">{BUILDER_BROWSE_PLAYBOOK}</span>
        <span className="sm:hidden">Browse</span>
      </button>
    </div>
  );
}
