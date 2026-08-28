"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePortalDropdown } from "@/hooks/usePortalDropdown";
import { overlayZ } from "@/lib/constants/designTokens";

type Props = {
  value: string | null;
  onChange: (next: string | null) => void;
  options: string[];
  loading?: boolean;
  inputId: string;
};

const ALL_LABEL = "All Playbooks";
const ALL_OPTION_KEY = "__all_playbooks__";

/** Matches `TendenciesFilters` opponent dropdown pill styling. */
function triggerPillClass(hasSelection: boolean) {
  return hasSelection
    ? "border-emerald-500/80 bg-emerald-500/15 text-emerald-200"
    : "border-slate-700 bg-slate-900/80 text-slate-400 hover:border-slate-600 hover:text-slate-200";
}

export function PlaybookFilter({ value, onChange, options, loading = false, inputId }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdown = usePortalDropdown(rootRef, triggerRef);

  const dedupedOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of options) {
      const name = typeof raw === "string" ? raw.trim() : "";
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(name);
    }
    return out.sort((a, b) => a.localeCompare(b));
  }, [options]);

  const committedLabel = value ? value : ALL_LABEL;
  const hasPlaybookSelection = Boolean(value);

  const filteredPlaybooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return dedupedOptions;
    return dedupedOptions.filter((o) => o.toLowerCase().includes(q));
  }, [dedupedOptions, searchQuery]);

  const showAllRow = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return ALL_LABEL.toLowerCase().includes(q);
  }, [searchQuery]);

  useEffect(() => {
    if (!dropdown.open) return;
    setSearchQuery("");
    const id = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [dropdown.open]);

  return (
    <div ref={rootRef} className="relative min-w-0 w-fit max-w-full">
      <label htmlFor={inputId} className="sr-only">
        PLAYBOOK
      </label>
      <button
        ref={triggerRef}
        id={inputId}
        type="button"
        aria-label="Filter tendencies by offensive playbook"
        aria-expanded={dropdown.open}
        aria-haspopup="listbox"
        className={`min-h-11 w-fit min-w-0 max-w-full appearance-none rounded-full border px-3 py-2 pe-9 text-left text-sm font-body ${triggerPillClass(hasPlaybookSelection)} inline-flex items-center`}
        onClick={dropdown.toggleMenu}
      >
        <span className="min-w-0 max-w-full truncate whitespace-nowrap">{committedLabel}</span>
      </button>
      <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-slate-400" aria-hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>

      {dropdown.open
        ? createPortal(
            <div
              ref={dropdown.menuRef}
              role="listbox"
              className={`flex min-h-0 min-w-0 flex-col rounded-lg border border-slate-700 bg-slate-950 text-sm shadow-lg fixed ${overlayZ.tendenciesPortalMenu} max-h-[min(18rem,calc(100dvh-2rem))] w-max max-w-[min(20rem,calc(100vw-1rem))] overflow-hidden`}
              style={{
                ...(dropdown.menuPos.top != null ? { top: dropdown.menuPos.top } : {}),
                ...(dropdown.menuPos.bottom != null ? { bottom: dropdown.menuPos.bottom } : {}),
                left: dropdown.menuPos.left,
                minWidth: dropdown.menuPos.minWidth,
              }}
            >
              <div className="shrink-0 border-b border-slate-800 p-2">
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
                      dropdown.closeMenu();
                    }
                  }}
                  className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-body text-sm text-slate-100 focus:border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 w-full"
                />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {loading ? (
                  <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading playbooks">
                    <div className="animate-pulse rounded-md bg-slate-700/55 h-3 w-[85%]" />
                    <div className="animate-pulse rounded-md bg-slate-700/55 h-3 w-[70%]" />
                    <div className="animate-pulse rounded-md bg-slate-700/55 h-3 w-[55%]" />
                  </div>
                ) : (
                  <>
                    {showAllRow ? (
                      <button
                        key={ALL_OPTION_KEY}
                        type="button"
                        role="option"
                        aria-selected={value === null}
                        className="flex min-h-11 w-full items-center border-b border-slate-800 px-3 py-2 text-left font-body text-sm last:border-b-0 hover:bg-slate-800/80"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          onChange(null);
                          dropdown.closeMenu();
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
                          dropdown.closeMenu();
                        }}
                      >
                        {name}
                      </button>
                    ))}
                    {filteredPlaybooks.length === 0 && !showAllRow ? (
                      <div className="px-3 py-2 font-body text-sm text-slate-400">No playbooks match that search.</div>
                    ) : null}
                    {dedupedOptions.length === 0 ? (
                      <div className="border-t border-slate-800 px-3 py-2 font-body text-sm text-slate-500">
                        Log a game with an offensive playbook to add filters here.
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
