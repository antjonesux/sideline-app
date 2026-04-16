"use client";

import { comboKey } from "@/lib/loggedPlayStats";
import type { SheetPlayRow } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

type Stats = { uses: number; avg_yards: number; success_rate: number };

function performanceDot(stats: Stats | null): { className: string; label: string } {
  if (!stats || stats.uses === 0) {
    return { className: "bg-slate-600", label: "No data" };
  }
  if (stats.uses < 3) {
    return { className: "bg-[#F4A522]", label: "Limited sample" };
  }
  if (stats.success_rate >= 60) {
    return { className: "bg-emerald-500", label: "Strong" };
  }
  if (stats.success_rate >= 40) {
    return { className: "bg-[#F4A522]", label: "Average" };
  }
  return { className: "bg-[#C0392B]", label: "Below target" };
}

export function PlaySlot({
  play,
  slotIndex,
  isScript,
  scenarioStats,
  atCapacity,
  onAdd,
  onRemove,
  onEdit,
  onScriptNote,
  dragId,
  setDragId,
  onReorder,
}: {
  play: SheetPlayRow | null;
  slotIndex: number;
  isScript: boolean;
  scenarioStats: Record<string, Stats>;
  atCapacity: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  onScriptNote?: (id: string, note: string) => void;
  dragId: string | null;
  setDragId: (id: string | null) => void;
  onReorder: (fromId: string, toSlotIndex: number) => void;
}) {
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    }
    if (menu) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  if (!play) {
    return (
      <div
        onDragOver={(e) => {
          if (!isScript) return;
          e.preventDefault();
        }}
        onDrop={(e) => {
          if (!isScript) return;
          e.preventDefault();
          const id = e.dataTransfer.getData("text/play-id");
          if (id) onReorder(id, slotIndex);
          setDragId(null);
        }}
        className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-3"
      >
        <button
          type="button"
          disabled={atCapacity}
          onClick={onAdd}
          className={`font-body w-full rounded-md border border-dashed py-2 text-sm ${
            atCapacity
              ? "cursor-not-allowed border-slate-800 text-slate-600"
              : "border-slate-600 text-slate-300 hover:border-emerald-700/50 hover:bg-slate-900 hover:text-emerald-200"
          }`}
        >
          Add Play
        </button>
      </div>
    );
  }

  const key = comboKey(play.formation, play.play_name);
  const stats = scenarioStats[key] ?? null;
  const dot = performanceDot(stats);
  return (
    <div
      draggable={isScript}
      onDragStart={(e) => {
        if (!isScript) return;
        e.dataTransfer.setData("text/play-id", play.id);
        e.dataTransfer.effectAllowed = "move";
        setDragId(play.id);
      }}
      onDragEnd={() => setDragId(null)}
      onDragOver={(e) => {
        if (!isScript) return;
        e.preventDefault();
      }}
      onDrop={(e) => {
        if (!isScript) return;
        e.preventDefault();
        const id = e.dataTransfer.getData("text/play-id");
        if (id && id !== play.id) onReorder(id, slotIndex);
        setDragId(null);
      }}
      className={`rounded-lg border border-slate-800 bg-slate-900/90 p-3 ${dragId === play.id ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-2">
        {isScript ? (
          <span className="mt-0.5 cursor-grab select-none font-mono text-xs text-slate-500 active:cursor-grabbing" title="Drag to reorder">
            ⋮⋮
          </span>
        ) : null}
        {isScript ? (
          <span className="mt-0.5 min-w-[1.25rem] font-mono text-xs text-emerald-500/90">{slotIndex + 1}.</span>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 leading-snug">
              <span className="font-body text-[13px] text-white">{play.formation}</span>
              <span className="font-body text-slate-500"> → </span>
              <span className="font-mono text-[12px] font-medium uppercase text-white">{play.play_name}</span>
            </p>
            <div className="relative shrink-0 self-start" ref={menuRef}>
              <button
                type="button"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-transparent text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-slate-100"
                aria-expanded={menu}
                aria-haspopup="menu"
                aria-label="Play actions"
                onClick={() => setMenu((m) => !m)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <circle cx="12" cy="5" r="1.75" />
                  <circle cx="12" cy="12" r="1.75" />
                  <circle cx="12" cy="19" r="1.75" />
                </svg>
              </button>
              {menu ? (
                <ul
                  className="app-dropdown-panel absolute end-0 z-20 mt-1 min-w-[8rem] py-1"
                  role="menu"
                >
                  <li>
                    <button
                      type="button"
                      role="menuitem"
                      className="app-dropdown-item rounded-none text-start"
                      onClick={() => {
                        setMenu(false);
                        onEdit(play.id);
                      }}
                    >
                      Edit
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      role="menuitem"
                      className="app-dropdown-item-danger rounded-none text-start"
                      onClick={() => {
                        setMenu(false);
                        onRemove(play.id);
                      }}
                    >
                      Remove
                    </button>
                  </li>
                </ul>
              ) : null}
            </div>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className={`size-2 shrink-0 rounded-full ${dot.className}`} title={dot.label} />
              {stats && stats.uses > 0 ? (
                <p className="min-w-0 truncate text-[11px] text-slate-500">
                  <span className="font-mono">{stats.uses}</span>
                  <span className="font-body ml-1">uses</span>
                  <span className="mx-1 text-slate-600">·</span>
                  <span className="font-mono">{stats.avg_yards.toFixed(1)}</span>
                  <span className="font-body ml-1">avg yds</span>
                  <span className="mx-1 text-slate-600">·</span>
                  <span className="font-mono">{stats.success_rate}%</span>
                  <span className="font-body ml-1">success</span>
                </p>
              ) : (
                <p className="min-w-0 truncate font-body text-[11px] text-slate-500">No data yet</p>
              )}
            </div>
          </div>
          {isScript && onScriptNote ? (
            <input
              className="mt-2 w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 font-body text-xs text-slate-200 placeholder:text-slate-600"
              placeholder='e.g. Set up play action'
              maxLength={40}
              defaultValue={play.script_note ?? ""}
              onBlur={(e) => onScriptNote(play.id, e.target.value.slice(0, 40))}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
