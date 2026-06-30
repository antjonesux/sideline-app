"use client";

import { DragHandleIcon } from "@/components/game-plan/DragHandleIcon";
import { SituationIconBadge } from "@/components/playbook/SituationIconBadge";
import { getSituationColor } from "@/lib/constants";
import {
  callSheetScenarioDisplayName,
  callSheetScenarioHelperText,
  callSheetScenarioPlayCountLabel,
} from "@/lib/playbookUtils";
import type { SheetScenarioBlock } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";

function previewSituationOrder(
  scenarios: SheetScenarioBlock[],
  dragId: string,
  targetIndex: number,
): SheetScenarioBlock[] {
  const fromIndex = scenarios.findIndex((s) => s.id === dragId);
  if (fromIndex === -1 || fromIndex === targetIndex) return scenarios;
  const next = [...scenarios];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

function minDropIndex(scenarios: SheetScenarioBlock[]): number {
  return scenarios[0]?.is_locked ? 1 : 0;
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

  const setDropTarget = (index: number | null) => {
    dropTargetIndexRef.current = index;
    setDropTargetIndex(index);
  };

  const displayScenarios = useMemo(() => {
    if (!editMode || !dragId || dropTargetIndex === null) return scenarios;
    return previewSituationOrder(scenarios, dragId, dropTargetIndex);
  }, [editMode, dragId, dropTargetIndex, scenarios]);

  const clearDragState = () => {
    setDragId?.(null);
    setDropTarget(null);
  };

  return (
    <div
      className={cn(
        "grid gap-3",
        columns === "responsive" ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2",
      )}
      role="list"
      aria-label="Tactical situations"
      onDragLeave={(e) => {
        if (!editMode || !dragId) return;
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDropTarget(null);
      }}
    >
      {displayScenarios.map((s, index) => {
        const count = s.plays.length;
        const optionState = getOptionState?.(s);
        const disabled = optionState?.disabled ?? false;
        const locked = Boolean(s.is_locked);
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
              role="listitem"
              draggable={!locked}
              onDragStart={(e) => {
                if (locked) return;
                e.dataTransfer.setData("text/situation-id", s.id);
                e.dataTransfer.effectAllowed = "move";
                setDragId?.(s.id);
                const startIndex = scenarios.findIndex((x) => x.id === s.id);
                setDropTarget(startIndex === -1 ? index : startIndex);
              }}
              onDragEnd={clearDragState}
              onDragOver={(e) => {
                if (!dragId || dragId === s.id) return;
                e.preventDefault();
                const hoverIndex = scenarios.findIndex((x) => x.id === s.id);
                if (hoverIndex === -1) return;
                setDropTarget(resolveDropIndex(scenarios, hoverIndex, locked));
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/situation-id");
                if (!id || id === s.id || locked) {
                  clearDragState();
                  return;
                }
                const hoverIndex = scenarios.findIndex((x) => x.id === s.id);
                const target =
                  dropTargetIndexRef.current ??
                  (hoverIndex === -1 ? null : resolveDropIndex(scenarios, hoverIndex, locked));
                if (target !== null) {
                  onReorder?.(id, target);
                }
                clearDragState();
              }}
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
                  <DragHandleIcon className="h-4 w-4 text-slate-500" />
                )}
              </div>
              <p className="min-w-0 flex-1 truncate font-heading text-sm font-bold text-white">
                {displayName}
              </p>
              {locked ? null : (
                <button
                  type="button"
                  aria-label={`Delete ${displayName}`}
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
