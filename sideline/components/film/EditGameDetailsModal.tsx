"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { TeamCombobox } from "@/components/film/TeamCombobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { COULDNT_LOAD_TEAM_LIST, COULDNT_SAVE } from "@/lib/coachCopy";
import { CFB_CATALOG_GAME_VERSION } from "@/lib/constants";
import type { GameSession } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const EDIT_GAME_DIALOG_ID = "edit-game-details-dialog";

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
  const supabase = createClient();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof open === "boolean";
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );
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
  const [form, setForm] = useState({ my_score: "0", opponent_score: "0", result: "W" as "W" | "L" });
  const [saveBusy, setSaveBusy] = useState(false);
  type SheetOption = { id: string; name: string };
  const [availableSheets, setAvailableSheets] = useState<SheetOption[]>([]);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(game.play_sheet_id ?? null);
  const addToast = useToastStore((s) => s.addToast);

  const opponentInputRef = useRef<HTMLInputElement>(null);
  const playbookInputRef = useRef<HTMLInputElement>(null);
  const dialogTitleRef = useRef<HTMLHeadingElement>(null);

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
        supabase
          .from("cfb26_plays")
          .select("playbook")
          .eq("game_version", CFB_CATALOG_GAME_VERSION)
          .not("playbook", "is", null)
          .order("playbook"),
      ]);
      if (cancelled) return;

      const err = offRes.error ?? defRes.error;
      if (err) {
        console.error("Edit game details team catalog error:", err);
        setSetupError(COULDNT_LOAD_TEAM_LIST);
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

  useEffect(() => {
    if (!selectedPlaybookName) {
      setAvailableSheets([]);
      setSelectedSheetId(null);
      return;
    }
    let cancelled = false;
    setSheetsLoading(true);
    void (async () => {
      const res = await fetch("/api/playbook", { cache: "no-store" });
      const json = (await res.json()) as {
        playbooks?: Array<{ id: string; name: string; cfb26_playbook?: string | null }>;
      };
      if (cancelled) return;
      const norm = selectedPlaybookName.trim().toLowerCase();
      const matching = (json.playbooks ?? []).filter(
        (row) => (row.cfb26_playbook ?? "").trim().toLowerCase() === norm,
      );
      setAvailableSheets(matching.map((row) => ({ id: row.id, name: row.name })));
      const matchingIds = new Set(matching.map((r) => r.id));
      setSelectedSheetId((prev) => (prev && matchingIds.has(prev) ? prev : null));
      setSheetsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPlaybookName]);

  const hydrateFromGame = useCallback(() => {
    setOffensePick({ team_name: game.my_playbook });
    const opp = defensiveTeams.find((t) => t.team_name === game.opponent_team);
    setDefensePick(opp ?? { team_name: game.opponent_team, defensive_scheme: game.opponent_scheme });
    const ob = (game.offensive_playbook ?? "").trim();
    setSelectedPlaybookName(ob.length ? ob : null);
    setSelectedSheetId(game.play_sheet_id ?? null);
    setForm({
      my_score: String(game.my_score ?? 0),
      opponent_score: String(game.opponent_score ?? 0),
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
          my_score: Math.max(0, Number.parseInt(form.my_score.replace(/\D/g, ""), 10) || 0),
          opponent_score: Math.max(0, Number.parseInt(form.opponent_score.replace(/\D/g, ""), 10) || 0),
          result: form.result,
          play_sheet_id: selectedSheetId ?? null,
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
          aria-controls={EDIT_GAME_DIALOG_ID}
          onClick={() => {
            onOpen?.();
            setIsOpen(true);
          }}
        >
          {triggerLabel}
        </button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          id={EDIT_GAME_DIALOG_ID}
          className="inset-x-0 bottom-0 left-0 top-auto flex max-h-[90vh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-xl rounded-b-none border-slate-700 bg-slate-900 p-0 text-slate-100 sm:left-[50%] sm:top-[50%] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            dialogTitleRef.current?.focus({ preventScroll: true });
          }}
        >
          <DialogHeader className="sticky top-0 z-10 space-y-0 border-b border-slate-800 bg-slate-900 px-4 py-4 text-left sm:px-6 sm:text-left">
            <DialogTitle
              ref={dialogTitleRef}
              tabIndex={-1}
              className="font-heading text-xl font-bold uppercase tracking-[0.1em] text-slate-100 pr-10 text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
            >
              Edit game details
            </DialogTitle>
            <DialogDescription className="mt-1 text-left font-body text-sm text-slate-400">
              Update metadata only. Play-by-play is unchanged.
            </DialogDescription>
          </DialogHeader>

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
                  openOnFocus={false}
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

              {selectedPlaybookName ? (
                <div className="space-y-2">
                  <p className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">Game Plan</p>
                  {sheetsLoading ? (
                    <p className="font-body text-xs text-slate-500">Loading play sheets…</p>
                  ) : availableSheets.length === 0 ? (
                    <p className="font-body text-xs text-slate-500">
                      No play sheets for this playbook yet.{" "}
                      <a href="/playbook" className="text-emerald-400 hover:text-emerald-300">Create one in Game Plan</a>.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedSheetId(null)}
                        className={`min-h-11 rounded-lg border px-3 py-2 font-body text-sm transition-colors ${
                          selectedSheetId === null ? toggleOn : toggleOff
                        }`}
                      >
                        None
                      </button>
                      {availableSheets.map((sheet) => (
                        <button
                          key={sheet.id}
                          type="button"
                          onClick={() => setSelectedSheetId(sheet.id)}
                          className={`min-h-11 rounded-lg border px-3 py-2 font-body text-sm transition-colors ${
                            selectedSheetId === sheet.id ? toggleOn : toggleOff
                          }`}
                        >
                          {sheet.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1">
                  <span className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">My score</span>
                  <input
                    className="hs-input block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.my_score}
                    onChange={(e) => setForm((p) => ({ ...p, my_score: e.target.value.replace(/\D/g, "") }))}
                  />
                </label>
                <label className="space-y-1">
                  <span className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">Their score</span>
                  <input
                    className="hs-input block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.opponent_score}
                    onChange={(e) => setForm((p) => ({ ...p, opponent_score: e.target.value.replace(/\D/g, "") }))}
                  />
                </label>
              </div>

              <div className="space-y-2">
                <p className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">Game result</p>
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
              <div className="flex shrink-0 gap-3 border-t border-slate-800 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-5">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="default" className="flex-1" disabled={!canSave || saveBusy}>
                  {saveBusy ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
