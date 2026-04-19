"use client";

import { useEffect, useMemo, useState } from "react";
import { PlayRow } from "@/components/film/atoms/PlayRow";
import type { PlaybookEntry } from "@/lib/playbook";
import { useFormationGroups } from "@/hooks/useFormationGroups";

type BrowserStep = "formations" | "plays";

interface PlayBrowserProps {
  playbook: string;
  onSelect: (play: PlaybookEntry) => void;
  onClose: () => void;
}

const browserBackButtonClass =
  "min-h-11 shrink-0 rounded-lg border border-slate-700 px-3 font-sans text-sm text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500";

export function PlayBrowser({ playbook, onSelect, onClose }: PlayBrowserProps) {
  const { groups, entries } = useFormationGroups(playbook);
  const [query, setQuery] = useState("");
  const [step, setStep] = useState<BrowserStep>("formations");
  const [selectedFormation, setSelectedFormation] = useState<{ group: string; name: string } | null>(null);

  useEffect(() => {
    window.history.pushState({ filmOverlay: "play-browser" }, "");
    const onPop = () => onClose();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [onClose]);

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

  const selectedPlays = useMemo(() => {
    if (!selectedFormation) return [];
    const g = groups.find((x) => x.group === selectedFormation.group);
    return g?.formations.find((f) => f.name === selectedFormation.name)?.plays ?? [];
  }, [groups, selectedFormation]);

  const level1Header = (
    <div className="flex w-full items-center gap-2 border-b border-slate-700 bg-slate-900 px-4 py-3">
      <button type="button" className={browserBackButtonClass} onClick={onClose}>
        ‹ Back
      </button>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search plays & formations"
        className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 font-sans text-sm text-white placeholder:text-slate-500"
      />
    </div>
  );

  const playsViewHeader = selectedFormation ? (
    <div className="flex w-full items-center gap-2 border-b border-slate-700 bg-slate-900 px-4 py-3">
      <button
        type="button"
        className={browserBackButtonClass}
        onClick={() => {
          setSelectedFormation(null);
          setStep("formations");
        }}
      >
        ‹ Back
      </button>
      <span className="min-w-0 flex-1 truncate text-center font-sans text-sm font-semibold text-slate-100">
        {selectedFormation.name}
      </span>
      <span className={`${browserBackButtonClass} pointer-events-none invisible shrink-0`} aria-hidden>
        ‹ Back
      </span>
    </div>
  ) : null;

  return (
    <div className="absolute inset-0 z-30 flex min-h-0 flex-col bg-slate-950 motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-200">
      {searching ? (
        <>
          {level1Header}
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pt-0 pb-4">
            {filtered.map((play) => (
              <PlayRow key={play.play_id} play={play} onSelect={onSelect} />
            ))}
          </div>
        </>
      ) : step === "formations" ? (
        <>
          {level1Header}
          <div className="min-h-0 flex-1 overflow-y-auto pt-0 pb-4">
            {groups.map((group) => (
              <div key={group.group}>
                <div className="sticky top-0 z-[1] bg-slate-950 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-widest text-slate-500">
                  {group.group.toUpperCase()}
                </div>
                <div className="grid grid-cols-2 gap-2 px-4 pb-2">
                  {group.formations.map((formation) => (
                    <button
                      key={`${group.group}::${formation.name}`}
                      type="button"
                      className="min-h-[44px] truncate rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-left text-sm font-medium text-slate-100 transition-colors hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                      onClick={() => {
                        setSelectedFormation({ group: group.group, name: formation.name });
                        setStep("plays");
                      }}
                    >
                      {formation.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : selectedFormation ? (
        <>
          {playsViewHeader}
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pt-0 pb-4">
            {selectedPlays.map((play) => (
              <PlayRow key={play.play_id} play={play} onSelect={onSelect} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
