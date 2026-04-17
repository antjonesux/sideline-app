"use client";

import { comboKey } from "@/lib/loggedPlayStats";
import { dedupePlaysByDisplayInFormation, normalizePlayLabel } from "@/lib/normalizePlayLabel";
import { matchesFormationPlaySearch } from "@/lib/matchesFormationPlaySearch";
import { normalizePlayName } from "@/lib/utils";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

export type FormationPlayResultRow = {
  formation: string;
  play_name: string;
  formation_type?: string | null;
  is_new_in_26?: boolean | null;
};

export type ScenarioComboStats = { uses: number; avg_yards: number; success_rate: number };

export type FormationPlayValue = {
  formation: string;
  play_name: string;
  /** Single display string in the input */
  label: string;
};

export type FormationPlaySearchResultsGroupedProps = {
  sortedFormationNames: string[];
  grouped: Map<string, FormationPlayResultRow[]>;
  scenarioStats: Record<string, ScenarioComboStats>;
  formationStats: Record<string, { uses: number; success_rate: number }>;
  showAccordionBrowse: boolean;
  expandedFormations: Set<string>;
  onToggleFormation: (name: string) => void;
  onPick: (formation: string, playName: string) => void;
  loading?: boolean;
  /** Extra classes on the outer `<ul>` (e.g. max-height for combobox). */
  listClassName?: string;
  /** When true, render nothing if there are no rows (parent shows its own empty copy). */
  hideWhenEmpty?: boolean;
};

/**
 * Grouped formation → plays list — shared by Play Logger search and Add Play drawer.
 */
export function FormationPlaySearchResultsGrouped({
  sortedFormationNames,
  grouped,
  scenarioStats,
  formationStats,
  showAccordionBrowse,
  expandedFormations,
  onToggleFormation,
  onPick,
  loading,
  listClassName = "",
  hideWhenEmpty = false,
}: FormationPlaySearchResultsGroupedProps) {
  if (loading) {
    return (
      <div className="p-3 font-body text-xs text-slate-500" aria-busy="true">
        Loading…
      </div>
    );
  }

  if (sortedFormationNames.length === 0) {
    if (hideWhenEmpty) return null;
    return <p className="p-3 font-body text-sm text-slate-500">No plays match this search.</p>;
  }

  return (
    <ul className={`space-y-1 ${listClassName}`.trim()}>
      {sortedFormationNames.map((formationName) => {
        const plays = dedupePlaysByDisplayInFormation(grouped.get(formationName) ?? [], formationName);
        const fs = formationStats[formationName];
        const sub =
          fs && fs.uses > 0 ? (
            <span className="font-mono text-[11px] font-normal text-[#A0A3AD]">
              {fs.uses} uses
              <span className="mx-1 text-slate-600">·</span>
              {fs.success_rate}% success
            </span>
          ) : (
            <span className="font-mono text-[11px] font-normal text-[#A0A3AD]">No data yet</span>
          );
        const isOpen = !showAccordionBrowse || expandedFormations.has(formationName);
        return (
          <li key={formationName} className="rounded-lg border border-slate-800 bg-slate-900/80 dark:border-slate-800 dark:bg-slate-900/80">
            <button
              type="button"
              className="flex w-full min-h-11 items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-slate-800/50 active:bg-slate-800/50"
              onClick={() => {
                if (showAccordionBrowse) onToggleFormation(formationName);
              }}
              aria-expanded={isOpen}
            >
              <span className="min-w-0 font-body text-[14px] font-normal text-[#F5F5F0]">{formationName}</span>
              <span className="flex shrink-0 items-center gap-2">
                {sub}
                {showAccordionBrowse ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`shrink-0 text-slate-500 transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                ) : null}
              </span>
            </button>
            {isOpen ? (
              <ul className="border-t border-slate-800/90 py-1 dark:border-slate-800/90">
                {plays.map((p) => {
                  const ck = comboKey(formationName, p.play_name);
                  const st = scenarioStats[ck] ?? null;
                  const newBadge = !st || st.uses === 0;
                  const displayName = normalizePlayLabel(p.play_name, formationName);
                  return (
                    <li key={`${formationName}-${normalizePlayName(p.play_name)}`}>
                      <button
                        type="button"
                        className="flex min-h-11 w-full flex-col items-start px-3 py-2 text-left transition-colors hover:bg-slate-800/40 active:bg-slate-800/50"
                        onClick={() => onPick(formationName, p.play_name)}
                      >
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="font-mono text-[12px] font-medium uppercase text-white">{displayName}</span>
                          {newBadge ? (
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] uppercase text-slate-400 dark:bg-slate-800">
                              New
                            </span>
                          ) : null}
                        </div>
                        {st && st.uses > 0 ? (
                          <span className="mt-1 text-[10px] text-slate-500">
                            <span className="font-mono">{st.uses}</span>
                            <span className="font-body ml-1">uses</span>
                            <span className="mx-1 text-slate-600">·</span>
                            <span className="font-mono">{st.avg_yards.toFixed(1)}</span>
                            <span className="font-body ml-1">yds</span>
                            <span className="mx-1 text-slate-600">·</span>
                            <span className="font-mono">{st.success_rate}%</span>
                          </span>
                        ) : (
                          <span className="mt-1 font-body text-[10px] text-slate-500">No logged data</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

type SearchFormationGroup = {
  formation: string;
  plays: FormationPlayResultRow[];
};

export type FormationPlayDataSource =
  | { type: "api"; playbook: string }
  | { type: "local"; plays: FormationPlayResultRow[]; loading?: boolean };

type FormationPlaySearchProps = {
  dataSource: FormationPlayDataSource;
  /** `dropdown` = play logger overlay; `stacked` = add-play drawer (inline list). */
  resultsLayout?: "dropdown" | "stacked";
  value: FormationPlayValue | null;
  onChange: (v: FormationPlayValue | null) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  scenarioStats: Record<string, ScenarioComboStats>;
  formationStats: Record<string, { uses: number; success_rate: number }>;
};

function buildLabel(formation: string, play: string): string {
  return `${formation} → ${normalizePlayName(play)}`;
}

function parseFreeform(raw: string): FormationPlayValue {
  const t = raw.trim();
  const arrow = t.split(/\s*→\s*|\s*->\s*/);
  if (arrow.length >= 2) {
    const formation = arrow[0].trim();
    const playRaw = arrow.slice(1).join(" → ").trim();
    const play_name = normalizePlayName(playRaw);
    return {
      formation,
      play_name,
      label: buildLabel(formation, playRaw),
    };
  }
  const play_name = normalizePlayName(t);
  return { formation: t, play_name, label: play_name };
}

function groupsToMap(groups: SearchFormationGroup[]): Map<string, FormationPlayResultRow[]> {
  const m = new Map<string, FormationPlayResultRow[]>();
  for (const g of groups) {
    m.set(g.formation, g.plays);
  }
  return m;
}

function groupRowsByFormation(rows: FormationPlayResultRow[]): Map<string, FormationPlayResultRow[]> {
  const raw = new Map<string, FormationPlayResultRow[]>();
  for (const row of rows) {
    const f = row.formation?.trim() || "Other";
    if (!raw.has(f)) raw.set(f, []);
    raw.get(f)!.push({ ...row, formation: f });
  }
  const out = new Map<string, FormationPlayResultRow[]>();
  for (const [f, list] of raw) {
    const deduped = dedupePlaysByDisplayInFormation(list, f);
    deduped.sort((a, b) => a.play_name.localeCompare(b.play_name));
    out.set(f, deduped);
  }
  return out;
}

function filterLocalPlaysByQuery(plays: FormationPlayResultRow[], q: string): FormationPlayResultRow[] {
  if (!q) return plays;
  return plays.filter((r) => matchesFormationPlaySearch(q, r.formation, r.play_name));
}

/** Play Logger combobox + Add Play drawer — same grouped list UI. */
export function FormationPlaySearch({
  dataSource,
  resultsLayout = "dropdown",
  value,
  onChange,
  inputRef,
  scenarioStats,
  formationStats,
}: FormationPlaySearchProps) {
  const listId = useId();
  const comboId = useId();
  const innerRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const ref = inputRef ?? innerRef;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchFormationGroup[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [expandedFormations, setExpandedFormations] = useState<Set<string>>(() => new Set());

  const isLocal = dataSource.type === "local";
  const myPlaybook = dataSource.type === "api" ? dataSource.playbook : "";
  const localLoading = isLocal ? Boolean(dataSource.loading) : false;

  const prevValueRef = useRef(value);
  useEffect(() => {
    const prev = prevValueRef.current;
    prevValueRef.current = value;
    if (value && value.label !== prev?.label) setQuery(value.label);
    else if (!value && prev) setQuery("");
  }, [value]);

  const q = query.trim();
  const searchActive = q.length >= 2;
  const showAccordionBrowse = isLocal && q.length === 0;

  useEffect(() => {
    if (isLocal || !myPlaybook || !open || !searchActive) {
      if (!isLocal && !searchActive) setGroups([]);
      return;
    }
    let ignore = false;
    setApiLoading(true);
    const t = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/cfb26-plays?playbook=${encodeURIComponent(myPlaybook)}&search=${encodeURIComponent(q)}`, {
            cache: "no-store",
          });
          const data = (await res.json()) as { grouped?: SearchFormationGroup[] };
          if (!ignore && res.ok) setGroups(data.grouped ?? []);
        } catch {
          if (!ignore) setGroups([]);
        } finally {
          if (!ignore) setApiLoading(false);
        }
      })();
    }, 200);
    return () => {
      ignore = true;
      clearTimeout(t);
    };
  }, [q, myPlaybook, open, searchActive, isLocal]);

  const toggleFormation = useCallback((name: string) => {
    setExpandedFormations((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  useEffect(() => {
    if (resultsLayout === "stacked" || !open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, resultsLayout]);

  const applyPick = useCallback(
    (formation: string, play_name: string) => {
      const pn = normalizePlayName(play_name);
      onChange({ formation, play_name: pn, label: buildLabel(formation, play_name) });
      setQuery(buildLabel(formation, play_name));
      setOpen(false);
      setGroups([]);
    },
    [onChange],
  );

  const commitFreeform = useCallback(() => {
    const parsed = parseFreeform(query);
    onChange(parsed);
    setOpen(false);
  }, [query, onChange]);

  const filteredByKeyword = useMemo(() => {
    if (!q || !groups.length) return groups;
    return groups
      .map((g) => ({
        ...g,
        plays: g.plays.filter((p) => matchesFormationPlaySearch(q, p.formation, p.play_name)),
      }))
      .filter((g) => g.plays.length > 0);
  }, [groups, q]);

  const localPlays = isLocal ? dataSource.plays : [];
  const localGroupedMap = useMemo(() => {
    if (!isLocal) return new Map<string, FormationPlayResultRow[]>();
    return groupRowsByFormation(filterLocalPlaysByQuery(localPlays, q));
  }, [isLocal, localPlays, q]);

  const apiGroupedMap = useMemo(() => groupsToMap(filteredByKeyword), [filteredByKeyword]);
  const groupedMap = isLocal ? localGroupedMap : apiGroupedMap;

  const sortedFormationNames = useMemo(
    () => [...groupedMap.keys()].sort((a, b) => a.localeCompare(b)),
    [groupedMap],
  );

  const searchExpandedAll = useMemo(() => new Set(sortedFormationNames), [sortedFormationNames]);
  const expandedForList = showAccordionBrowse ? expandedFormations : searchExpandedAll;

  const loading = isLocal ? localLoading : apiLoading;

  const flatPlaysFromMap = useCallback((m: Map<string, FormationPlayResultRow[]>) => {
    return [...m.entries()].flatMap(([formation, plays]) =>
      plays.map((p) => ({ formation, play_name: p.play_name })),
    );
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const flat = flatPlaysFromMap(groupedMap);
      const exact = flat.find((p) => p.play_name.toLowerCase() === q.toLowerCase());
      if (flat.length === 1) {
        const p = flat[0];
        applyPick(p.formation, p.play_name);
        return;
      }
      if (exact) {
        applyPick(exact.formation, exact.play_name);
        return;
      }
      commitFreeform();
    }
  };

  const showDropdownPanel = resultsLayout === "dropdown" && open && (searchActive || q.length > 0);
  const showStackedPanel = resultsLayout === "stacked";

  const resultsGrouped = (
    <FormationPlaySearchResultsGrouped
      sortedFormationNames={sortedFormationNames}
      grouped={groupedMap}
      scenarioStats={scenarioStats}
      formationStats={formationStats}
      showAccordionBrowse={showAccordionBrowse}
      expandedFormations={expandedForList}
      onToggleFormation={toggleFormation}
      onPick={(formation, playName) => applyPick(formation, playName)}
      loading={loading}
      listClassName={resultsLayout === "dropdown" ? "px-1 pb-1" : "px-1 pb-4"}
      hideWhenEmpty={resultsLayout === "dropdown"}
    />
  );

  return (
    <div
      className={resultsLayout === "stacked" ? "flex min-h-0 flex-1 flex-col" : "relative"}
      ref={rootRef}
    >
      <label htmlFor={comboId} className="app-field-label mb-1 block text-slate-500">
        FORMATION + PLAY
      </label>
      <div className="relative shrink-0">
        <input
          ref={ref}
          id={comboId}
          type="text"
          role="combobox"
          aria-expanded={resultsLayout === "dropdown" ? open : false}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Search formation and play…"
          className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 pr-12 font-mono text-sm text-white placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:placeholder:text-slate-500"
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            setOpen(true);
            if (v === "") onChange(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {query.trim().length > 0 ? (
          <button
            type="button"
            aria-label="Clear formation and play search"
            className="absolute bottom-0 right-0 inline-flex min-h-11 min-w-11 items-center justify-center p-2 text-slate-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            onClick={() => {
              setQuery("");
              onChange(null);
              setOpen(true);
              ref.current?.focus();
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </div>

      {showAccordionBrowse && resultsLayout === "stacked" ? (
        <p className="mt-2 font-body text-xs text-slate-500">Tap a formation to expand plays, or type to search.</p>
      ) : null}

      {showDropdownPanel ? (
        <div
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-[min(70vh,28rem)] w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 py-2 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          {!loading && searchActive && !isLocal && filteredByKeyword.length === 0 ? (
            <p className="px-3 py-2 font-body text-xs text-slate-400">
              No matches — press Enter to use &quot;{q}&quot; as custom text
            </p>
          ) : null}
          {!loading && searchActive && isLocal && sortedFormationNames.length === 0 ? (
            <p className="px-3 py-2 font-body text-xs text-slate-400">
              No matches — press Enter to use &quot;{q}&quot; as custom text
            </p>
          ) : null}
          {resultsGrouped}
        </div>
      ) : null}

      {showStackedPanel ? (
        <div id={listId} className="mt-2 min-h-0 flex-1 overflow-y-auto" role="listbox">
          {!loading && isLocal && localPlays.length === 0 ? (
            <p className="px-1 py-2 font-body text-sm text-slate-500">No plays loaded.</p>
          ) : null}
          {loading && isLocal ? (
            <div className="space-y-2 p-1" aria-busy="true" aria-label="Loading plays">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="app-skeleton h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            resultsGrouped
          )}
        </div>
      ) : null}
    </div>
  );
}
