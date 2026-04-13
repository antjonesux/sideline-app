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
};

const BROWSE_LIMIT = 24;
const SEARCH_LIMIT = 12;

function visibleTeams<T extends { team_name: string }>(options: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return options.slice(0, BROWSE_LIMIT);
  return options.filter((o) => o.team_name.toLowerCase().includes(q)).slice(0, SEARCH_LIMIT);
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
}: TeamComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(selected?.team_name ?? "");
  const [dropUp, setDropUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const innerInputRef = useRef<HTMLInputElement>(null);
  const setInputRef = mergeRefs(innerInputRef, inputRefProp);

  useEffect(() => {
    setQuery(selected?.team_name ?? "");
  }, [selected]);

  const filtered = useMemo(() => visibleTeams(options, query), [options, query]);

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

  const showList = open && !selected && !loading;

  return (
    <div ref={rootRef} className="space-y-1">
      <span className="block text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <div className="relative">
        <div className="relative">
          <input
            ref={setInputRef}
            id={inputId}
            type="text"
            autoComplete="off"
            readOnly={!!selected}
            value={query}
            placeholder={placeholder}
            onChange={(e) => {
              const v = e.target.value;
              setQuery(v);
              onSelect(null);
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
            className="w-full rounded border border-slate-700 bg-slate-900 py-2 pl-3 pr-10"
          />
          {loading ? (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" aria-hidden>
              <span className="inline-block size-4 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-400" />
            </span>
          ) : null}
        </div>

        {showList ? (
          <div
            className={`absolute left-0 right-0 z-[200] max-h-60 overflow-y-auto rounded border border-slate-700 bg-slate-900 shadow-lg ${
              dropUp ? "bottom-full mb-1" : "top-full mt-1"
            }`}
          >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-400">
              No teams loaded yet. Seed the team tables (see repo scripts) or confirm the Film setup API can read them.
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-400">No teams match that search.</div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.team_name}
                type="button"
                className="block w-full border-b border-slate-800 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-800"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(item);
                  setQuery(item.team_name);
                  setOpen(false);
                  requestAnimationFrame(() => nextFocusRef?.current?.focus());
                }}
              >
                {item.team_name}
              </button>
            ))
          )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
