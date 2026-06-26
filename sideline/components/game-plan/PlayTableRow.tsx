"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import type { ComponentPropsWithoutRef } from "react";
import { normalizePlayName } from "@/lib/utils";
import type { SheetPlayRow } from "@/lib/types";
import { DragHandleIcon } from "@/components/game-plan/DragHandleIcon";
import { PlayTypeBadge } from "@/components/game-plan/PlayTypeBadge";

export type GamePlanPlayType = "RUN" | "PASS" | "RPO";

export function PlayTableRow({
  play,
  playType,
  onRemove,
  onToggleGoTo,
  inGoTo = false,
  goToBusy = false,
  showGoToStar = false,
  stackFormation = false,
  hideRemove = false,
  className = "",
  ...rootProps
}: {
  play: SheetPlayRow;
  playType: GamePlanPlayType;
  onRemove: (id: string) => void | Promise<void>;
  onToggleGoTo?: (play: SheetPlayRow) => void;
  inGoTo?: boolean;
  goToBusy?: boolean;
  showGoToStar?: boolean;
  stackFormation?: boolean;
  hideRemove?: boolean;
} & ComponentPropsWithoutRef<"div">) {
  return (
    <div
      {...rootProps}
      className={`flex min-h-11 items-center gap-3 border-b border-slate-700/50 px-4 py-3 ${className}`.trim()}
    >
      <div className="flex w-6 shrink-0 justify-center text-slate-600">
        <DragHandleIcon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-sm font-semibold text-slate-100">{normalizePlayName(play.play_name)}</p>
        {stackFormation ? (
          <p className="mt-0.5 truncate font-body text-xs text-slate-500">{play.formation}</p>
        ) : null}
      </div>
      {!stackFormation ? (
        <div className="hidden w-36 shrink-0 truncate font-mono text-xs text-slate-500 sm:block">{play.formation}</div>
      ) : null}
      <div className="flex w-16 shrink-0 justify-center">
        <PlayTypeBadge type={playType} />
      </div>
      {showGoToStar ? (
        <div className="flex w-8 shrink-0 justify-center">
          <button
            type="button"
            disabled={goToBusy}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded transition-colors disabled:opacity-50 ${
              inGoTo ? "text-amber-400 hover:text-amber-300" : "text-slate-500 hover:text-amber-300"
            }`}
            onClick={() => onToggleGoTo?.(play)}
            aria-label={inGoTo ? "Remove from Go-To" : "Add to Go-To"}
            aria-pressed={inGoTo}
            title={inGoTo ? "Remove from Go-To" : "Add to Go-To"}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill={inGoTo ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 7.1-1.01L12 2z" />
            </svg>
          </button>
        </div>
      ) : null}
      {!hideRemove ? (
        <div className="flex w-8 shrink-0 justify-center">
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded text-slate-500 transition-colors hover:text-red-400"
            onClick={() => void onRemove(play.id)}
            aria-label="Remove play"
            title="Remove play"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M6 6 18 18M18 6 6 18" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}
