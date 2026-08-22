"use client";

import { overlayZ } from "@/lib/constants/designTokens";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (node: T | null) => {
    refs.forEach((r) => {
      if (!r) return;
      if (typeof r === "function") (r as (instance: T | null) => void)(node);
      else (r as React.MutableRefObject<T | null>).current = node;
    });
  };
}

type TeamComboboxProps<T extends { team_name: string }> = {
  label: string;
  selected: T | null;
  onSelect: (item: T | null) => void;
  options: T[];
  loading?: boolean;
  placeholder?: string;
  /** Focus this element after a list selection (e.g. next field). */
  nextFocusRef?: React.RefObject<HTMLElement | null>;
  inputId?: string;
  /** Exposes the inner text input (e.g. so another combobox can focus it after selection). */
  inputRef?: React.RefObject<HTMLInputElement | null>;
  getOptionLabel?: (item: T) => string;
  getSearchText?: (item: T) => string;
  /** Stable React key for list rows (defaults to `team_name`). */
  getOptionKey?: (item: T) => string;
  /** When false, no chevron on the input (e.g. Playbook tab comboboxes). Default true for Film flows. */
  showTrailingChevron?: boolean;
  /** Controls whether focusing the input should auto-open options. */
  openOnFocus?: boolean;
  /** Coach-facing message when `options` is empty (replaces the default dev hint). */
  emptyOptionsMessage?: string;
  /** When true, the input cannot be edited or opened. */
  disabled?: boolean;
  /** Group dropdown rows under section headers (e.g. team vs generic playbooks). */
  getOptionSection?: (item: T) => string;
  optionSections?: { id: string; label: string }[];
  /**
   * Recently used teams surfaced above the full list (recency only — never pre-selected).
   * Ignored when empty. Other TeamCombobox callers can omit this.
   */
  recentOptions?: T[];
};

function visibleTeams<T extends { team_name: string }>(
  options: T[],
  query: string,
  getSearchText: (item: T) => string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter((o) => getSearchText(o).toLowerCase().includes(q));
}

export function TeamCombobox<T extends { team_name: string }>({
  label,
  selected,
  onSelect,
  options,
  loading = false,
  placeholder = "Search team",
  nextFocusRef,
  inputId,
  inputRef: inputRefProp,
  getOptionLabel,
  getSearchText,
  getOptionKey,
  showTrailingChevron = true,
  openOnFocus = true,
  emptyOptionsMessage,
  disabled = false,
  getOptionSection,
  optionSections,
  recentOptions,
}: TeamComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const optionKey = useCallback((item: T) => getOptionKey?.(item) ?? item.team_name ?? "", [getOptionKey]);
  const optionLabel = useCallback((item: T) => getOptionLabel?.(item) ?? item.team_name ?? "", [getOptionLabel]);
  const optionSearchText = useCallback((item: T) => getSearchText?.(item) ?? optionLabel(item), [getSearchText, optionLabel]);
  const inputValue = filterText !== "" ? filterText : selected ? optionLabel(selected) : "";
  const [dropUp, setDropUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const innerInputRef = useRef<HTMLInputElement>(null);
  const setInputRef = mergeRefs(innerInputRef, inputRefProp);

  const filteredRecent = useMemo(() => {
    if (!recentOptions?.length) return [];
    return visibleTeams(recentOptions, filterText, optionSearchText);
  }, [recentOptions, filterText, optionSearchText]);

  const recentKeys = useMemo(
    () => new Set(filteredRecent.map((item) => optionKey(item))),
    [filteredRecent, optionKey],
  );

  const filtered = useMemo(() => {
    const base = visibleTeams(options, filterText, optionSearchText);
    if (recentKeys.size === 0) return base;
    return base.filter((item) => !recentKeys.has(optionKey(item)));
  }, [options, filterText, optionSearchText, recentKeys, optionKey]);

  const groupedFiltered = useMemo(() => {
    if (!getOptionSection || !optionSections?.length) return null;
    const buckets = new Map<string, T[]>();
    for (const section of optionSections) buckets.set(section.id, []);
    const fallbackId = optionSections[0]?.id ?? "default";
    for (const item of filtered) {
      const sectionId = getOptionSection(item);
      const bucket = buckets.get(sectionId) ?? buckets.get(fallbackId);
      if (bucket) bucket.push(item);
    }
    return optionSections
      .map((section) => ({ ...section, items: buckets.get(section.id) ?? [] }))
      .filter((section) => section.items.length > 0);
  }, [filtered, getOptionSection, optionSections]);

  const pickOption = useCallback(
    (item: T) => {
      onSelect(item);
      setFilterText("");
      setOpen(false);
      requestAnimationFrame(() => nextFocusRef?.current?.focus());
    },
    [onSelect, nextFocusRef],
  );

  const renderOptionButton = useCallback(
    (item: T) => (
      <button
        key={optionKey(item)}
        type="button"
        className="flex min-h-11 w-full items-center border-b border-slate-800 px-3 py-2 text-left font-body text-sm last:border-b-0 hover:bg-slate-800/80"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => pickOption(item)}
      >
        {optionLabel(item)}
      </button>
    ),
    [optionKey, optionLabel, pickOption],
  );

  const updateDropPosition = useCallback(() => {
    const el = innerInputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setDropUp(spaceBelow < 220);
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  /** Dropdown only after explicit focus/click; loading fills the panel while open without closing. */
  const showList = open && !disabled;

  return (
    <div ref={rootRef} className="space-y-1">
      <span className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500 block">{label}</span>
      <div className="relative">
        <div className="relative">
          <input
            ref={setInputRef}
            id={inputId}
            name={inputId}
            type="text"
            autoComplete="off"
            disabled={disabled}
            value={inputValue}
            placeholder={placeholder}
            onChange={(e) => {
              if (disabled) return;
              const v = e.target.value;
              setFilterText(v);
              if (selected) onSelect(null);
              setOpen(true);
              updateDropPosition();
            }}
            onFocus={(e) => {
              if (disabled) return;
              e.target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
              if (openOnFocus) {
                setOpen(true);
                updateDropPosition();
              } else {
                // Keep list closed on programmatic focus (e.g. dialog open) and clear stale open state.
                setOpen(false);
              }
            }}
            onClick={() => {
              if (disabled) return;
              if (!selected) setOpen(true);
              updateDropPosition();
            }}
            className={`hs-input block w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 ps-3 font-body text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 read-only:cursor-default disabled:cursor-not-allowed disabled:opacity-60 ${showTrailingChevron ? "pe-20" : "pe-12"}`}
          />
          {inputValue.trim().length > 0 ? (
            <button
              type="button"
              aria-label={`Clear ${label}`}
              className={`absolute inset-y-0 ${showTrailingChevron ? "right-7" : "right-0"} inline-flex min-h-11 min-w-11 items-center justify-center p-2 text-slate-300 hover:text-white`}
              onClick={() => {
                setFilterText("");
                onSelect(null);
                setOpen(true);
                innerInputRef.current?.focus();
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          ) : null}
          {showTrailingChevron ? (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 inline-flex items-center pr-3 text-slate-400"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`text-current transition-transform duration-200 ease-out ${open ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          ) : null}
        </div>

        {showList ? (
          <div
            className={`min-w-[10rem] rounded-lg border border-slate-700 bg-slate-950 text-sm shadow-lg absolute left-0 right-0 ${overlayZ.filmBackdrop} max-h-60 overflow-y-auto ${
              dropUp ? "bottom-full mb-1" : "top-full mt-1"
            }`}
          >
            {loading ? (
              <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading teams">
                <div className="animate-pulse rounded-md bg-slate-700/55 h-3 w-[85%]" />
                <div className="animate-pulse rounded-md bg-slate-700/55 h-3 w-[70%]" />
                <div className="animate-pulse rounded-md bg-slate-700/55 h-3 w-[55%]" />
              </div>
            ) : options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400">
                {emptyOptionsMessage ??
                  "No teams returned from Supabase. In ./sideline run npm run seed:teams (service role in .env.local), or check the browser Network tab for failed PostgREST requests."}
              </div>
            ) : filtered.length === 0 && filteredRecent.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400">No teams match that search.</div>
            ) : (
              <>
                {filteredRecent.length > 0 ? (
                  <div>
                    <div className="sticky top-0 border-b border-slate-800 bg-slate-900/95 px-3 py-1.5 font-sans text-[10px] font-normal uppercase tracking-widest text-slate-500">
                      Recent
                    </div>
                    {filteredRecent.map((item) => renderOptionButton(item))}
                  </div>
                ) : null}
                {groupedFiltered ? (
                  groupedFiltered.map((section) => (
                    <div key={section.id}>
                      <div className="sticky top-0 border-b border-slate-800 bg-slate-900/95 px-3 py-1.5 font-sans text-[10px] font-normal uppercase tracking-widest text-slate-500">
                        {section.label}
                      </div>
                      {section.items.map((item) => renderOptionButton(item))}
                    </div>
                  ))
                ) : (
                  filtered.map((item) => renderOptionButton(item))
                )}
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
