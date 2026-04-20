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
  index,
  playType,
  onRemove,
  className = "",
  ...rootProps
}: {
  play: SheetPlayRow;
  index: number;
  playType: GamePlanPlayType;
  onRemove: (id: string) => void | Promise<void>;
} & ComponentPropsWithoutRef<"div">) {
  return (
    <div
      {...rootProps}
      className={`flex min-h-11 items-center gap-3 border-b border-slate-700/50 px-4 py-3 ${className}`.trim()}
    >
      <div className="flex w-6 shrink-0 justify-center text-slate-600">
        <DragHandleIcon className="h-4 w-4" />
      </div>
      <div className="w-12 shrink-0 pr-4 text-right font-mono text-xs text-slate-500">{index + 1}</div>
      <div className="min-w-0 flex-1 truncate font-sans text-sm font-semibold text-slate-100">{normalizePlayName(play.play_name)}</div>
      <div className="hidden w-36 shrink-0 truncate font-mono text-xs text-slate-500 sm:block">{play.formation}</div>
      <div className="flex w-16 shrink-0 justify-center">
        <PlayTypeBadge type={playType} />
      </div>
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
    </div>
  );
}
