"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { useEffect, useMemo, useState } from "react";
import { PlayRow } from "@/components/film/atoms/PlayRow";
import type { PlaybookEntry } from "@/lib/playbook";
import { isExcludedFromPlaySheetPlay } from "@/lib/filmPlayCounting";
import { useFormationGroups } from "@/hooks/useFormationGroups";

type BrowserStep = "formations" | "plays";

interface PlayBrowserProps {
  playbook: string;
  onSelect: (play: PlaybookEntry) => void;
  onClose: () => void;
  /** Level 1 only: hides the header Back that dismisses the overlay (e.g. Game Plan modal uses close icon). Level 2 always shows Back to formations. */
  showTopLevelBack?: boolean;
  /** When true, hides Punt / Field Goal catalog entries so they cannot be added to a play sheet. */
  excludePlaySheetSpecialTeams?: boolean;
}

const browserBackButtonClass =
  "min-h-11 shrink-0 rounded-lg border border-slate-700 px-3 font-sans text-sm text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500";

function stripGroupPrefix(formationName: string, groupName: string): string {
  const prefix = `${groupName} `;
  if (formationName.startsWith(prefix)) {
    return formationName.slice(prefix.length);
  }
  return formationName;
}

export function PlayBrowser({
  playbook,
  onSelect,
  onClose,
  showTopLevelBack = true,
  excludePlaySheetSpecialTeams = false,
}: PlayBrowserProps) {
  const { groups, entries, loading } = useFormationGroups(playbook);
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
      if (excludePlaySheetSpecialTeams && isExcludedFromPlaySheetPlay(entry)) return false;
      return (
        entry.play_name.toLowerCase().includes(q) ||
        entry.formation.toLowerCase().includes(q) ||
        entry.group.toLowerCase().includes(q) ||
        entry.play_type.toLowerCase().includes(q)
      );
    });
  }, [query, entries, excludePlaySheetSpecialTeams]);

  const selectedPlays = useMemo(() => {
    if (!selectedFormation) return [];
    const g = groups.find((x) => x.group === selectedFormation.group);
    const raw = g?.formations.find((f) => f.name === selectedFormation.name)?.plays ?? [];
    if (!excludePlaySheetSpecialTeams) return raw;
    return raw.filter((p) => !isExcludedFromPlaySheetPlay(p));
  }, [groups, selectedFormation, excludePlaySheetSpecialTeams]);

  useEffect(() => {
    console.log("[PlayLoggerV2->PlayBrowser] pre-render formations", {
      groups,
      isLoading: loading,
      error: null,
    });
  }, [groups, loading]);

  const level1Header = (
    <div className="w-full border-b border-slate-700 bg-slate-900">
      <div className="flex w-full items-center gap-3 px-4 py-3">
        {showTopLevelBack ? (
          <button type="button" className={browserBackButtonClass} onClick={onClose}>
            Back
          </button>
        ) : null}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search plays & formations"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 font-sans text-sm text-white placeholder:text-slate-500"
        />
      </div>
    </div>
  );

  const playsViewHeader = selectedFormation ? (
    <div className="w-full border-b border-slate-700 bg-slate-900">
      <div className="flex w-full items-center gap-3 px-4 py-3">
        <button
          type="button"
          className={browserBackButtonClass}
          onClick={() => {
            setSelectedFormation(null);
            setStep("formations");
          }}
        >
          Back
        </button>
        <span className="min-w-0 flex-1 truncate text-center font-sans text-sm font-semibold text-slate-100">
          {selectedFormation.name}
        </span>
        <span className={`${browserBackButtonClass} pointer-events-none invisible shrink-0`} aria-hidden>
          Back
        </span>
      </div>
    </div>
  ) : null;

  return (
    <div className="absolute inset-0 z-30 flex min-h-0 w-full flex-col bg-slate-950 motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-200">
      {searching ? (
        <>
          {level1Header}
          <div className="min-h-0 w-full flex-1 overflow-y-auto bg-slate-900 pt-3">
            <div className="flex flex-col gap-2 px-4 pb-4">
              {filtered.map((play) => (
                <PlayRow key={play.play_id} play={play} onSelect={onSelect} />
              ))}
            </div>
          </div>
        </>
      ) : step === "formations" ? (
        <>
          {level1Header}
          <div className="min-h-0 w-full flex-1 overflow-y-auto bg-slate-900 pb-4 pt-3">
            {groups.map((group, index) => (
              <div key={group.group}>
                <div
                  className={`px-4 py-2 font-mono text-xs font-semibold uppercase tracking-widest text-emerald-400 ${
                    index > 0 ? "mt-4" : ""
                  }`}
                >
                  {group.group.toUpperCase()}
                </div>
                <div className="grid w-full grid-cols-2 gap-2 px-4">
                  {group.formations.map((formation) => (
                    <button
                      key={`${group.group}::${formation.name}`}
                      type="button"
                      className="min-h-[44px] w-full truncate rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-left text-sm font-medium text-slate-100 transition-colors hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                      onClick={() => {
                        setSelectedFormation({ group: group.group, name: formation.name });
                        setStep("plays");
                      }}
                    >
                      {stripGroupPrefix(formation.name, group.group)}
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
          <div className="min-h-0 w-full flex-1 overflow-y-auto bg-slate-900 pt-3">
            <div className="flex flex-col gap-2 px-4 pb-4">
              {selectedPlays.map((play) => (
                <PlayRow key={play.play_id} play={play} onSelect={onSelect} />
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
