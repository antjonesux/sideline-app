"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  value: string | null;
  onChange: (next: string | null) => void;
  options: string[];
  loading?: boolean;
  inputId: string;
};

const ALL_LABEL = "All Playbooks";

/** Matches `TendenciesFilters` opponent dropdown pill styling. */
function triggerPillClass(hasSelection: boolean) {
  return hasSelection
    ? "border-emerald-500/80 bg-emerald-500/15 text-emerald-200"
    : "border-slate-700 bg-slate-900/80 text-slate-400 hover:border-slate-600 hover:text-slate-200";
}

export function PlaybookFilter({ value, onChange, options, loading = false, inputId }: Props) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropUp, setDropUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const committedLabel = value ? value : ALL_LABEL;
  const hasPlaybookSelection = Boolean(value);

  const filteredPlaybooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, searchQuery]);

  const showAllRow = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return ALL_LABEL.toLowerCase().includes(q);
  }, [searchQuery]);

  const updateDropPosition = useCallback(() => {
    const el = triggerRef.current;
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

  useEffect(() => {
    if (!open) return;
    setSearchQuery("");
    updateDropPosition();
    const id = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open, updateDropPosition]);

  return (
    <div ref={rootRef} className="relative w-fit max-w-full">
      <label htmlFor={inputId} className="sr-only">
        PLAYBOOK
      </label>
      <button
        ref={triggerRef}
        id={inputId}
        type="button"
        aria-label="Filter tendencies by offensive playbook"
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`min-h-11 w-auto max-w-full appearance-none rounded-full border px-3 py-2 pe-9 text-left text-sm font-body ${triggerPillClass(hasPlaybookSelection)} inline-flex items-center`}
        onClick={() => {
          setOpen((o) => !o);
          updateDropPosition();
        }}
      >
        <span className="max-w-[14rem] truncate">{committedLabel}</span>
      </button>
      <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-slate-400" aria-hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>

      {open ? (
        <div
          role="listbox"
          className={`app-dropdown-panel absolute left-0 z-[200] max-h-72 min-w-full w-max max-w-[20rem] overflow-hidden ${
            dropUp ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          <div className="border-b border-slate-800 p-2">
            <input
              ref={searchInputRef}
              type="search"
              autoComplete="off"
              placeholder="Search playbooks"
              aria-label="Search playbook list"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setOpen(false);
                }
              }}
              className="app-input-compact w-full"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading playbooks">
                <div className="app-skeleton h-3 w-[85%]" />
                <div className="app-skeleton h-3 w-[70%]" />
                <div className="app-skeleton h-3 w-[55%]" />
              </div>
            ) : (
              <>
                {showAllRow ? (
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === null}
                    className="flex min-h-11 w-full items-center border-b border-slate-800 px-3 py-2 text-left font-body text-sm last:border-b-0 hover:bg-slate-800/80"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(null);
                      setOpen(false);
                    }}
                  >
                    {ALL_LABEL}
                  </button>
                ) : null}
                {filteredPlaybooks.map((name) => (
                  <button
                    key={name}
                    type="button"
                    role="option"
                    aria-selected={value === name}
                    className="flex min-h-11 w-full items-center border-b border-slate-800 px-3 py-2 text-left font-body text-sm last:border-b-0 hover:bg-slate-800/80"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(name);
                      setOpen(false);
                    }}
                  >
                    {name}
                  </button>
                ))}
                {filteredPlaybooks.length === 0 && !showAllRow ? (
                  <div className="px-3 py-2 font-body text-sm text-slate-400">No playbooks match that search.</div>
                ) : null}
                {options.length === 0 ? (
                  <div className="border-t border-slate-800 px-3 py-2 font-body text-sm text-slate-500">
                    Log a game with an offensive playbook to add filters here.
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
