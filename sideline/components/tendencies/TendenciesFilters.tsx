"use client";

import { PlaybookFilter } from "@/components/tendencies/PlaybookFilter";
import { useRef } from "react";
import { createPortal } from "react-dom";
import { usePortalDropdown } from "@/hooks/usePortalDropdown";
import { overlayZ } from "@/lib/constants/designTokens";

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

const tendenciesPortalListboxClass = `min-w-0 rounded-lg border border-slate-700 bg-slate-950 text-sm shadow-lg fixed ${overlayZ.tendenciesPortalMenu} max-h-[min(18rem,calc(100dvh-2rem))] w-max max-w-[min(20rem,calc(100vw-1rem))] overflow-y-auto`;

/** Short labels stay tight; long opponent / scope text truncates so three filters can stay one row. */
const tendenciesFilterTriggerLabelClass = "max-w-[7rem] truncate whitespace-nowrap sm:max-w-[9rem]";

function gameScopeTriggerLabel(pill: Pill, opponentTeam: string | null): string {
  if (pill === "vs" && opponentTeam?.trim()) return `vs ${opponentTeam.trim()}`;
  if (pill === "last5") return "Last 5";
  if (pill === "last10") return "Last 10";
  return "All Games";
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
  /** When false, hides the minimum-uses / "Include all" line (e.g. predictability view). */
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
  const gameScopeTriggerId = "tendencies-game-scope";
  const opponentSelectId = "tendencies-opponent-filter";
  const playbookInputId = "tendencies-playbook-filter";
  const opponentActive = Boolean(value.opponentTeam);
  const opponentPillClass = opponentActive ? pillClass(true) : pillClass(false);
  /** Emerald pill when scoped to last N games or vs opponent (same signal as PlaybookFilter / opponent trigger). */
  const gameScopePillActive = value.pill !== "all";

  const gameScopeRootRef = useRef<HTMLDivElement>(null);
  const gameScopeTriggerRef = useRef<HTMLButtonElement>(null);
  const gameScope = usePortalDropdown(gameScopeRootRef, gameScopeTriggerRef);

  const opponentRootRef = useRef<HTMLDivElement>(null);
  const opponentTriggerRef = useRef<HTMLButtonElement>(null);
  const opponent = usePortalDropdown(opponentRootRef, opponentTriggerRef);

  const gameScopeCommittedLabel = gameScopeTriggerLabel(value.pill, value.opponentTeam);

  return (
    <div className="space-y-2">
      <div className="flex min-w-0 flex-nowrap items-center gap-1.5 sm:gap-2">
        <div ref={gameScopeRootRef} className="relative w-fit max-w-full shrink-0">
          <label htmlFor={gameScopeTriggerId} className="sr-only">
            Game range
          </label>
          <button
            ref={gameScopeTriggerRef}
            id={gameScopeTriggerId}
            type="button"
            aria-label="Game range"
            aria-expanded={gameScope.open}
            aria-haspopup="listbox"
            className={`min-h-11 w-max max-w-full appearance-none rounded-full border px-3 py-2 pe-9 text-left text-sm font-body ${pillClass(gameScopePillActive)} inline-flex items-center`}
            onClick={gameScope.toggleMenu}
          >
            <span className={tendenciesFilterTriggerLabelClass}>{gameScopeCommittedLabel}</span>
          </button>
          <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-slate-400" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
          {gameScope.open
            ? createPortal(
                <div
                  ref={gameScope.menuRef}
                  role="listbox"
                  aria-label="Game range options"
                  className={tendenciesPortalListboxClass}
                  style={{
                    ...(gameScope.menuPos.top != null ? { top: gameScope.menuPos.top } : {}),
                    ...(gameScope.menuPos.bottom != null ? { bottom: gameScope.menuPos.bottom } : {}),
                    left: gameScope.menuPos.left,
                    minWidth: gameScope.menuPos.minWidth,
                  }}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={value.pill === "all"}
                    className="flex min-h-11 w-full items-center border-b border-slate-800 px-3 py-2 text-left font-body text-sm hover:bg-slate-800/80"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setPill("all");
                      gameScope.closeMenu();
                    }}
                  >
                    All Games
                  </button>
                  <button
                    type="button"
                    role="option"
                    aria-selected={value.pill === "last5"}
                    className="flex min-h-11 w-full items-center border-b border-slate-800 px-3 py-2 text-left font-body text-sm hover:bg-slate-800/80"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setPill("last5");
                      gameScope.closeMenu();
                    }}
                  >
                    Last 5
                  </button>
                  <button
                    type="button"
                    role="option"
                    aria-selected={value.pill === "last10"}
                    className="flex min-h-11 w-full items-center border-b border-slate-800 px-3 py-2 text-left font-body text-sm last:border-b-0 hover:bg-slate-800/80"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setPill("last10");
                      gameScope.closeMenu();
                    }}
                  >
                    Last 10
                  </button>
                </div>,
                document.body,
              )
            : null}
        </div>
        <div ref={opponentRootRef} className="relative w-fit max-w-full shrink-0">
          <label htmlFor={opponentSelectId} className="sr-only">
            OPPONENT
          </label>
          <button
            ref={opponentTriggerRef}
            id={opponentSelectId}
            type="button"
            aria-label="Filter by opponent"
            aria-expanded={opponent.open}
            aria-haspopup="listbox"
            disabled={opponents.length === 0}
            className={`min-h-11 w-max max-w-full appearance-none rounded-full border px-3 py-2 pe-9 text-left text-sm font-body ${opponentPillClass} inline-flex items-center disabled:cursor-not-allowed disabled:opacity-70`}
            onClick={opponent.toggleMenu}
          >
            <span className={tendenciesFilterTriggerLabelClass}>{value.opponentTeam ?? "vs Opponent"}</span>
          </button>
          <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-slate-400" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
          {opponent.open
            ? createPortal(
                <div
                  ref={opponent.menuRef}
                  role="listbox"
                  className={tendenciesPortalListboxClass}
                  style={{
                    ...(opponent.menuPos.top != null ? { top: opponent.menuPos.top } : {}),
                    ...(opponent.menuPos.bottom != null ? { bottom: opponent.menuPos.bottom } : {}),
                    left: opponent.menuPos.left,
                    minWidth: opponent.menuPos.minWidth,
                  }}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={value.opponentTeam === null}
                    className="flex min-h-11 w-full items-center border-b border-slate-800 px-3 py-2 text-left font-body text-sm hover:bg-slate-800/80"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange({ ...value, pill: "all", opponentTeam: null });
                      opponent.closeMenu();
                    }}
                  >
                    vs Opponent
                  </button>
                  {opponents.map((opp) => (
                    <button
                      key={opp}
                      type="button"
                      role="option"
                      aria-selected={value.opponentTeam === opp}
                      className="flex min-h-11 w-full items-center border-b border-slate-800 px-3 py-2 text-left font-body text-sm last:border-b-0 hover:bg-slate-800/80"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onChange({ ...value, pill: "vs", opponentTeam: opp });
                        opponent.closeMenu();
                      }}
                    >
                      {opp}
                    </button>
                  ))}
                </div>,
                document.body,
              )
            : null}
        </div>
        <div className="flex min-w-0 flex-1 basis-0 justify-start">
          <PlaybookFilter
            inputId={playbookInputId}
            value={playbook}
            onChange={onPlaybookChange}
            options={playbookOptions}
            loading={playbookLoading}
          />
        </div>
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
