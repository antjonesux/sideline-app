"use client";

import { TeamCombobox } from "@/components/film/TeamCombobox";
import { GameSideSetupSection } from "@/components/film/GameSideSetupSection";
import { NewGameFormSkeleton } from "@/components/shared/AppSkeleton";
import { BackNavLink } from "@/components/shared/BackNavLink";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { modalDialogTitleClass } from "@/lib/constants/designTokens";
import {
  COULDNT_LOAD_TEAM_LIST,
  COULDNT_SAVE,
  FILM_NEW_GAME_CTA,
  FILM_NEW_GAME_SUBTITLE,
  FILM_NEW_GAME_TITLE,
  FILM_NEW_GAME_YOUR_TEAM_LABEL,
  FILM_ROOM_HOME_TITLE,
} from "@/lib/coachCopy";
import {
  CATALOG_GAME_VERSION_LABELS,
  CATALOG_GAME_VERSIONS,
  DEFAULT_CATALOG_GAME_VERSION,
  parseCatalogGameVersion,
  type CatalogGameVersion,
} from "@/lib/constants";
import { parseFilmRoomVersionFilter } from "@/lib/filmRoomVersionFilter";
import { useCallSheetsForSide } from "@/hooks/useCallSheetsForSide";
import { GAME_SESSION_IMPORT_SOURCE_ONBOARDING } from "@/lib/onboardingImportSource";
import { emitProductEvent } from "@/lib/productAnalytics";
import { createClient } from "@/lib/supabase/client";
import { useLastGamePrefsStore } from "@/store/lastGamePrefsStore";
import { useToastStore } from "@/store/toastStore";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type DefensiveTeam = { team_name: string; defensive_scheme: string };
type TeamOption = { team_name: string };

const RECENT_TEAM_LIMIT = 5;

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

let cachedDefensive: DefensiveTeam[] | null = null;

export default function NewGamePage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setLastGame } = useLastGamePrefsStore();
  const addToast = useToastStore((s) => s.addToast);

  const [defensiveTeams, setDefensiveTeams] = useState<DefensiveTeam[]>(() => cachedDefensive ?? []);
  const [setupLoading, setSetupLoading] = useState(() => cachedDefensive === null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [myTeamPick, setMyTeamPick] = useState<TeamOption | null>(null);
  const [opponentPick, setOpponentPick] = useState<TeamOption | null>(null);
  const [offenseSheetId, setOffenseSheetId] = useState<string | null>(null);
  const [defenseSheetId, setDefenseSheetId] = useState<string | null>(null);
  const [offensePlaybook, setOffensePlaybook] = useState<string | null>(null);
  const [defensePlaybook, setDefensePlaybook] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [recentTeamNames, setRecentTeamNames] = useState<string[]>([]);

  const defaultGameVersion = parseCatalogGameVersion(
    searchParams.get("version") ?? DEFAULT_CATALOG_GAME_VERSION,
  );
  const [gameVersion, setGameVersion] = useState<CatalogGameVersion>(defaultGameVersion);

  const handleGameVersionChange = useCallback((value: CatalogGameVersion) => {
    setGameVersion(value);
    setOffenseSheetId(null);
    setDefenseSheetId(null);
    setOffensePlaybook(null);
    setDefensePlaybook(null);
  }, []);

  const opponentInputRef = useRef<HTMLInputElement>(null);
  const lastAutoSessionNameRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    if (cachedDefensive !== null) return;

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
        console.error("Film setup Supabase error:", defRes.error);
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

  const { sheets: offenseSheets, isLoading: offenseSheetsLoading } = useCallSheetsForSide("offense", gameVersion);
  const { sheets: defenseSheets, isLoading: defenseSheetsLoading } = useCallSheetsForSide("defense", gameVersion);

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

  const hasOffenseSide = Boolean(resolvedOffensePlaybook || offenseSheetId);
  const hasDefenseSide = Boolean(resolvedDefensePlaybook || defenseSheetId);

  const canContinue = Boolean(
    myTeamPick &&
      opponentPick &&
      sessionName.trim() &&
      !setupLoading &&
      (hasOffenseSide || hasDefenseSide),
  );

  const buildGameSetup = useCallback(async () => {
    if (!myTeamPick || !opponentPick) return null;
    if (!hasOffenseSide && !hasDefenseSide) return null;

    let myScheme = "Multiple";
    if (resolvedOffensePlaybook) {
      const { data: schemeRow } = await supabase
        .from("team_offensive_playbooks")
        .select("scheme_style")
        .eq("playbook_name", resolvedOffensePlaybook)
        .limit(1)
        .maybeSingle();
      myScheme = (schemeRow?.scheme_style as string | undefined)?.trim() || "Multiple";
    }

    return {
      my_playbook: myTeamPick.team_name,
      my_scheme: myScheme,
      offensive_playbook: resolvedOffensePlaybook || myTeamPick.team_name,
      opponent_team: opponentPick.team_name,
      opponent_scheme: resolvedDefensePlaybook,
      game_date: new Date().toISOString().slice(0, 10),
      game_version: gameVersion,
      play_sheet_id: offenseSheetId,
      defensive_play_sheet_id: defenseSheetId,
    };
  }, [
    defenseSheetId,
    gameVersion,
    hasDefenseSide,
    hasOffenseSide,
    myTeamPick,
    offenseSheetId,
    opponentPick,
    resolvedDefensePlaybook,
    resolvedOffensePlaybook,
    supabase,
  ]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const setup = await buildGameSetup();
    if (!setup) {
      addToast("Set your team, opponent, and at least one side (offense or defense).", "error");
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
          game_version: setup.game_version,
          play_sheet_id: setup.play_sheet_id,
          defensive_play_sheet_id: setup.defensive_play_sheet_id,
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

  const filmListHref =
    searchParams.get("version") && parseFilmRoomVersionFilter(searchParams.get("version")) !== gameVersion
      ? `/film?version=${encodeURIComponent(searchParams.get("version") ?? gameVersion)}`
      : `/film?version=${encodeURIComponent(gameVersion)}`;

  return (
    <section className="space-y-8">
      <Breadcrumb
        segments={[{ label: FILM_ROOM_HOME_TITLE, href: filmListHref }, { label: "New Game" }]}
      />
      <BackNavLink href={filmListHref} />

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
              <p
                className="rounded-lg border border-amber-800/30 bg-amber-950/40 p-4 font-body text-sm text-amber-100"
                role="alert"
              >
                {setupError}
              </p>
            ) : null}

            <label className="block w-full space-y-1 md:max-w-xs">
              <span className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">
                Game version
              </span>
              <Select value={gameVersion} onValueChange={(value) => handleGameVersionChange(value as CatalogGameVersion)}>
                <SelectTrigger className="hs-input h-auto w-full rounded-lg border-slate-700 bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 focus:border-emerald-600/60 focus:ring-emerald-500/25">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                  {CATALOG_GAME_VERSIONS.map((version) => (
                    <SelectItem
                      key={version}
                      value={version}
                      className="font-body text-sm text-slate-100 focus:bg-slate-800 focus:text-white"
                    >
                      {CATALOG_GAME_VERSION_LABELS[version]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

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
              />
            </div>

            <label className="block w-full space-y-1">
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

            <Button type="submit" variant="default" className="w-full py-3 text-sm" disabled={!canContinue || submitBusy}>
              {submitBusy ? "Starting…" : FILM_NEW_GAME_CTA}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
