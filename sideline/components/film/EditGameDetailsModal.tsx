"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { TeamCombobox } from "@/components/film/TeamCombobox";
import { COULDNT_SAVE } from "@/lib/coachCopy";
import type { GameSession } from "@/lib/types";
import { useScrollLock } from "@/lib/useScrollLock";
import { supabase } from "@/lib/supabase";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useToastStore } from "@/store/toastStore";

type OffensiveTeam = { team_name: string; playbook_name: string; scheme_style: string };
type DefensiveTeam = { team_name: string; defensive_scheme: string };
type TeamOption = { team_name: string };
type CfbPlaybookRow = { playbook: string | null };

function playbookOptionLabel(row: OffensiveTeam): string {
  if (row.playbook_name.trim() === row.team_name.trim()) {
    return row.playbook_name;
  }
  return `${row.playbook_name} (${row.team_name})`;
}

function uniquePlaybookOptions(rows: OffensiveTeam[], fallbackPlaybooks: string[], fallbackScheme: string): OffensiveTeam[] {
  const byPlaybook = new Map<string, OffensiveTeam>();
  for (const row of rows) {
    const key = row.playbook_name.trim();
    if (!key) continue;
    if (!byPlaybook.has(key)) byPlaybook.set(key, row);
  }
  for (const playbook of fallbackPlaybooks) {
    const key = playbook.trim();
    if (!key || byPlaybook.has(key)) continue;
    byPlaybook.set(key, {
      team_name: playbook,
      playbook_name: playbook,
      scheme_style: fallbackScheme,
    });
  }
  return [...byPlaybook.values()].sort((a, b) => a.playbook_name.localeCompare(b.playbook_name));
}

let cachedOffensive: OffensiveTeam[] | null = null;
let cachedDefensive: DefensiveTeam[] | null = null;
let cachedFallbackPlaybooks: string[] | null = null;

const toggleOn = "border-emerald-500 bg-emerald-500/15 text-emerald-300";
const toggleOff = "border-slate-700 bg-slate-900 text-slate-400";

const MODAL_ID = "hs-edit-game-modal";

type Props = {
  gameId: string;
  game: GameSession;
  onSaved: (updated: GameSession) => void | Promise<void>;
  triggerLabel?: string;
  triggerClassName?: string;
  onOpen?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
};

export function EditGameDetailsModal({
  gameId,
  game,
  onSaved,
  triggerLabel = "Edit",
  triggerClassName = "inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-700 px-3 py-1.5 font-sans text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-white",
  onOpen,
  open,
  onOpenChange,
  hideTrigger = false,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isControlled = typeof open === "boolean";
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );
  useScrollLock(isOpen);
  const [offensiveTeams, setOffensiveTeams] = useState<OffensiveTeam[]>(() => cachedOffensive ?? []);
  const [defensiveTeams, setDefensiveTeams] = useState<DefensiveTeam[]>(() => cachedDefensive ?? []);
  const [fallbackPlaybooks, setFallbackPlaybooks] = useState<string[]>(() => cachedFallbackPlaybooks ?? []);
  const [setupLoading, setSetupLoading] = useState(
    () => cachedOffensive === null || cachedDefensive === null || cachedFallbackPlaybooks === null,
  );
  const [setupError, setSetupError] = useState<string | null>(null);

  const [offensePick, setOffensePick] = useState<TeamOption | null>(null);
  const [defensePick, setDefensePick] = useState<DefensiveTeam | null>(null);
  const [selectedPlaybookName, setSelectedPlaybookName] = useState<string | null>(null);
  const [form, setForm] = useState({ my_score: 0, opponent_score: 0, result: "W" as "W" | "L" });
  const [saveBusy, setSaveBusy] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const opponentInputRef = useRef<HTMLInputElement>(null);
  const playbookInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    if (cachedOffensive !== null && cachedDefensive !== null && cachedFallbackPlaybooks !== null) {
      return;
    }

    async function loadTeams() {
      setSetupLoading(true);
      setSetupError(null);
      const [offRes, defRes, playbookRes] = await Promise.all([
        supabase
          .from("team_offensive_playbooks")
          .select("team_name, playbook_name, scheme_style")
          .order("team_name", { ascending: true })
          .limit(20000),
        supabase
          .from("team_defensive_schemes")
          .select("team_name, defensive_scheme")
          .order("team_name", { ascending: true })
          .limit(20000),
        supabase.from("cfb26_plays").select("playbook").not("playbook", "is", null).order("playbook"),
      ]);
      if (cancelled) return;

      const err = offRes.error ?? defRes.error;
      if (err) {
        setSetupError(err.message || "Could not load teams from Supabase.");
        setOffensiveTeams([]);
        setDefensiveTeams([]);
        setSetupLoading(false);
        return;
      }
      if (playbookRes.error) {
        console.warn("Fallback playbook lookup failed:", playbookRes.error.message);
      }

      const offensive = (offRes.data ?? []) as OffensiveTeam[];
      const defensive = (defRes.data ?? []) as DefensiveTeam[];
      const fallback = Array.from(
        new Set(
          ((playbookRes.data ?? []) as CfbPlaybookRow[])
            .map((r) => (r.playbook ?? "").trim())
            .filter((v) => v.length > 0),
        ),
      );
      cachedOffensive = offensive;
      cachedDefensive = defensive;
      cachedFallbackPlaybooks = fallback;
      setOffensiveTeams(offensive);
      setDefensiveTeams(defensive);
      setFallbackPlaybooks(fallback);
      setSetupLoading(false);
    }

    void loadTeams();
    return () => {
      cancelled = true;
    };
  }, []);

  const allTeamOptions = useMemo<TeamOption[]>(() => {
    const names = new Set(defensiveTeams.map((t) => t.team_name.trim()).filter(Boolean));
    names.add(game.my_playbook.trim());
    return [...names]
      .sort((a, b) => a.localeCompare(b))
      .map((team_name) => ({ team_name }));
  }, [defensiveTeams, game.my_playbook]);

  const playbookOptions = useMemo<OffensiveTeam[]>(() => {
    const base = uniquePlaybookOptions(offensiveTeams, fallbackPlaybooks, "Multiple");
    const cur = (game.offensive_playbook ?? "").trim();
    if (!cur || base.some((r) => r.playbook_name === cur)) return base;
    return [...base, { team_name: cur, playbook_name: cur, scheme_style: game.my_scheme || "Multiple" }].sort((a, b) =>
      a.playbook_name.localeCompare(b.playbook_name),
    );
  }, [offensiveTeams, fallbackPlaybooks, game.offensive_playbook, game.my_scheme]);

  const playbookRow = useMemo(() => {
    if (!selectedPlaybookName) return null;
    return playbookOptions.find((row) => row.playbook_name === selectedPlaybookName) ?? null;
  }, [playbookOptions, selectedPlaybookName]);

  useEffect(() => {
    if (!selectedPlaybookName || playbookOptions.length === 0) return;
    if (!playbookOptions.some((row) => row.playbook_name === selectedPlaybookName)) {
      setSelectedPlaybookName(null);
    }
  }, [playbookOptions, selectedPlaybookName]);

  const hydrateFromGame = useCallback(() => {
    setOffensePick({ team_name: game.my_playbook });
    const opp = defensiveTeams.find((t) => t.team_name === game.opponent_team);
    setDefensePick(opp ?? { team_name: game.opponent_team, defensive_scheme: game.opponent_scheme });
    const ob = (game.offensive_playbook ?? "").trim();
    setSelectedPlaybookName(ob.length ? ob : null);
    setForm({
      my_score: game.my_score ?? 0,
      opponent_score: game.opponent_score ?? 0,
      result: game.result === "L" ? "L" : "W",
    });
  }, [game, defensiveTeams]);

  useEffect(() => {
    hydrateFromGame();
  }, [hydrateFromGame]);

  useEffect(() => {
    if (!isOpen) return;
    hydrateFromGame();
  }, [isOpen, hydrateFromGame]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const canSave = Boolean(offensePick && defensePick && playbookRow && !setupLoading);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!offensePick || !defensePick || !playbookRow) return;

    const myRes = await supabase.from("team_offensive_playbooks").select("scheme_style").eq("team_name", offensePick.team_name.trim()).single();
    const myScheme = myRes.data?.scheme_style?.trim() || game.my_scheme;

    setSaveBusy(true);
    try {
      const res = await fetch(`/api/games/${gameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          my_playbook: offensePick.team_name.trim(),
          my_scheme: myScheme,
          offensive_playbook: playbookRow.playbook_name.trim(),
          opponent_team: defensePick.team_name.trim(),
          opponent_scheme: defensePick.defensive_scheme.trim(),
          my_score: form.my_score,
          opponent_score: form.opponent_score,
          result: form.result,
        }),
      });
      const data = (await res.json()) as GameSession & { error?: string };
      if (!res.ok || (data as { error?: string }).error) {
        addToast(COULDNT_SAVE, "error");
        return;
      }
      await onSaved(data as GameSession);
      addToast("Saved.", "success");
      setIsOpen(false);
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <>
      {hideTrigger ? null : (
        <button
          type="button"
          className={triggerClassName}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={MODAL_ID}
          onClick={() => {
            onOpen?.();
            setIsOpen(true);
          }}
        >
          {triggerLabel}
        </button>
      )}

      {mounted
        ? createPortal(
            <div
              id={MODAL_ID}
              className={`hs-overlay fixed inset-0 z-[200] overflow-x-hidden overflow-y-auto ${isOpen ? "pointer-events-auto bg-black/70" : "pointer-events-none hidden"}`}
              role="dialog"
              tabIndex={-1}
              aria-modal={isOpen}
              aria-labelledby="hs-edit-game-modal-label"
              onClick={(e) => {
                if (e.target === e.currentTarget) setIsOpen(false);
              }}
            >
              <div className={`hs-overlay-animation-target fixed inset-x-0 bottom-0 z-[201] transition-all ease-out sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:px-4 ${isOpen ? "opacity-100 duration-300" : "opacity-0"}`}>
                <div
                  className="pointer-events-auto flex w-full max-h-[90vh] flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
            <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900 px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="hs-edit-game-modal-label" className="app-modal-title">
                    Edit game details
                  </h2>
                  <p className="mt-1 font-body text-sm text-slate-400">Update metadata only. Play-by-play is unchanged.</p>
                </div>
                <button type="button" className="app-no-press-scale p-2 -mr-2 text-slate-400 hover:text-white" onClick={() => setIsOpen(false)}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                    <path d="M6 6 18 18M18 6 6 18" />
                  </svg>
                  <span className="sr-only">Close</span>
                </button>
              </div>
            </div>

            <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-hidden">
              <div className="space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
                {setupError ? (
                  <p className="rounded-lg border border-amber-800/30 bg-amber-950/40 p-3 text-sm text-amber-100" role="alert">
                    {setupError}
                  </p>
                ) : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TeamCombobox<TeamOption>
                  label="Your Team"
                  inputId="edit-film-my-team"
                  selected={offensePick}
                  onSelect={setOffensePick}
                  options={allTeamOptions}
                  loading={setupLoading}
                  placeholder="Select your team"
                  nextFocusRef={opponentInputRef}
                />

                <TeamCombobox<DefensiveTeam>
                  label="Opponent"
                  inputId="edit-film-opponent"
                  inputRef={opponentInputRef}
                  selected={defensePick}
                  onSelect={setDefensePick}
                  options={defensiveTeams}
                  loading={setupLoading}
                  placeholder="Select opponent"
                  nextFocusRef={playbookInputRef}
                />
              </div>

              <div className="space-y-1">
                <TeamCombobox<OffensiveTeam>
                  label="Offensive Playbook"
                  inputId="edit-film-offensive-playbook"
                  inputRef={playbookInputRef}
                  selected={playbookRow}
                  onSelect={(row) => setSelectedPlaybookName(row?.playbook_name ?? null)}
                  options={playbookOptions}
                  loading={setupLoading}
                  placeholder="Select playbook"
                  getOptionLabel={playbookOptionLabel}
                  getOptionKey={(row) => row.playbook_name}
                  getSearchText={(row) => `${row.playbook_name} ${row.team_name}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1">
                  <span className="app-field-label">My score</span>
                  <input
                    className="hs-input app-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.my_score}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setForm((p) => ({ ...p, my_score: val === "" ? 0 : parseInt(val, 10) }));
                    }}
                  />
                </label>
                <label className="space-y-1">
                  <span className="app-field-label">Their score</span>
                  <input
                    className="hs-input app-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.opponent_score}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      setForm((p) => ({ ...p, opponent_score: val === "" ? 0 : parseInt(val, 10) }));
                    }}
                  />
                </label>
              </div>

              <div className="space-y-2">
                <p className="app-field-label">Game result</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, result: "W" }))}
                    className={`rounded-lg border px-4 py-3 font-body text-sm font-semibold transition-colors ${form.result === "W" ? toggleOn : toggleOff}`}
                  >
                    W
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, result: "L" }))}
                    className={`rounded-lg border px-4 py-3 font-body text-sm font-semibold transition-colors ${
                      form.result === "L" ? "border-red-500 bg-red-500/15 text-red-300" : toggleOff
                    }`}
                  >
                    L
                  </button>
                </div>
              </div>

              </div>
              <div className="flex shrink-0 gap-3 border-t border-slate-800 p-3 sm:px-6 sm:py-5">
                <button type="button" className="btn-secondary flex-1" onClick={() => setIsOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={!canSave || saveBusy} className="btn-primary flex-1">
                  {saveBusy ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
