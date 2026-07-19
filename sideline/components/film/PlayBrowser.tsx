"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AddPlayBrowseRow } from "@/components/playbook/AddPlayBrowseRow";
import { PlayRow } from "@/components/film/atoms/PlayRow";
import { PlayTableHeader } from "@/components/game-plan/PlayTableHeader";
import type { PlaybookEntry } from "@/lib/playbook";
import { isExcludedFromPlaySheetPlay } from "@/lib/filmPlayCounting";
import { useFormationGroups, formationGroupsFromEntries, type FormationGroup } from "@/hooks/useFormationGroups";
import { sheetPlayComboKey } from "@/lib/playbookUtils";
import { FILM_LOGGER_SPECIAL_TEAMS_PLAYS } from "@/lib/filmLoggerSpecialTeams";
import { playSheetFormationTileClass } from "@/lib/constants/designTokens";
import type { CatalogSideOfBall } from "@/lib/constants";
import {
  DEFENSE_TRAILING_FORMATION_GROUPS,
  OFFENSE_TRAILING_FORMATION_GROUPS,
  pinTrailingFormationGroups,
} from "@/lib/playbooks/formation-types";
import { IconBackButton, IconBackButtonSpacer } from "@/components/shared/IconBackButton";
import { X } from "lucide-react";

type BrowserStep = "formations" | "plays";

interface PlayBrowserProps {
  playbook: string;
  onSelect: (play: PlaybookEntry) => void;
  onClose: () => void;
  /** Level 1 only: hides the header Back that dismisses the overlay (e.g. Play Sheet modal uses close icon). Level 2 always shows Back to formations. */
  showTopLevelBack?: boolean;
  /** When true, hides Punt / Field Goal catalog entries so they cannot be added to a play sheet. */
  excludePlaySheetSpecialTeams?: boolean;
  /**
   * `overlay` (default): full-bleed layer with history back-to-close.
   * `inline`: flex column for embedding (e.g. Film Play Logger Browse tab) — no history hook, no top-level Back.
   */
  presentation?: "overlay" | "inline";
  /** Local QA only: skip catalog fetch and use this list (e.g. `/qa/play-sheet/*`). */
  qaStaticEntries?: PlaybookEntry[];
  /** Local QA only: open on a specific step (e.g. plays list for a formation). */
  qaInitialUi?: { step: BrowserStep; formation?: { group: string; name: string } };
  /** Play Sheet Add Play drawer — muted section labels and card-style formation tiles. */
  playSheetAddLayout?: boolean;
  /** Play Sheet Add Play: show Go-To star on catalog rows. */
  showGoToStar?: boolean;
  goToPlayKeys?: Set<string>;
  goToBusyComboKey?: string | null;
  onToggleGoTo?: (play: PlaybookEntry) => void;
  /** Play Sheet Add Play: combo keys added during this drawer session. */
  addedPlayKeys?: Set<string>;
  /** Play Sheet Add Play: disable add buttons (e.g. target situation at capacity). */
  addDisabled?: boolean;
  /** Play Sheet Add Play: parent owns the drawer header when embedded inline. */
  onPlaySheetNavChange?: (nav: PlaySheetAddNav) => void;
  /** Play Sheet add-play: pins Goal Line + Hail Mary (offense) or Goal Line + Prevent (defense) to the bottom. */
  catalogSideOfBall?: CatalogSideOfBall;
}

export type PlaySheetAddNav = {
  step: BrowserStep;
  formationLabel?: string;
  onBack: () => void;
};

function stripGroupPrefix(formationName: string, groupName: string): string {
  const prefix = `${groupName} `;
  if (formationName.startsWith(prefix)) {
    return formationName.slice(prefix.length);
  }
  return formationName;
}

export { stripGroupPrefix as stripFormationGroupPrefix };

export function PlayBrowser({
  playbook,
  onSelect,
  onClose,
  showTopLevelBack = true,
  excludePlaySheetSpecialTeams = false,
  presentation = "overlay",
  qaStaticEntries,
  qaInitialUi,
  playSheetAddLayout = false,
  showGoToStar = false,
  goToPlayKeys,
  goToBusyComboKey = null,
  onToggleGoTo,
  addedPlayKeys,
  addDisabled = false,
  onPlaySheetNavChange,
  catalogSideOfBall,
}: PlayBrowserProps) {
  const isInline = presentation === "inline";
  const effectiveShowTopLevelBack = showTopLevelBack && !isInline;
  const catalog = useFormationGroups(qaStaticEntries ? "" : playbook);
  const groups = qaStaticEntries ? formationGroupsFromEntries(qaStaticEntries) : catalog.groups;
  const entries = qaStaticEntries ?? catalog.entries;
  const loading = qaStaticEntries ? false : catalog.loading;
  const error = qaStaticEntries ? null : catalog.error;
  const hasAttemptedLoad = qaStaticEntries ? true : catalog.hasAttemptedLoad;
  const [query, setQuery] = useState("");
  const [step, setStep] = useState<BrowserStep>(qaInitialUi?.step ?? "formations");
  const [selectedFormation, setSelectedFormation] = useState<{ group: string; name: string } | null>(
    qaInitialUi?.formation ?? null,
  );
  const playsScrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    if (!selectedFormation) return;
    const el = playsScrollRef.current;
    if (el) el.scrollTop = 0;
  }, [selectedFormation?.group, selectedFormation?.name]);

  useLayoutEffect(() => {
    if (!playSheetAddLayout || !onPlaySheetNavChange) return;
    if (step === "plays" && selectedFormation) {
      onPlaySheetNavChange({
        step: "plays",
        formationLabel: stripGroupPrefix(selectedFormation.name, selectedFormation.group),
        onBack: () => {
          setSelectedFormation(null);
          setStep("formations");
        },
      });
      return;
    }
    onPlaySheetNavChange({
      step: "formations",
      onBack: onClose,
    });
  }, [onClose, onPlaySheetNavChange, playSheetAddLayout, selectedFormation, step]);

  useEffect(() => {
    if (isInline) return;
    window.history.pushState({ filmOverlay: "play-browser" }, "");
    const onPop = () => onClose();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [onClose, isInline]);

  const searching = query.trim().length > 0;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const fromCatalog = entries.filter((entry) => {
      if (excludePlaySheetSpecialTeams && isExcludedFromPlaySheetPlay(entry)) return false;
      return (
        entry.play_name.toLowerCase().includes(q) ||
        entry.formation.toLowerCase().includes(q) ||
        entry.group.toLowerCase().includes(q) ||
        entry.play_type.toLowerCase().includes(q)
      );
    });
    if (excludePlaySheetSpecialTeams) return fromCatalog;
    const filmSt = FILM_LOGGER_SPECIAL_TEAMS_PLAYS.filter(
      (entry) =>
        entry.play_name.toLowerCase().includes(q) ||
        entry.formation.toLowerCase().includes(q) ||
        entry.group.toLowerCase().includes(q) ||
        entry.play_type.toLowerCase().includes(q),
    );
    const seen = new Set(fromCatalog.map((e) => e.play_id));
    return [...filmSt.filter((e) => !seen.has(e.play_id)), ...fromCatalog];
  }, [query, entries, excludePlaySheetSpecialTeams]);

  const displayGroups = useMemo((): FormationGroup[] => {
    if (excludePlaySheetSpecialTeams) {
      const side =
        catalogSideOfBall ??
        (groups.some((g) => g.group === "Prevent") ? "defense" : "offense");
      const trailing =
        side === "defense" ? DEFENSE_TRAILING_FORMATION_GROUPS : OFFENSE_TRAILING_FORMATION_GROUPS;
      return pinTrailingFormationGroups(groups, trailing);
    }
    const stBlock: FormationGroup = {
      group: "Special Teams",
      formations: [{ name: "Special Teams", plays: [...FILM_LOGGER_SPECIAL_TEAMS_PLAYS] }],
    };
    const glIdx = groups.findIndex((g) => g.group === "Goal Line");
    if (glIdx === -1) return [...groups, stBlock];
    const next = [...groups];
    next.splice(glIdx + 1, 0, stBlock);
    return next;
  }, [groups, excludePlaySheetSpecialTeams, catalogSideOfBall]);

  const selectedPlays = useMemo(() => {
    if (!selectedFormation) return [];
    if (
      !excludePlaySheetSpecialTeams &&
      selectedFormation.group === "Special Teams" &&
      selectedFormation.name === "Special Teams"
    ) {
      return [...FILM_LOGGER_SPECIAL_TEAMS_PLAYS];
    }
    const g = groups.find((x) => x.group === selectedFormation.group);
    const raw = g?.formations.find((f) => f.name === selectedFormation.name)?.plays ?? [];
    if (!excludePlaySheetSpecialTeams) return raw;
    return raw.filter((p) => !isExcludedFromPlaySheetPlay(p));
  }, [groups, selectedFormation, excludePlaySheetSpecialTeams]);

  const level1Header = (
    <div
      className={`relative z-[2] w-full shrink-0 ${playSheetAddLayout ? "px-4 py-3" : "border-b border-slate-700 bg-slate-900"}`}
    >
      <div className={`flex w-full items-center gap-3 ${playSheetAddLayout ? "" : "px-4 py-3"}`}>
        {effectiveShowTopLevelBack ? (
          <IconBackButton aria-label="Back" onClick={onClose} />
        ) : null}
        <div className="relative min-h-11 min-w-0 flex-1">
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search plays & formations"
            autoComplete="off"
            enterKeyHint="search"
            className={`min-h-11 w-full touch-manipulation rounded-xl border border-slate-700 bg-slate-900 py-2 pl-3 font-sans text-sm text-white placeholder:text-slate-500 focus:border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 ${
              query.length > 0 ? "pr-10" : "pr-3"
            } ${playSheetAddLayout ? "" : "rounded-lg"}`}
          />
          {query.length > 0 ? (
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 transition-colors hover:text-slate-300"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                searchInputRef.current?.focus();
              }}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

  const playsViewHeader =
    selectedFormation && !(playSheetAddLayout && onPlaySheetNavChange) ? (
    <div
      className={`relative z-[2] w-full shrink-0 ${playSheetAddLayout ? "px-4 py-3" : "border-b border-slate-700 bg-slate-900"}`}
    >
      <div className={`flex w-full items-center gap-3 ${playSheetAddLayout ? "" : "px-4 py-3"}`}>
        <IconBackButton
          aria-label="Back to formations"
          onClick={() => {
            setSelectedFormation(null);
            setStep("formations");
          }}
        />
        {playSheetAddLayout ? (
          <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold text-white">
            {stripGroupPrefix(selectedFormation.name, selectedFormation.group)}
          </h3>
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate text-center font-sans text-sm font-semibold text-slate-100">
              {selectedFormation.name}
            </span>
            <IconBackButtonSpacer />
          </>
        )}
      </div>
    </div>
  ) : null;

  const formationDisplayLabel = selectedFormation
    ? stripGroupPrefix(selectedFormation.name, selectedFormation.group)
    : "";

  const rootClassName = isInline
    ? "flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-slate-950"
    : "absolute inset-0 z-30 flex min-h-0 w-full flex-col bg-slate-950 motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-200";
  const hasPlaybook = playbook.trim().length > 0;

  return (
    <div className={rootClassName}>
      {searching ? (
        <>
          {level1Header}
          <div className={`min-h-0 w-full flex-1 overflow-y-auto pb-4 ${playSheetAddLayout ? "bg-slate-950 pt-1" : "bg-slate-900 pt-3"}`}>
            <div className="flex flex-col gap-2 px-4 pb-4">
              {!hasPlaybook ? (
                <p className="font-body text-sm text-slate-400">
                  Select a CFB26 playbook to search plays and formations.
                </p>
              ) : error ? (
                <p className="font-body text-sm text-rose-300">Could not load the play catalog. Try again in a moment.</p>
              ) : loading && filtered.length === 0 ? (
                <div className="space-y-2" aria-busy="true" aria-label="Loading plays">
                  <div className="h-11 animate-pulse rounded-lg bg-slate-800/80" />
                  <div className="h-11 animate-pulse rounded-lg bg-slate-800/60" />
                  <div className="h-11 max-w-[90%] animate-pulse rounded-lg bg-slate-800/40" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="font-body text-sm text-slate-500">No plays match this search.</p>
              ) : (
                filtered.map((play) => <PlayRow key={play.play_id} play={play} onSelect={onSelect} />)
              )}
            </div>
          </div>
        </>
      ) : step === "formations" ? (
        <>
          {level1Header}
          <div className={`min-h-0 w-full flex-1 overflow-y-auto pb-4 ${playSheetAddLayout ? "bg-slate-950 pt-1" : "bg-slate-900 pt-3"}`}>
            {!hasPlaybook ? (
              <div className="px-4 py-6">
                <div className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3">
                  <p className="font-body text-sm text-slate-200">
                    This sheet is missing a usable CFB26 playbook.
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-400">
                    Open Edit and select a CFB26 playbook to browse formations.
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="px-4 py-6">
                <div className="rounded-lg border border-rose-800/60 bg-rose-950/25 px-4 py-3">
                  <p className="font-body text-sm text-rose-200">
                    We could not load this play catalog right now.
                  </p>
                  <p className="mt-1 font-mono text-xs text-rose-300/90">
                    Check the selected CFB26 playbook and try again.
                  </p>
                </div>
              </div>
            ) : hasAttemptedLoad && !loading && displayGroups.length === 0 ? (
              <div className="px-4 py-6">
                <div className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3">
                  <p className="font-body text-sm text-slate-200">
                    No formations were found for this playbook.
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-400">
                    Playbook: {playbook || "Unknown"}
                  </p>
                </div>
              </div>
            ) : (
              displayGroups.map((group, index) => (
                <div key={group.group}>
                  <div
                    className={`px-4 py-2 ${
                      playSheetAddLayout
                        ? `font-sans text-xs font-normal uppercase tracking-widest text-slate-500 ${index > 0 ? "mt-4" : "mt-1"}`
                        : `font-mono text-xs font-semibold uppercase tracking-widest text-emerald-400 ${index > 0 ? "mt-4" : ""}`
                    }`}
                  >
                    {group.group.toUpperCase()}
                  </div>
                  <div className={`grid w-full grid-cols-2 px-4 ${playSheetAddLayout ? "gap-3" : "gap-2"}`}>
                    {group.formations.map((formation) => (
                      <button
                        key={`${group.group}::${formation.name}`}
                        type="button"
                        className={
                          playSheetAddLayout
                            ? playSheetFormationTileClass
                            : "min-h-[44px] w-full truncate rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-left text-sm font-medium text-slate-100 transition-colors hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                        }
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
              ))
            )}
          </div>
        </>
      ) : selectedFormation ? (
        <>
          {playsViewHeader}
          <div ref={playsScrollRef} className={`min-h-0 w-full flex-1 overflow-y-auto ${playSheetAddLayout ? "bg-slate-950 py-4" : "bg-slate-900 pb-4 pt-3"}`}>
            {playSheetAddLayout ? (
              <div className="mx-4 overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60">
                <PlayTableHeader
                  hideDragColumn
                  stackFormation
                  showGoToColumn={showGoToStar}
                  actionColumn="add"
                />
                <div>
                  {selectedPlays.map((play) => {
                    const comboKey = sheetPlayComboKey(play.formation, play.play_name);
                    return (
                      <AddPlayBrowseRow
                        key={play.play_id}
                        play={play}
                        formationLabel={formationDisplayLabel}
                        inGoTo={goToPlayKeys?.has(comboKey) ?? false}
                        goToBusy={goToBusyComboKey === comboKey}
                        showGoToStar={showGoToStar}
                        added={addedPlayKeys?.has(comboKey) ?? false}
                        addDisabled={addDisabled}
                        onAdd={onSelect}
                        onToggleGoTo={onToggleGoTo}
                      />
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 px-4 pb-4">
                {selectedPlays.map((play) => (
                  <PlayRow key={play.play_id} play={play} onSelect={onSelect} />
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
