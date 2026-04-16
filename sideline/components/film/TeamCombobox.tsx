"use client";

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

  const filtered = useMemo(() => visibleTeams(options, filterText, optionSearchText), [options, filterText, optionSearchText]);

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
  const showList = open;

  return (
    <div ref={rootRef} className="space-y-1">
      <span className="app-field-label block">{label}</span>
      <div className="relative">
        <div className="relative">
          <input
            ref={setInputRef}
            id={inputId}
            name={inputId}
            type="text"
            autoComplete="off"
            value={inputValue}
            placeholder={placeholder}
            onChange={(e) => {
              const v = e.target.value;
              setFilterText(v);
              if (selected) onSelect(null);
              setOpen(true);
              updateDropPosition();
            }}
            onFocus={(e) => {
              e.target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
              setOpen(true);
              updateDropPosition();
            }}
            onClick={() => {
              if (!selected) setOpen(true);
              updateDropPosition();
            }}
            className={`hs-input app-input py-2.5 ps-3 read-only:cursor-default ${showTrailingChevron ? "pe-10" : "pe-3"}`}
          />
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
                className={`accordion-chevron text-current ${open ? "open" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          ) : null}
        </div>

        {showList ? (
          <div
            className={`app-dropdown-panel absolute left-0 right-0 z-[200] max-h-60 overflow-y-auto ${
              dropUp ? "bottom-full mb-1" : "top-full mt-1"
            }`}
          >
            {loading ? (
              <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading teams">
                <div className="app-skeleton h-3 w-[85%]" />
                <div className="app-skeleton h-3 w-[70%]" />
                <div className="app-skeleton h-3 w-[55%]" />
              </div>
            ) : options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400">
                No teams returned from Supabase. In ./sideline run npm run seed:teams (service role in .env.local), or check the browser Network tab for failed PostgREST requests.
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400">No teams match that search.</div>
            ) : (
              filtered.map((item) => (
                <button
                  key={optionKey(item)}
                  type="button"
                  className="flex min-h-11 w-full items-center border-b border-slate-800 px-3 py-2 text-left font-body text-sm last:border-b-0 hover:bg-slate-800/80"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(item);
                    setFilterText("");
                    setOpen(false);
                    requestAnimationFrame(() => nextFocusRef?.current?.focus());
                  }}
                >
                  {optionLabel(item)}
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
