"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

export type FormationPlayValue = {
  formation: string;
  play_name: string;
  /** Single display string in the input */
  label: string;
};

type SearchFormationGroup = {
  formation: string;
  plays: { formation: string; play_name: string; formation_type: string | null; is_new_in_26: boolean | null }[];
};

type FormationPlaySearchProps = {
  myPlaybook: string;
  value: FormationPlayValue | null;
  onChange: (v: FormationPlayValue | null) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

function buildLabel(formation: string, play: string): string {
  return `${formation} → ${play}`;
}

function parseFreeform(raw: string): FormationPlayValue {
  const t = raw.trim();
  const arrow = t.split(/\s*→\s*|\s*->\s*/);
  if (arrow.length >= 2) {
    return { formation: arrow[0].trim(), play_name: arrow.slice(1).join(" → ").trim(), label: buildLabel(arrow[0].trim(), arrow.slice(1).join(" → ").trim()) };
  }
  return { formation: t, play_name: t, label: t };
}

export function FormationPlaySearch({ myPlaybook, value, onChange, inputRef }: FormationPlaySearchProps) {
  const listId = useId();
  const comboId = useId();
  const innerRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const ref = inputRef ?? innerRef;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchFormationGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const prevValueRef = useRef(value);
  useEffect(() => {
    const prev = prevValueRef.current;
    prevValueRef.current = value;
    if (value && value.label !== prev?.label) setQuery(value.label);
    else if (!value && prev) setQuery("");
  }, [value]);

  const q = query.trim();
  const searchActive = q.length >= 2;

  useEffect(() => {
    if (!myPlaybook || !open || !searchActive) {
      if (!searchActive) setGroups([]);
      return;
    }
    let ignore = false;
    setLoading(true);
    const t = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/cfb26-plays?playbook=${encodeURIComponent(myPlaybook)}&search=${encodeURIComponent(q)}`);
          const data = (await res.json()) as { grouped?: SearchFormationGroup[] };
          if (!ignore && res.ok) setGroups(data.grouped ?? []);
        } catch {
          if (!ignore) setGroups([]);
        } finally {
          if (!ignore) setLoading(false);
        }
      })();
    }, 200);
    return () => {
      ignore = true;
      clearTimeout(t);
    };
  }, [q, myPlaybook, open, searchActive]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const applyPick = useCallback(
    (formation: string, play_name: string) => {
      onChange({ formation, play_name, label: buildLabel(formation, play_name) });
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

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const flat = groups.flatMap((g) => g.plays.map((p) => ({ ...p, g: g.formation })));
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

  const filteredByKeyword = useMemo(() => {
    const needle = q.toLowerCase();
    if (!needle || !groups.length) return groups;
    return groups
      .map((g) => ({
        ...g,
        plays: g.plays.filter(
          (p) => p.formation.toLowerCase().includes(needle) || p.play_name.toLowerCase().includes(needle),
        ),
      }))
      .filter((g) => g.plays.length > 0);
  }, [groups, q]);

  return (
    <div className="relative" ref={rootRef}>
      <label htmlFor={comboId} className="app-field-label text-slate-500">
        Formation + play
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={comboId}
          type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Search formation & play..."
          className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 pr-12 font-mono text-sm text-white placeholder:text-slate-500"
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
            className="absolute bottom-0 right-0 inline-flex min-h-11 min-w-11 items-center justify-center p-2 text-slate-300 hover:text-white"
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

      {open && (searchActive || q.length > 0) ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl"
        >
          {loading ? <li className="px-3 py-2 font-sans text-xs text-slate-500">Loading…</li> : null}
          {!loading && searchActive && filteredByKeyword.length === 0 ? (
            <li className="px-3 py-2 font-sans text-xs text-slate-400">
              No matches — press Enter to use “{q}” as custom text
            </li>
          ) : null}
          {filteredByKeyword.flatMap((group) =>
            group.plays.slice(0, 64).map((row) => (
              <li key={`${row.formation}-${row.play_name}`} className="list-none">
                <button
                  type="button"
                  role="option"
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left font-mono text-sm hover:bg-slate-800"
                  onClick={() => applyPick(row.formation, row.play_name)}
                >
                  <span className="text-slate-400">{row.formation}</span>
                  <span className="text-slate-600" aria-hidden>
                    →
                  </span>
                  <span className="min-w-0 flex-1 text-white">{row.play_name}</span>
                  {row.is_new_in_26 ? (
                    <span className="shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-300">
                      NEW
                    </span>
                  ) : null}
                </button>
              </li>
            )),
          )}
        </ul>
      ) : null}
    </div>
  );
}
