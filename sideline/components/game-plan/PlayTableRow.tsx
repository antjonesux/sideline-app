"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import type { ComponentPropsWithoutRef, PointerEvent as ReactPointerEvent } from "react";
import { useMemo, useRef } from "react";
import { normalizePlayName } from "@/lib/utils";
import { callSheetPlayDisplayLabel } from "@/lib/playbookUtils";
import { PLAY_SETUP_COUNT_INDICATOR } from "@/lib/coachCopy";
import type { CatalogGameVersion, CatalogSideOfBall } from "@/lib/constants";
import { deriveFormationGroup } from "@/lib/playbook";
import { resolvePlayArtUrl } from "@/lib/playArtUrl";
import type { SheetPlayRow } from "@/lib/types";
import { DragHandleIcon } from "@/components/game-plan/DragHandleIcon";
import { PlayTypeBadge } from "@/components/game-plan/PlayTypeBadge";
import { PlayArtImage } from "@/components/playbook/PlayArtImage";

export type GamePlanPlayType = "RUN" | "PASS" | "RPO";

const TAP_MOVE_THRESHOLD_PX = 8;

function SetupNotesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M8 4h8a2 2 0 0 1 2 2v12.5a.5.5 0 0 1-.8.4L14 16H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="M9 8h6M9 11h4" />
    </svg>
  );
}

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
  hidePlayType = false,
  readOnly = false,
  formationFirstLabel = false,
  setupCount = 0,
  onOpenDetail,
  dragHandleProps,
  catalogPlaybook,
  catalogGameVersion,
  catalogSideOfBall,
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
  /** Call Sheet situation detail — omit RUN/PASS/RPO pill. */
  hidePlayType?: boolean;
  /** Read-only reference rows (Call Sheet viewer) — no drag, remove, or Go-To toggle. */
  readOnly?: boolean;
  /** Show `formation → play` in the Play column (Call Sheet viewer). */
  formationFirstLabel?: boolean;
  /** Setup count indicator — shown only when > 0. */
  setupCount?: number;
  /** Whole-row body tap opens play detail (handle / star / × excluded). */
  onOpenDetail?: () => void;
  /** HTML5 drag listeners for the handle only. */
  dragHandleProps?: ComponentPropsWithoutRef<"div">;
  /** When set with version + side, show a compact play-art thumbnail. */
  catalogPlaybook?: string;
  catalogGameVersion?: CatalogGameVersion | string;
  catalogSideOfBall?: CatalogSideOfBall;
} & Omit<ComponentPropsWithoutRef<"div">, "children">) {
  const showDrag = !readOnly;
  const showRemove = !readOnly && !hideRemove;
  const showGoToControl = showGoToStar && !readOnly;
  const playLabel = formationFirstLabel
    ? callSheetPlayDisplayLabel(play.formation, play.play_name)
    : normalizePlayName(play.play_name);
  const showPlayArt = Boolean(catalogPlaybook && catalogGameVersion && catalogSideOfBall);
  const resolvedArt = useMemo(() => {
    if (!showPlayArt || !catalogPlaybook || !catalogGameVersion || !catalogSideOfBall) return null;
    return resolvePlayArtUrl({
      playbook: catalogPlaybook,
      formation: play.formation,
      formationType: deriveFormationGroup(play.formation),
      playName: play.play_name,
      gameVersion: catalogGameVersion,
      side: catalogSideOfBall,
    });
  }, [
    showPlayArt,
    catalogPlaybook,
    catalogGameVersion,
    catalogSideOfBall,
    play.formation,
    play.play_name,
  ]);
  const pointerOrigin = useRef<{ x: number; y: number } | null>(null);
  const movedPastThreshold = useRef(false);

  function onDetailPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    pointerOrigin.current = { x: e.clientX, y: e.clientY };
    movedPastThreshold.current = false;
  }

  function onDetailPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const origin = pointerOrigin.current;
    if (!origin) return;
    const dx = Math.abs(e.clientX - origin.x);
    const dy = Math.abs(e.clientY - origin.y);
    if (dx > TAP_MOVE_THRESHOLD_PX || dy > TAP_MOVE_THRESHOLD_PX) {
      movedPastThreshold.current = true;
    }
  }

  function onDetailPointerUp() {
    pointerOrigin.current = null;
  }

  function onDetailClick() {
    if (movedPastThreshold.current) {
      movedPastThreshold.current = false;
      return;
    }
    onOpenDetail?.();
  }

  const labelBlock = (
    <>
      <p className="truncate font-sans text-sm font-semibold text-slate-100">{playLabel}</p>
      {stackFormation && !formationFirstLabel ? (
        <p className="mt-0.5 truncate font-body text-xs text-slate-500">{play.formation}</p>
      ) : null}
    </>
  );

  return (
    <div
      {...rootProps}
      className={`flex min-h-11 items-center gap-3 border-b border-slate-700/50 px-4 py-3 ${className}`.trim()}
    >
      {showDrag ? (
        <div
          className="flex w-6 shrink-0 cursor-grab justify-center text-slate-600 active:cursor-grabbing"
          {...dragHandleProps}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => {
            e.stopPropagation();
            dragHandleProps?.onPointerDown?.(e);
          }}
        >
          <DragHandleIcon className="h-4 w-4" />
        </div>
      ) : null}
      {showPlayArt ? (
        <div className="w-24 shrink-0 sm:w-28" aria-hidden={!resolvedArt}>
          <PlayArtImage
            src={resolvedArt?.src ?? null}
            source={resolvedArt?.source}
            alt=""
            compact
          />
        </div>
      ) : null}
      {onOpenDetail ? (
        <button
          type="button"
          className="min-w-0 flex-1 rounded-md text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          onPointerDown={onDetailPointerDown}
          onPointerMove={onDetailPointerMove}
          onPointerUp={onDetailPointerUp}
          onPointerCancel={onDetailPointerUp}
          onClick={onDetailClick}
        >
          {labelBlock}
        </button>
      ) : (
        <div className="min-w-0 flex-1">{labelBlock}</div>
      )}
      {!stackFormation ? (
        <div className="hidden w-36 shrink-0 truncate font-mono text-xs text-slate-500 sm:block">{play.formation}</div>
      ) : null}
      {!hidePlayType ? (
        <div className="flex w-16 shrink-0 justify-center">
          <PlayTypeBadge type={playType} />
        </div>
      ) : null}
      {setupCount > 0 ? (
        <div
          className="flex w-8 shrink-0 justify-center"
          title={PLAY_SETUP_COUNT_INDICATOR(setupCount)}
        >
          <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-400">
            <SetupNotesIcon className="h-5 w-5" />
            {setupCount}
          </span>
        </div>
      ) : null}
      {showGoToControl ? (
        <div className="flex w-8 shrink-0 justify-center">
          <button
            type="button"
            disabled={goToBusy}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded transition-colors disabled:opacity-50 ${
              inGoTo ? "text-amber-400 hover:text-amber-300" : "text-slate-500 hover:text-amber-300"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleGoTo?.(play);
            }}
            onPointerDown={(e) => e.stopPropagation()}
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
      {readOnly && showGoToStar ? (
        <div className="flex w-8 shrink-0 justify-center">
          {inGoTo ? (
            <span className="text-amber-400" aria-label="Go-To play" title="Go-To play">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 7.1-1.01L12 2z" />
              </svg>
            </span>
          ) : (
            <span aria-hidden />
          )}
        </div>
      ) : null}
      {showRemove ? (
        <div className="flex w-8 shrink-0 justify-center">
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded text-slate-500 transition-colors hover:text-red-400"
            onClick={(e) => {
              e.stopPropagation();
              void onRemove(play.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
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
