"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { BUILDER_ADD_PLAY } from "@/lib/coachCopy";
import { appShellHeaderActionButtonClass } from "@/lib/constants/designTokens";
import { cn } from "@/lib/utils";

export function PlayTableHeader({
  showGoToColumn = false,
  stackFormation = false,
  hideRemoveColumn = false,
  hideDragColumn = false,
  hideTypeColumn = false,
  actionColumn = "remove",
  onAddPlay,
  addPlayDisabled = false,
}: {
  showGoToColumn?: boolean;
  stackFormation?: boolean;
  hideRemoveColumn?: boolean;
  /** Hide drag-handle gutter (e.g. Add Play browse table). */
  hideDragColumn?: boolean;
  /** Call Sheet situation detail — omit Type column. */
  hideTypeColumn?: boolean;
  /** Right action column — hidden when `hideRemoveColumn`. */
  actionColumn?: "remove" | "add";
  /** Situation play table — opens the existing Add Play flow. */
  onAddPlay?: () => void;
  addPlayDisabled?: boolean;
}) {
  const showActionColumn = !hideRemoveColumn;
  return (
    <div className="flex min-h-11 items-center gap-3 border-b border-slate-700 px-4 py-2">
      {!hideDragColumn ? <div className="w-6 shrink-0" aria-hidden /> : null}
      <div className="min-w-0 flex-1 font-mono text-xs font-semibold uppercase tracking-widest text-slate-500">
        Play
      </div>
      {!stackFormation ? (
        <div className="hidden w-36 shrink-0 font-mono text-xs font-semibold uppercase tracking-widest text-slate-500 sm:block">
          Formation
        </div>
      ) : null}
      {!hideTypeColumn ? (
        <div className="flex w-16 shrink-0 justify-center font-mono text-xs font-semibold uppercase tracking-widest text-slate-500">
          Type
        </div>
      ) : null}
      {showGoToColumn ? <div className="w-8 shrink-0" aria-label="Go-To" /> : null}
      {onAddPlay ? (
        <button
          type="button"
          disabled={addPlayDisabled}
          onClick={onAddPlay}
          className={cn(
            appShellHeaderActionButtonClass,
            "shrink-0 min-h-8 px-2.5 text-xs md:min-h-9 md:px-3 md:text-sm",
          )}
        >
          {BUILDER_ADD_PLAY}
        </button>
      ) : showActionColumn ? (
        <div className="w-8 shrink-0" aria-label={actionColumn === "add" ? "Add" : "Remove"} />
      ) : null}
    </div>
  );
}
