"use client";

import { TeamCombobox } from "@/components/film/TeamCombobox";
import { NewGameFormSkeleton } from "@/components/shared/AppSkeleton";
import { BackNavLink } from "@/components/shared/BackNavLink";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { modalDialogTitleClass } from "@/lib/constants/designTokens";
import {
  COULDNT_LOAD_TEAM_LIST,
  COULDNT_SAVE,
  FILM_NEW_GAME_CTA,
  FILM_NEW_GAME_PLAYBOOK_LABEL,
  FILM_NEW_GAME_SUBTITLE,
  FILM_NEW_GAME_TITLE,
  FILM_NEW_GAME_YOUR_TEAM_LABEL,
} from "@/lib/coachCopy";
import { CFB_CATALOG_GAME_VERSION } from "@/lib/constants";
import { GAME_SESSION_IMPORT_SOURCE_ONBOARDING } from "@/lib/onboardingImportSource";
import {
  getCatalogPlaybookSection,
  PLAYBOOK_CATALOG_SECTIONS,
  sortByCatalogPlaybookSection,
} from "@/lib/playbooks/generic-playbooks";
import { emitProductEvent } from "@/lib/productAnalytics";
import { createClient } from "@/lib/supabase/client";
import { useLastGamePrefsStore } from "@/store/lastGamePrefsStore";
import { useToastStore } from "@/store/toastStore";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type OffensiveTeam = { team_name: string; playbook_name: string; scheme_style: string };
type DefensiveTeam = { team_name: string; defensive_scheme: string };
type TeamOption = { team_name: string };
type CfbPlaybookRow = { playbook: string | null };
type FilmSide = "offense" | "defense" | "both";

const RECENT_TEAM_LIMIT = 5;

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
  return sortByCatalogPlaybookSection([...byPlaybook.values()]);
}

function buildMatchupSessionName(myTeam: string, opponentTeam: string): string {
  return `${myTeam} vs. ${opponentTeam}`;
}

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

let cachedOffensive: OffensiveTeam[] | null = null;
let cachedDefensive: DefensiveTeam[] | null = null;
let cachedFallbackPlaybooks: string[] | null = null;

const toggleOn = "border-emerald-500 bg-emerald-500/15 text-emerald-300";
const toggleOff = "border-slate-700 bg-slate-900 text-slate-400";

const FILM_SIDES: { id: FilmSide; label: string }[] = [
  { id: "offense", label: "Offense" },
  { id: "defense", label: "Defense" },
  { id: "both", label: "Both" },
];

export default function NewGamePage() {
  const supabase = createClient();
  const router = useRouter();
  const { setLastGame } = useLastGamePrefsStore();
  const addToast = useToastStore((s) => s.addToast);

  const [offensiveTeams, setOffensiveTeams] = useState<OffensiveTeam[]>(() => cachedOffensive ?? []);
  const [defensiveTeams, setDefensiveTeams] = useState<DefensiveTeam[]>(() => cachedDefensive ?? []);
  const [fallbackPlaybooks, setFallbackPlaybooks] = useState<string[]>(() => cachedFallbackPlaybooks ?? []);
  const [setupLoading, setSetupLoading] = useState(
    () => cachedOffensive === null || cachedDefensive === null || cachedFallbackPlaybooks === null,
  );
  const [setupError, setSetupError] = useState<string | null>(null);
  const [side, setSide] = useState<FilmSide>("offense");
  const [myTeamPick, setMyTeamPick] = useState<TeamOption | null>(null);
  const [opponentPick, setOpponentPick] = useState<TeamOption | null>(null);
  /** Store only the playbook id string — never an object from `playbookOptions` — so nothing can "default" to the first row. */
  const [selectedPlaybookName, setSelectedPlaybookName] = useState<string | null>(null);
  const [selectedDefenseScheme, setSelectedDefenseScheme] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [recentTeamNames, setRecentTeamNames] = useState<string[]>([]);

  type SheetOption = { id: string; name: string };
  const [availableSheets, setAvailableSheets] = useState<SheetOption[]>([]);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);

  const opponentInputRef = useRef<HTMLInputElement>(null);
  const playbookInputRef = useRef<HTMLInputElement>(null);
  const lastAutoSessionNameRef = useRef("");

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
          .from("playbooks")
          .select("playbook")
          .eq("game_version", CFB_CATALOG_GAME_VERSION)
          .not("playbook", "is", null)
          .order("playbook"),
      ]);
      if (cancelled) return;

      const err = offRes.error ?? defRes.error;
      if (err) {
        console.error("Film setup Supabase error:", err);
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

  /** Full team list from defensive catalog (same pool as opponent), sorted for stable combobox order. */
  const allTeamOptions = useMemo<TeamOption[]>(
    () =>
      [...new Set(defensiveTeams.map((t) => t.team_name.trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b))
        .map((team_name) => ({ team_name })),
    [defensiveTeams],
  );

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

  const playbookOptions = useMemo<OffensiveTeam[]>(
    () => uniquePlaybookOptions(offensiveTeams, fallbackPlaybooks, "Multiple"),
    [offensiveTeams, fallbackPlaybooks],
  );

  const defenseSchemeOptions = useMemo<DefensiveTeam[]>(() => {
    const byScheme = new Map<string, DefensiveTeam>();
    for (const row of defensiveTeams) {
      const key = row.defensive_scheme.trim();
      if (!key || byScheme.has(key)) continue;
      byScheme.set(key, { team_name: key, defensive_scheme: key });
    }
    return [...byScheme.values()].sort((a, b) => a.defensive_scheme.localeCompare(b.defensive_scheme));
  }, [defensiveTeams]);

  const needsOffensePlaybook = side === "offense" || side === "both";
  const needsDefensePlaybook = side === "defense" || side === "both";
  /** Defense picker on "Both" is optional (offense playbook is required). */
  const defensePlaybookRequired = side === "defense";

  const usePlaybookSelect = playbookOptions.length > 0 && !setupError;

  const playbookRow = useMemo(() => {
    if (!selectedPlaybookName) return null;
    return playbookOptions.find((row) => row.playbook_name === selectedPlaybookName) ?? null;
  }, [playbookOptions, selectedPlaybookName]);

  const defenseSchemeRow = useMemo(() => {
    if (!selectedDefenseScheme) return null;
    return defenseSchemeOptions.find((row) => row.defensive_scheme === selectedDefenseScheme) ?? null;
  }, [defenseSchemeOptions, selectedDefenseScheme]);

  useEffect(() => {
    if (!selectedPlaybookName || playbookOptions.length === 0) return;
    if (!playbookOptions.some((row) => row.playbook_name === selectedPlaybookName)) {
      setSelectedPlaybookName(null);
    }
  }, [playbookOptions, selectedPlaybookName]);

  useEffect(() => {
    if (!selectedDefenseScheme || defenseSchemeOptions.length === 0) return;
    if (!defenseSchemeOptions.some((row) => row.defensive_scheme === selectedDefenseScheme)) {
      setSelectedDefenseScheme(null);
    }
  }, [defenseSchemeOptions, selectedDefenseScheme]);

  useEffect(() => {
    const my = myTeamPick?.team_name.trim() ?? "";
    const opp = opponentPick?.team_name.trim() ?? "";
    if (!my || !opp) return;
    const autoName = buildMatchupSessionName(my, opp);
    setSessionName((prev) => {
      const trimmed = prev.trim();
      if (!trimmed || trimmed === lastAutoSessionNameRef.current) {
        lastAutoSessionNameRef.current = autoName;
        return autoName;
      }
      return prev;
    });
  }, [myTeamPick, opponentPick]);

  useEffect(() => {
    setSelectedSheetId(null);
    if (!needsOffensePlaybook || !selectedPlaybookName) {
      setAvailableSheets([]);
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
      setSheetsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPlaybookName, needsOffensePlaybook]);

  const canContinue = Boolean(
    myTeamPick &&
      opponentPick &&
      sessionName.trim() &&
      !setupLoading &&
      (side === "offense"
        ? playbookRow
        : side === "defense"
          ? defenseSchemeRow
          : playbookRow),
  );

  const buildGameSetup = useCallback(() => {
    if (!myTeamPick || !opponentPick) return null;
    if (side === "offense" && !playbookRow) return null;
    if (side === "defense" && !defenseSchemeRow) return null;
    if (side === "both" && !playbookRow) return null;

    const offensivePlaybook =
      side === "defense"
        ? defenseSchemeRow?.defensive_scheme ?? ""
        : playbookRow?.playbook_name ?? "";
    const myScheme =
      side === "defense"
        ? defenseSchemeRow?.defensive_scheme ?? "Multiple"
        : playbookRow?.scheme_style ?? "Multiple";

    return {
      my_playbook: myTeamPick.team_name,
      my_scheme: myScheme,
      offensive_playbook: offensivePlaybook,
      opponent_team: opponentPick.team_name,
      /** When side is Both and a D book is chosen, reuse stripped opponent_scheme column for coach D metadata. */
      opponent_scheme:
        side === "both" && defenseSchemeRow ? defenseSchemeRow.defensive_scheme : "",
      game_date: new Date().toISOString().slice(0, 10),
    };
  }, [myTeamPick, opponentPick, playbookRow, defenseSchemeRow, side]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const setup = buildGameSetup();
    if (!setup) {
      addToast("Set your team, opponent, and playbook first.", "error");
      return;
    }

    setSubmitBusy(true);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          my_playbook: setup.my_playbook,
          my_scheme: setup.my_scheme,
          offensive_playbook: setup.offensive_playbook,
          opponent_team: setup.opponent_team,
          opponent_scheme: setup.opponent_scheme,
          game_date: setup.game_date,
          play_sheet_id: needsOffensePlaybook ? selectedSheetId ?? null : null,
        }),
      });
      const game = (await res.json()) as { id?: string; error?: string };
      if (!game.id) {
        addToast(COULDNT_SAVE, "error");
        return;
      }
      emitProductEvent("game_created", { gameId: game.id, source: "film_new" });
      setLastGame({ my_playbook: setup.my_playbook, my_scheme: setup.my_scheme });
      addToast("Game ready.", "success");
      router.push(`/film/${game.id}`);
    } finally {
      setSubmitBusy(false);
    }
  }

  return (
    <section className="space-y-8">
      <Breadcrumb segments={[{ label: "Film", href: "/film" }, { label: "New Game" }]} />
      <BackNavLink />

      <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-6">
        {setupLoading ? (
          <NewGameFormSkeleton />
        ) : (
          <form onSubmit={onSubmit} className="space-y-6">
            <header className="space-y-2">
              <h1 className={modalDialogTitleClass}>{FILM_NEW_GAME_TITLE}</h1>
              <p className="font-body text-sm text-slate-400">{FILM_NEW_GAME_SUBTITLE}</p>
            </header>

            {setupError ? (
              <p className="rounded-lg border border-amber-800/30 bg-amber-950/40 p-4 font-body text-sm text-amber-100" role="alert">
                {setupError}
              </p>
            ) : null}

            <fieldset className="space-y-2">
              <legend className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">
                Side
              </legend>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Side">
                {FILM_SIDES.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={side === option.id}
                    onClick={() => setSide(option.id)}
                    className={`min-h-11 rounded-lg border px-3 py-2 font-body text-sm font-semibold transition-colors ${
                      side === option.id ? toggleOn : toggleOff
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TeamCombobox<TeamOption>
                label={FILM_NEW_GAME_YOUR_TEAM_LABEL}
                inputId="film-my-playbook"
                selected={myTeamPick}
                onSelect={setMyTeamPick}
                options={allTeamOptions}
                recentOptions={recentTeamOptions}
                loading={setupLoading}
                placeholder="Select your team"
                nextFocusRef={opponentInputRef}
              />

              <TeamCombobox<TeamOption>
                label="Opponent"
                inputId="film-opponent"
                inputRef={opponentInputRef}
                selected={opponentPick}
                onSelect={setOpponentPick}
                options={allTeamOptions}
                recentOptions={recentTeamOptions}
                loading={setupLoading}
                placeholder="Select opponent"
                nextFocusRef={playbookInputRef}
              />
            </div>

            <label className="block space-y-1 md:max-w-2xl">
              <span className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">
                Session name
              </span>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Select both teams to auto-fill"
                className="hs-input block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
              />
            </label>

            {needsOffensePlaybook ? (
              <div className="space-y-1 md:max-w-2xl">
                <TeamCombobox<OffensiveTeam>
                  label={FILM_NEW_GAME_PLAYBOOK_LABEL}
                  inputId="film-offensive-playbook"
                  inputRef={playbookInputRef}
                  selected={playbookRow}
                  onSelect={(row) => {
                    setSelectedPlaybookName(row?.playbook_name ?? null);
                  }}
                  options={playbookOptions}
                  loading={setupLoading}
                  placeholder="Select playbook"
                  getOptionLabel={playbookOptionLabel}
                  getOptionKey={(row) => row.playbook_name}
                  getSearchText={(row) => `${row.playbook_name} ${row.team_name}`}
                  getOptionSection={(row) => getCatalogPlaybookSection(row.playbook_name)}
                  optionSections={[...PLAYBOOK_CATALOG_SECTIONS]}
                />
                {!usePlaybookSelect ? (
                  <p className="font-body text-xs text-slate-500">Playbook list is unavailable.</p>
                ) : null}
              </div>
            ) : null}

            {needsDefensePlaybook ? (
              <div className="space-y-1 md:max-w-2xl">
                <TeamCombobox<DefensiveTeam>
                  label={defensePlaybookRequired ? "Defensive playbook" : "Defensive playbook (optional)"}
                  inputId="film-defensive-playbook"
                  selected={defenseSchemeRow}
                  onSelect={(row) => setSelectedDefenseScheme(row?.defensive_scheme ?? null)}
                  options={defenseSchemeOptions}
                  loading={setupLoading}
                  placeholder="Select defensive playbook"
                  getOptionLabel={(row) => row.defensive_scheme}
                  getOptionKey={(row) => row.defensive_scheme}
                  getSearchText={(row) => row.defensive_scheme}
                />
              </div>
            ) : null}

            {needsOffensePlaybook && selectedPlaybookName ? (
              <div className="space-y-2 md:max-w-2xl">
                <p className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">Play Sheet</p>
                {sheetsLoading ? (
                  <p className="font-body text-xs text-slate-500">Loading play sheets…</p>
                ) : availableSheets.length === 0 ? (
                  <p className="font-body text-xs text-slate-500">
                    No play sheets for this playbook yet.{" "}
                    <a href="/playbook" className="text-emerald-400 hover:text-emerald-300">
                      Create one in Play Sheet
                    </a>
                    .
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

            <Button type="submit" variant="default" className="w-full py-3 text-sm" disabled={!canContinue || submitBusy}>
              {submitBusy ? "Starting…" : FILM_NEW_GAME_CTA}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
