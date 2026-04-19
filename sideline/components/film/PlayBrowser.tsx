"use client";

import { useEffect, useMemo, useState } from "react";
import { PlayRow } from "@/components/film/atoms/PlayRow";
import type { PlaybookEntry } from "@/lib/playbook";
import { useFormationGroups } from "@/hooks/useFormationGroups";

interface PlayBrowserProps {
  playbook: string;
  onSelect: (play: PlaybookEntry) => void;
  onClose: () => void;
}

export function PlayBrowser({ playbook, onSelect, onClose }: PlayBrowserProps) {
  const { groups, entries } = useFormationGroups(playbook);
  const [query, setQuery] = useState("");
  const [groupIdx, setGroupIdx] = useState<number | null>(null);
  const [formationIdx, setFormationIdx] = useState<number | null>(null);

  useEffect(() => {
    window.history.pushState({ filmOverlay: "play-browser" }, "");
    const onPop = () => onClose();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [onClose]);

  const selectedGroup = groupIdx == null ? null : groups[groupIdx] ?? null;
  const selectedFormation =
    selectedGroup && formationIdx != null ? selectedGroup.formations[formationIdx] ?? null : null;

  const searching = query.trim().length > 0;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return entries.filter((entry) => {
      return (
        entry.play_name.toLowerCase().includes(q) ||
        entry.formation.toLowerCase().includes(q) ||
        entry.group.toLowerCase().includes(q) ||
        entry.play_type.toLowerCase().includes(q)
      );
    });
  }, [query, entries]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-slate-950 px-4 py-4 motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-200">
      <div className="mb-3 flex items-center gap-2">
        <button type="button" className="min-h-11 rounded-lg border border-slate-700 px-3 font-sans text-sm text-slate-300" onClick={onClose}>
          Back
        </button>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search plays & formations"
          className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 font-sans text-sm text-white placeholder:text-slate-500"
        />
      </div>

      {searching ? (
        <div className="space-y-2 overflow-y-auto pb-4">
          {filtered.map((play) => (
            <PlayRow key={play.play_id} play={play} onSelect={onSelect} />
          ))}
        </div>
      ) : groupIdx == null ? (
        <div className="space-y-2 overflow-y-auto pb-4">
          {groups.map((group, idx) => {
            const playCount = group.formations.reduce((sum, f) => sum + f.plays.length, 0);
            return (
              <button
                key={group.group}
                type="button"
                className="flex min-h-[44px] w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-left"
                onClick={() => setGroupIdx(idx)}
              >
                <span className="min-w-0">
                  <span className="block truncate font-sans text-sm font-bold text-slate-100">{group.group}</span>
                  <span className="block truncate font-mono text-[10px] text-slate-500">
                    {group.formations.length} formations · {playCount} plays
                  </span>
                </span>
                <span className="font-mono text-xs text-slate-500">›</span>
              </button>
            );
          })}
        </div>
      ) : formationIdx == null && selectedGroup ? (
        <div className="space-y-2 overflow-y-auto pb-4">
          <button type="button" className="min-h-11 text-left font-sans text-sm text-slate-300" onClick={() => setGroupIdx(null)}>
            ‹ Back {selectedGroup.group}
          </button>
          {selectedGroup.formations.map((formation, idx) => (
            <button
              key={formation.name}
              type="button"
              className="flex min-h-[44px] w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-left"
              onClick={() => setFormationIdx(idx)}
            >
              <span className="truncate font-sans text-sm text-slate-100">{formation.name}</span>
              <span className="font-mono text-xs text-slate-500">{formation.plays.length} plays ›</span>
            </button>
          ))}
        </div>
      ) : selectedFormation ? (
        <div className="space-y-2 overflow-y-auto pb-4">
          <button type="button" className="min-h-11 text-left font-sans text-sm text-slate-300" onClick={() => setFormationIdx(null)}>
            ‹ Back {selectedFormation.name}
          </button>
          {selectedFormation.plays.map((play) => (
            <PlayRow key={play.play_id} play={play} onSelect={onSelect} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
