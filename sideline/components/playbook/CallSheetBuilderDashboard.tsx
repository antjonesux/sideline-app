"use client";

import { CallSheetSituationGrid } from "@/components/playbook/CallSheetSituationGrid";
import { Button } from "@/components/ui/button";
import { BUILDER_ADD_SITUATION, BUILDER_BROWSE_PLAYBOOK, BUILDER_SITUATIONS_AT_CAPACITY } from "@/lib/coachCopy";
import { MAX_SITUATIONS_PER_SHEET } from "@/lib/situationApiHelpers";
import { appShellFieldLabelClass } from "@/lib/constants/designTokens";
import type { SheetScenarioBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CallSheetBuilderDashboard({
  scenarios,
  onBrowsePlaybook,
  onSelectSituation,
  editMode,
  onToggleEditMode,
  onAddSituation,
  dragId,
  setDragId,
  onReorderSituations,
  onDeleteSituation,
  getOptionState,
  layout = "mobile",
}: {
  scenarios: SheetScenarioBlock[];
  onBrowsePlaybook: () => void;
  onSelectSituation: (scenario: string) => void;
  editMode: boolean;
  onToggleEditMode: () => void;
  onAddSituation: () => void;
  dragId: string | null;
  setDragId: (id: string | null) => void;
  onReorderSituations: (fromId: string, toIndex: number) => void;
  onDeleteSituation: (block: SheetScenarioBlock) => void;
  getOptionState?: (block: SheetScenarioBlock) => { disabled?: boolean; statusLabel?: string };
  /** Desktop/tablet — browse + add live in workspace chrome; grid uses tighter section header. */
  layout?: "mobile" | "desktop";
}) {
  const atCapacity = scenarios.length >= MAX_SITUATIONS_PER_SHEET;
  const desktop = layout === "desktop";

  return (
    <div className={cn("space-y-6", desktop && "space-y-4")}>
      {!desktop ? (
        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-11 w-full rounded-xl border-slate-700 bg-transparent py-3 font-sans text-sm font-medium text-slate-200 hover:border-slate-600 hover:bg-transparent hover:text-white"
          onClick={onBrowsePlaybook}
        >
          {BUILDER_BROWSE_PLAYBOOK}
        </Button>
      ) : null}

      <div className={cn("space-y-3", desktop && "space-y-4")}>
        <div className="flex items-center justify-between gap-3">
          <p className={cn(appShellFieldLabelClass, "font-medium", desktop && "text-[11px] tracking-[0.15em]")}>
            My Situations
          </p>
          <button
            type="button"
            onClick={onToggleEditMode}
            className={cn(
              "shrink-0 font-sans text-sm font-medium text-slate-500 transition-colors hover:text-slate-300",
              desktop && "text-xs",
            )}
          >
            {editMode ? "Done" : "Edit"}
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <CallSheetSituationGrid
            scenarios={scenarios}
            onSelect={onSelectSituation}
            getOptionState={getOptionState}
            editMode={editMode}
            dragId={dragId}
            setDragId={setDragId}
            onReorder={onReorderSituations}
            onDelete={onDeleteSituation}
            columns={desktop ? "responsive" : "two"}
          />

          {!desktop && editMode ? null : !desktop ? (
            <button
              type="button"
              disabled={atCapacity}
              onClick={onAddSituation}
              className={cn(
                "flex min-h-11 w-full items-center justify-center rounded-xl border-2 border-dashed py-3 font-sans text-sm font-medium transition-colors",
                atCapacity
                  ? "cursor-not-allowed border-slate-800 text-slate-600"
                  : "border-slate-700 text-slate-400 hover:border-emerald-500 hover:text-emerald-400",
              )}
            >
              {atCapacity ? BUILDER_SITUATIONS_AT_CAPACITY : BUILDER_ADD_SITUATION}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
