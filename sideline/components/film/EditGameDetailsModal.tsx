"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import { TeamCombobox } from "@/components/film/TeamCombobox";
import { GameSideSetupSection } from "@/components/film/GameSideSetupSection";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { modalCtaFooterClass, responsiveOverlayDialogContentClass } from "@/lib/constants/designTokens";
import { COULDNT_LOAD_TEAM_LIST, COULDNT_SAVE } from "@/lib/coachCopy";
import { DEFAULT_CATALOG_GAME_VERSION, parseCatalogGameVersion } from "@/lib/constants";
import { useCallSheetsForSide } from "@/hooks/useCallSheetsForSide";
import { GAME_SESSION_IMPORT_SOURCE_ONBOARDING } from "@/lib/onboardingImportSource";
import type { GameSession } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToastStore } from "@/store/toastStore";

type DefensiveTeam = { team_name: string; defensive_scheme: string };
type TeamOption = { team_name: string };

const RECENT_TEAM_LIMIT = 5;

function collectRecentTeamNames(
  rows: Array<{ my_playbook?: string | null; opponent_team?: string | null }>,
  limit: number,
): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const row of rows) {
    for (const raw of [row.my_playbook, row.opponent_team]) {
      const name = String(raw ?? "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      ordered.push(name);
      if (ordered.length >= limit) return ordered;
    }
  }
  return ordered;
}

let cachedDefensive: DefensiveTeam[] | null = null;

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
  const [defensiveTeams, setDefensiveTeams] = useState<DefensiveTeam[]>(() => cachedDefensive ?? []);
  const [setupLoading, setSetupLoading] = useState(() => cachedDefensive === null);
  const [setupError, setSetupError] = useState<string | null>(null);

  const [myTeamPick, setMyTeamPick] = useState<TeamOption | null>(null);
  const [opponentPick, setOpponentPick] = useState<TeamOption | null>(null);
  const [offenseSheetId, setOffenseSheetId] = useState<string | null>(game.play_sheet_id ?? null);
  const [defenseSheetId, setDefenseSheetId] = useState<string | null>(game.defensive_play_sheet_id ?? null);
  const [offensePlaybook, setOffensePlaybook] = useState<string | null>(null);
  const [defensePlaybook, setDefensePlaybook] = useState<string | null>(null);
  const [form, setForm] = useState({ my_score: "0", opponent_score: "0", result: "W" as "W" | "L" });
  const [saveBusy, setSaveBusy] = useState(false);
  const [recentTeamNames, setRecentTeamNames] = useState<string[]>([]);
  const addToast = useToastStore((s) => s.addToast);

  const opponentInputRef = useRef<HTMLInputElement>(null);
  const dialogTitleRef = useRef<HTMLHeadingElement>(null);

  const gameVersion = parseCatalogGameVersion(game.game_version ?? DEFAULT_CATALOG_GAME_VERSION);

  const { sheets: offenseSheets, isLoading: offenseSheetsLoading } = useCallSheetsForSide("offense", gameVersion);
  const { sheets: defenseSheets, isLoading: defenseSheetsLoading } = useCallSheetsForSide("defense", gameVersion);

  useEffect(() => {
    let cancelled = false;

    if (cachedDefensive !== null) {
      return;
    }

    async function loadTeams() {
      setSetupLoading(true);
      setSetupError(null);
      const defRes = await supabase
        .from("team_defensive_schemes")
        .select("team_name, defensive_scheme")
        .order("team_name", { ascending: true })
        .limit(20000);
      if (cancelled) return;

      if (defRes.error) {
        console.error("Edit game details team catalog error:", defRes.error);
        setSetupError(COULDNT_LOAD_TEAM_LIST);
        setDefensiveTeams([]);
        setSetupLoading(false);
        return;
      }

      const defensive = (defRes.data ?? []) as DefensiveTeam[];
      cachedDefensive = defensive;
      setDefensiveTeams(defensive);
      setSetupLoading(false);
    }

    void loadTeams();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data, error } = await supabase
        .from("game_sessions")
        .select("my_playbook, opponent_team, created_at, import_source")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(40);

      if (cancelled || error) return;

      const rows = (data ?? []).filter(
        (row) => row.import_source !== GAME_SESSION_IMPORT_SOURCE_ONBOARDING,
      );
      setRecentTeamNames(collectRecentTeamNames(rows, RECENT_TEAM_LIMIT));
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const allTeamOptions = useMemo<TeamOption[]>(() => {
    const names = new Set(defensiveTeams.map((t) => t.team_name.trim()).filter(Boolean));
    names.add(game.my_playbook.trim());
    if (game.opponent_team.trim()) names.add(game.opponent_team.trim());
    return [...names]
      .sort((a, b) => a.localeCompare(b))
      .map((team_name) => ({ team_name }));
  }, [defensiveTeams, game.my_playbook, game.opponent_team]);

  const recentTeamOptions = useMemo<TeamOption[]>(() => {
    if (recentTeamNames.length === 0 || allTeamOptions.length === 0) return [];
    const byName = new Map(allTeamOptions.map((row) => [row.team_name.toLowerCase(), row]));
    const out: TeamOption[] = [];
    for (const name of recentTeamNames) {
      const match = byName.get(name.toLowerCase());
      if (match) out.push(match);
    }
    return out;
  }, [recentTeamNames, allTeamOptions]);

  const resolvedOffensePlaybook = useMemo(() => {
    if (offenseSheetId) {
      return offenseSheets.find((sheet) => sheet.id === offenseSheetId)?.playbook?.trim() ?? "";
    }
    return offensePlaybook?.trim() ?? "";
  }, [offensePlaybook, offenseSheetId, offenseSheets]);

  const resolvedDefensePlaybook = useMemo(() => {
    if (defenseSheetId) {
      return defenseSheets.find((sheet) => sheet.id === defenseSheetId)?.playbook?.trim() ?? "";
    }
    return defensePlaybook?.trim() ?? "";
  }, [defensePlaybook, defenseSheetId, defenseSheets]);

  const hasOffenseSide = Boolean(resolvedOffensePlaybook || offenseSheetId);
  const hasDefenseSide = Boolean(resolvedDefensePlaybook || defenseSheetId);

  const hydrateFromGame = useCallback(() => {
    setMyTeamPick({ team_name: game.my_playbook });
    setOpponentPick({ team_name: game.opponent_team });
    setOffenseSheetId(game.play_sheet_id ?? null);
    setDefenseSheetId(game.defensive_play_sheet_id ?? null);
    const ob = (game.offensive_playbook ?? "").trim();
    const db = (game.opponent_scheme ?? "").trim();
    setOffensePlaybook(game.play_sheet_id ? null : ob.length ? ob : null);
    setDefensePlaybook(game.defensive_play_sheet_id ? null : db.length ? db : null);
    setForm({
      my_score: String(game.my_score ?? 0),
      opponent_score: String(game.opponent_score ?? 0),
      result: game.result === "L" ? "L" : "W",
    });
  }, [game]);

  useEffect(() => {
    hydrateFromGame();
  }, [hydrateFromGame]);

  useEffect(() => {
    if (!isOpen) return;
    hydrateFromGame();
  }, [isOpen, hydrateFromGame]);

  const canSave = Boolean(
    myTeamPick && opponentPick && (hasOffenseSide || hasDefenseSide) && !setupLoading,
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!myTeamPick || !opponentPick) return;
    if (!hasOffenseSide && !hasDefenseSide) return;

    let myScheme = game.my_scheme;
    if (resolvedOffensePlaybook) {
      const { data: schemeRow } = await supabase
        .from("team_offensive_playbooks")
        .select("scheme_style")
        .eq("playbook_name", resolvedOffensePlaybook)
        .limit(1)
        .maybeSingle();
      myScheme = (schemeRow?.scheme_style as string | undefined)?.trim() || game.my_scheme || "Multiple";
    }

    setSaveBusy(true);
    try {
      const res = await fetch(`/api/games/${gameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          my_playbook: myTeamPick.team_name.trim(),
          my_scheme: myScheme,
          offensive_playbook: resolvedOffensePlaybook || myTeamPick.team_name.trim(),
          opponent_team: opponentPick.team_name.trim(),
          opponent_scheme: resolvedDefensePlaybook,
          my_score: Math.max(0, Number.parseInt(form.my_score.replace(/\D/g, ""), 10) || 0),
          opponent_score: Math.max(0, Number.parseInt(form.opponent_score.replace(/\D/g, ""), 10) || 0),
          result: form.result,
          play_sheet_id: offenseSheetId ?? null,
          defensive_play_sheet_id: defenseSheetId ?? null,
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
          className={responsiveOverlayDialogContentClass("lg")}
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
                  selected={myTeamPick}
                  onSelect={setMyTeamPick}
                  options={allTeamOptions}
                  recentOptions={recentTeamOptions}
                  loading={setupLoading}
                  placeholder="Select your team"
                  nextFocusRef={opponentInputRef}
                  openOnFocus={false}
                />

                <TeamCombobox<TeamOption>
                  label="Opponent"
                  inputId="edit-film-opponent"
                  inputRef={opponentInputRef}
                  selected={opponentPick}
                  onSelect={setOpponentPick}
                  options={allTeamOptions}
                  recentOptions={recentTeamOptions}
                  loading={setupLoading}
                  placeholder="Select opponent"
                />
              </div>

              <GameSideSetupSection
                sideLabel="Offense"
                sideOfBall="offense"
                gameVersion={gameVersion}
                sheets={offenseSheets}
                sheetsLoading={offenseSheetsLoading}
                selectedSheetId={offenseSheetId}
                onSheetChange={setOffenseSheetId}
                selectedPlaybook={offensePlaybook}
                onPlaybookChange={setOffensePlaybook}
                playbookLabel="Offensive Playbook"
              />

              <GameSideSetupSection
                sideLabel="Defense"
                sideOfBall="defense"
                gameVersion={gameVersion}
                sheets={defenseSheets}
                sheetsLoading={defenseSheetsLoading}
                selectedSheetId={defenseSheetId}
                onSheetChange={setDefenseSheetId}
                selectedPlaybook={defensePlaybook}
                onPlaybookChange={setDefensePlaybook}
                playbookLabel="Defensive Playbook"
              />

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
              <div className={modalCtaFooterClass}>
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
