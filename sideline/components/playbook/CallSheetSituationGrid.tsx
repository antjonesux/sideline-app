"use client";

import { DragHandleIcon } from "@/components/game-plan/DragHandleIcon";
import { SituationIconBadge } from "@/components/playbook/SituationIconBadge";
import { getSituationColor } from "@/lib/constants";
import {
  callSheetScenarioDisplayName,
  callSheetScenarioHelperText,
  callSheetScenarioPlayCountLabel,
  reorderSituationBlocks,
} from "@/lib/playbookUtils";
import { isGoToPlaysSituation } from "@/lib/situationApiHelpers";
import type { SheetScenarioBlock } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

function minDropIndex(scenarios: SheetScenarioBlock[]): number {
  return scenarios.some((block) => isGoToPlaysSituation(block)) ? 1 : 0;
}

function resolveDropIndex(
  scenarios: SheetScenarioBlock[],
  hoverIndex: number,
  hoverLocked: boolean,
): number {
  const min = minDropIndex(scenarios);
  if (hoverLocked) return min;
  return Math.max(min, hoverIndex);
}

export function CallSheetSituationGrid({
  scenarios,
  onSelect,
  getOptionState,
  editMode = false,
  dragId = null,
  setDragId,
  onReorder,
  onDelete,
  columns = "two",
}: {
  scenarios: SheetScenarioBlock[];
  onSelect: (scenario: string) => void;
  getOptionState?: (block: SheetScenarioBlock) => { disabled?: boolean; statusLabel?: string };
  editMode?: boolean;
  dragId?: string | null;
  setDragId?: (id: string | null) => void;
  onReorder?: (fromId: string, toIndex: number) => void;
  onDelete?: (block: SheetScenarioBlock) => void;
  columns?: "two" | "responsive";
}) {
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const dropTargetIndexRef = useRef<number | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const scenariosRef = useRef(scenarios);
  const pointerDragActiveRef = useRef(false);

  scenariosRef.current = scenarios;

  const setDropTarget = (index: number | null) => {
    dropTargetIndexRef.current = index;
    setDropTargetIndex(index);
  };

  const clearDragState = useCallback(() => {
    dragIdRef.current = null;
    pointerDragActiveRef.current = false;
    setDragId?.(null);
    setDropTarget(null);
  }, [setDragId]);

  const updateDropTargetFromPoint = useCallback((clientX: number, clientY: number, fromId: string) => {
    const list = scenariosRef.current;
    const el = document.elementFromPoint(clientX, clientY);
    const row = el?.closest<HTMLElement>("[data-situation-id]");
    if (!row) return;
    const hoverId = row.dataset.situationId;
    if (!hoverId || hoverId === fromId) return;
    const block = list.find((item) => item.id === hoverId);
    if (!block) return;
    const hoverIndex = list.findIndex((item) => item.id === hoverId);
    if (hoverIndex === -1) return;
    setDropTarget(resolveDropIndex(list, hoverIndex, isGoToPlaysSituation(block)));
  }, []);

  const finishPointerDrag = useCallback(
    (fromId: string, startIndex: number) => {
      const target = dropTargetIndexRef.current;
      if (target !== null && target !== startIndex) {
        onReorder?.(fromId, target);
      }
      clearDragState();
    },
    [clearDragState, onReorder],
  );

  const startPointerDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, fromId: string) => {
      if (pointerDragActiveRef.current) return;
      if (e.button !== 0) return;

      const list = scenariosRef.current;
      const startIndex = list.findIndex((item) => item.id === fromId);
      if (startIndex === -1) return;

      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);

      pointerDragActiveRef.current = true;
      dragIdRef.current = fromId;
      setDragId?.(fromId);
      setDropTarget(startIndex);

      const onMove = (ev: PointerEvent) => {
        updateDropTargetFromPoint(ev.clientX, ev.clientY, fromId);
      };

      const onEnd = () => {
        finishPointerDrag(fromId, startIndex);
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onEnd);
        document.removeEventListener("pointercancel", onEnd);
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onEnd);
      document.addEventListener("pointercancel", onEnd);
    },
    [finishPointerDrag, setDragId, updateDropTargetFromPoint],
  );

  const displayScenarios = useMemo(() => {
    if (!editMode || !dragId || dropTargetIndex === null) return scenarios;
    return reorderSituationBlocks(scenarios, dragId, dropTargetIndex);
  }, [editMode, dragId, dropTargetIndex, scenarios]);

  return (
    <div
      className={cn(
        "grid gap-3",
        columns === "responsive" ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2",
      )}
      role="list"
      aria-label="Tactical situations"
    >
      {displayScenarios.map((s) => {
        const count = s.plays?.length ?? 0;
        const optionState = getOptionState?.(s);
        const disabled = optionState?.disabled ?? false;
        const locked = isGoToPlaysSituation(s);
        const colorKey = s.color ?? "blue";
        const colors = getSituationColor(colorKey);
        const displayName = callSheetScenarioDisplayName(s.scenario);
        const helper = callSheetScenarioHelperText(s.scenario, s.description);
        const countLabel =
          optionState?.statusLabel ?? callSheetScenarioPlayCountLabel(count);

        if (editMode) {
          const isDragging = dragId === s.id;

          return (
            <div
              key={s.id}
              data-situation-id={s.id}
              role="listitem"
              className={cn(
                "flex min-h-[3.5rem] min-w-0 w-full items-center gap-2 rounded-xl border px-3 py-3 transition-[border-color,background-color,opacity,box-shadow] duration-150",
                locked
                  ? "cursor-default border-slate-800/60 opacity-60"
                  : "border-slate-800",
                isDragging &&
                  "border-emerald-500/50 bg-emerald-500/10 opacity-90 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]",
              )}
            >
              <div className="flex w-6 shrink-0 items-center justify-center">
                {locked ? (
                  <span className="w-4" aria-hidden />
                ) : (
                  <div
                    onPointerDown={(e) => startPointerDrag(e, s.id)}
                    className="cursor-grab touch-none select-none active:cursor-grabbing"
                    aria-label={`Drag ${displayName}`}
                  >
                    <DragHandleIcon className="h-4 w-4 text-slate-500" />
                  </div>
                )}
              </div>
              <p className="min-w-0 flex-1 truncate font-heading text-sm font-bold text-white">
                {displayName}
              </p>
              {locked ? null : (
                <button
                  type="button"
                  aria-label={`Delete ${displayName}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onDelete?.(s)}
                  className="shrink-0 p-1 text-slate-500 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
          );
        }

        return (
          <button
            key={s.id}
            type="button"
            role="listitem"
            disabled={disabled}
            onClick={() => onSelect(s.scenario)}
            className={cn(
              "flex min-h-[5.5rem] min-w-0 w-full flex-col rounded-xl p-3 text-start transition-colors",
              columns === "responsive" && "md:min-h-[6.5rem] md:rounded-2xl md:p-5",
              colors.bg,
              disabled ? "cursor-not-allowed opacity-50" : "hover:brightness-110",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <SituationIconBadge icon={s.icon} colorKey={colorKey} name={s.scenario} size="md" />
              <span className={cn("shrink-0 font-body text-xs opacity-80", colors.text)}>{countLabel}</span>
            </div>
            <div className="mt-2 min-w-0">
              <p className={cn("truncate font-heading text-sm font-bold", colors.text)}>{displayName}</p>
              {helper ? (
                <p className={cn("mt-0.5 truncate font-body text-xs opacity-75", colors.text)}>{helper}</p>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
