"use client";

import { PlaybookFilter } from "@/components/tendencies/PlaybookFilter";
import { useEffect, useRef, useState } from "react";

type Pill = "all" | "last5" | "last10" | "vs";

export type TendenciesScopeParams = {
  pill: Pill;
  opponentTeam: string | null;
  minUses: number;
};

export type TendenciesFilterParams = TendenciesScopeParams & {
  playbook: string | null;
};

function pillClass(active: boolean) {
  return active
    ? "border-emerald-500/80 bg-emerald-500/15 text-emerald-200"
    : "border-slate-700 bg-slate-900/80 text-slate-400 hover:border-slate-600 hover:text-slate-200";
}

export function buildTendenciesQueryString(f: TendenciesFilterParams): string {
  const sp = new URLSearchParams();
  if (f.pill === "last5") sp.set("scope", "last5");
  else if (f.pill === "last10") sp.set("scope", "last10");
  else if (f.pill === "vs" && f.opponentTeam) {
    sp.set("scope", "opponent");
    sp.set("opponent", f.opponentTeam);
  } else sp.set("scope", "all");
  sp.set("min_uses", String(f.minUses));
  if (f.playbook?.trim()) sp.set("playbook", f.playbook.trim());
  return sp.toString();
}

type Props = {
  value: TendenciesScopeParams;
  onChange: (next: TendenciesScopeParams) => void;
  opponents: string[];
  playbook: string | null;
  onPlaybookChange: (next: string | null) => void;
  playbookOptions: string[];
  playbookLoading?: boolean;
  /** When false, hides the minimum-uses / “Include all” line (e.g. predictability view). */
  showMinUsesLine?: boolean;
};

export function TendenciesFilters({
  value,
  onChange,
  opponents,
  playbook,
  onPlaybookChange,
  playbookOptions,
  playbookLoading = false,
  showMinUsesLine = true,
}: Props) {
  const setPill = (pill: Pill) => onChange({ ...value, pill, opponentTeam: pill === "vs" ? value.opponentTeam : null });
  const opponentSelectId = "tendencies-opponent-filter";
  const playbookInputId = "tendencies-playbook-filter";
  const opponentActive = Boolean(value.opponentTeam);
  const opponentPillClass = opponentActive ? pillClass(true) : pillClass(false);
  const [opponentOpen, setOpponentOpen] = useState(false);
  const [opponentDropUp, setOpponentDropUp] = useState(false);
  const opponentRootRef = useRef<HTMLDivElement>(null);
  const opponentTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!opponentRootRef.current?.contains(e.target as Node)) setOpponentOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!opponentOpen) return;
    const el = opponentTriggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setOpponentDropUp(spaceBelow < 220);
  }, [opponentOpen]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={`min-h-11 rounded-full border px-3 py-2 text-sm font-body ${pillClass(value.pill === "all")}`} onClick={() => setPill("all")}>
          All Games
        </button>
        <button type="button" className={`min-h-11 rounded-full border px-3 py-2 text-sm font-body ${pillClass(value.pill === "last5")}`} onClick={() => setPill("last5")}>
          Last 5
        </button>
        <button type="button" className={`min-h-11 rounded-full border px-3 py-2 text-sm font-body ${pillClass(value.pill === "last10")}`} onClick={() => setPill("last10")}>
          Last 10
        </button>
        <div ref={opponentRootRef} className="relative w-fit max-w-full">
          <label htmlFor={opponentSelectId} className="sr-only">
            OPPONENT
          </label>
          <button
            ref={opponentTriggerRef}
            id={opponentSelectId}
            type="button"
            aria-label="Filter by opponent"
            aria-expanded={opponentOpen}
            aria-haspopup="listbox"
            disabled={opponents.length === 0}
            className={`min-h-11 w-auto max-w-full appearance-none rounded-full border px-3 py-2 pe-9 text-left text-sm font-body ${opponentPillClass} inline-flex items-center disabled:cursor-not-allowed disabled:opacity-70`}
            onClick={() => setOpponentOpen((o) => !o)}
          >
            <span className="max-w-[14rem] truncate">{value.opponentTeam ?? "vs Opponent"}</span>
          </button>
          <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-slate-400" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
          {opponentOpen ? (
            <div
              role="listbox"
              className={`app-dropdown-panel absolute left-0 z-[200] max-h-72 min-w-full w-max max-w-[20rem] overflow-y-auto ${
                opponentDropUp ? "bottom-full mb-1" : "top-full mt-1"
              }`}
            >
              <button
                type="button"
                role="option"
                aria-selected={value.opponentTeam === null}
                className="flex min-h-11 w-full items-center border-b border-slate-800 px-3 py-2 text-left font-body text-sm hover:bg-slate-800/80"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange({ ...value, pill: "all", opponentTeam: null });
                  setOpponentOpen(false);
                }}
              >
                vs Opponent
              </button>
              {opponents.map((opponent) => (
                <button
                  key={opponent}
                  type="button"
                  role="option"
                  aria-selected={value.opponentTeam === opponent}
                  className="flex min-h-11 w-full items-center border-b border-slate-800 px-3 py-2 text-left font-body text-sm last:border-b-0 hover:bg-slate-800/80"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange({ ...value, pill: "vs", opponentTeam: opponent });
                    setOpponentOpen(false);
                  }}
                >
                  {opponent}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <PlaybookFilter
          inputId={playbookInputId}
          value={playbook}
          onChange={onPlaybookChange}
          options={playbookOptions}
          loading={playbookLoading}
        />
      </div>
      {showMinUsesLine ? (
        <p className="font-sans text-xs text-slate-500">
          At least {value.minUses} calls per row.{" "}
          {value.minUses > 1 ? (
            <button type="button" className="min-h-11 text-emerald-400/90 underline-offset-2 hover:underline" onClick={() => onChange({ ...value, minUses: 1 })}>
              Show all
            </button>
          ) : (
            <button type="button" className="min-h-11 text-emerald-400/90 underline-offset-2 hover:underline" onClick={() => onChange({ ...value, minUses: 3 })}>
              3+ calls (default)
            </button>
          )}
        </p>
      ) : null}
    </div>
  );
}
