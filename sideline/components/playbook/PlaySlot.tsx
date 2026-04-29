"use client";

import { PlayTableRow } from "@/components/game-plan/PlayTableRow";
import { resolveCfbDisplayPlayType } from "@/lib/playbook";
import type { SheetPlayRow } from "@/lib/types";

export function PlaySlot({
  play,
  slotIndex,
  atCapacity,
  onAdd,
  onRemove,
  dragId,
  setDragId,
  onReorder,
}: {
  play: SheetPlayRow | null;
  slotIndex: number;
  atCapacity: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void | Promise<void>;
  dragId: string | null;
  setDragId: (id: string | null) => void;
  onReorder: (fromId: string, toSlotIndex: number) => void;
}) {
  if (!play) {
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          const id = e.dataTransfer.getData("text/play-id");
          if (id) onReorder(id, slotIndex);
          setDragId(null);
        }}
        className="border-b border-slate-700/50 px-4 py-3"
      >
        <button
          type="button"
          disabled={atCapacity}
          onClick={onAdd}
          className={`font-sans flex min-h-11 w-full items-center justify-center rounded-lg border-2 border-dashed text-sm ${
            atCapacity
              ? "cursor-not-allowed border-slate-800 text-slate-600"
              : "border-slate-700 text-slate-400 hover:border-emerald-500 hover:text-emerald-400"
          }`}
        >
          Add Play
        </button>
      </div>
    );
  }

  const playType = resolveCfbDisplayPlayType(play.play_name, play.play_type ?? null);

  return (
    <PlayTableRow
      play={play}
      playType={playType}
      onRemove={onRemove}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/play-id", play.id);
        e.dataTransfer.effectAllowed = "move";
        setDragId(play.id);
      }}
      onDragEnd={() => setDragId(null)}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/play-id");
        if (id && id !== play.id) onReorder(id, slotIndex);
        setDragId(null);
      }}
      className={dragId === play.id ? "opacity-60" : ""}
    />
  );
}
