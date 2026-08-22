"use client";

import { TeamCombobox } from "@/components/film/TeamCombobox";
import { NewGameFormSkeleton } from "@/components/shared/AppSkeleton";
import { BackNavLink } from "@/components/shared/BackNavLink";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { modalDialogTitleClass, overlayZ } from "@/lib/constants/designTokens";
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
  type CatalogSideOfBall,
} from "@/lib/constants";
import type { PlaybookSummary } from "@/lib/types";
import { useCatalogPlaybooks } from "@/hooks/useCatalogPlaybooks";
import { parseFilmRoomVersionFilter } from "@/lib/filmRoomVersionFilter";
import { useCallSheetsForSide } from "@/hooks/useCallSheetsForSide";
import { GAME_SESSION_IMPORT_SOURCE_ONBOARDING } from "@/lib/onboardingImportSource";
import {
  getCatalogPlaybookSectionForSide,
  getCatalogSectionsForSide,
  sortCatalogPlaybookNamesForSide,
} from "@/lib/playbooks/generic-playbooks";
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
type PlaybookOption = { team_name: string };

const RECENT_TEAM_LIMIT = 5;
/** Mobile bottom tab bar + page pb clearance — keep call sheet menus above the nav. */
const BOTTOM_NAV_CLEARANCE_PX = 112;
const CALL_SHEET_MENU_MIN_HEIGHT_PX = 180;

type CallSheetPickerProps = {
  sheets: PlaybookSummary[];
  loading: boolean;
  value: string | null;
  onChange: (sheetId: string | null) => void;
};

function CallSheetPicker({ sheets, loading, value, onChange }: CallSheetPickerProps) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = useMemo(
    () => sheets.find((sheet) => sheet.id === value) ?? null,
    [sheets, value],
  );

  const updateDropPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - BOTTOM_NAV_CLEARANCE_PX;
    setDropUp(spaceBelow < CALL_SHEET_MENU_MIN_HEIGHT_PX);
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    updateDropPosition();
    const onLayout = () => updateDropPosition();
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    return () => {
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
    };
  }, [open, updateDropPosition]);

  const placeholder = loading ? "Loading call sheets…" : "Select call sheet";

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={loading}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="hs-input flex h-auto w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-body text-sm text-slate-100 focus:border-emerald-600/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => {
          if (loading) return;
          setOpen((prev) => {
            const next = !prev;
            if (next) updateDropPosition();
            return next;
          });
        }}
      >
        <span className={selected ? "truncate" : "truncate text-slate-500"}>
          {selected?.name ?? placeholder}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`shrink-0 text-slate-400 transition-transform duration-200 ease-out ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div
          role="listbox"
          className={`absolute left-0 right-0 max-h-60 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 text-sm shadow-lg ${overlayZ.filmBackdrop} ${
            dropUp ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          <button
            type="button"
            role="option"
            aria-selected={value === null}
            className="flex min-h-11 w-full items-center border-b border-slate-800 px-3 py-2 text-left font-body text-sm text-slate-100 hover:bg-slate-800/80"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            None
          </button>
          {sheets.map((sheet) => (
            <button
              key={sheet.id}
              type="button"
              role="option"
              aria-selected={value === sheet.id}
              className="flex min-h-11 w-full items-center border-b border-slate-800 px-3 py-2 text-left font-body text-sm text-slate-100 last:border-b-0 hover:bg-slate-800/80"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(sheet.id);
                setOpen(false);
              }}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
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

let cachedDefensive: DefensiveTeam[] | null = null;

type SideSetupSectionProps = {
  sideLabel: string;
  sideOfBall: CatalogSideOfBall;
  gameVersion: CatalogGameVersion;
  sheets: PlaybookSummary[];
  sheetsLoading: boolean;
  selectedSheetId: string | null;
  onSheetChange: (sheetId: string | null) => void;
  selectedPlaybook: string | null;
  onPlaybookChange: (playbook: string | null) => void;
  playbookLabel: string;
};

function SideSetupSection({
  sideLabel,
  sideOfBall,
  gameVersion,
  sheets,
  sheetsLoading,
  selectedSheetId,
  onSheetChange,
  selectedPlaybook,
  onPlaybookChange,
  playbookLabel,
}: SideSetupSectionProps) {
  const { playbooks, loading: playbooksLoading } = useCatalogPlaybooks({
    gameVersion,
    sideOfBall,
  });

  const playbookOptions = useMemo<PlaybookOption[]>(
    () => sortCatalogPlaybookNamesForSide(playbooks, sideOfBall).map((name) => ({ team_name: name })),
    [playbooks, sideOfBall],
  );

  const selectedSheet = useMemo(
    () => sheets.find((sheet) => sheet.id === selectedSheetId) ?? null,
    [sheets, selectedSheetId],
  );

  const derivedPlaybookName = selectedSheet?.playbook?.trim() ?? "";

  const playbookRow = useMemo(() => {
    if (!selectedPlaybook) return null;
    return playbookOptions.find((row) => row.team_name === selectedPlaybook) ?? null;
  }, [playbookOptions, selectedPlaybook]);

  useEffect(() => {
    if (!selectedPlaybook || playbookOptions.length === 0) return;
    if (!playbookOptions.some((row) => row.team_name === selectedPlaybook)) {
      onPlaybookChange(null);
    }
  }, [onPlaybookChange, playbookOptions, selectedPlaybook]);

  useEffect(() => {
    if (!selectedSheetId) return;
    if (!sheets.some((sheet) => sheet.id === selectedSheetId)) {
      onSheetChange(null);
    }
  }, [onSheetChange, selectedSheetId, sheets]);

  const catalogSections = useMemo(() => [...getCatalogSectionsForSide(sideOfBall)], [sideOfBall]);

  return (
    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
      <h3 className="font-sans text-sm font-semibold text-white">{sideLabel}</h3>

      <label className="block space-y-1">
        <span className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500">
          Call Sheet
        </span>
        <CallSheetPicker
          sheets={sheets}
          loading={sheetsLoading}
          value={selectedSheetId}
          onChange={onSheetChange}
        />
        {!sheetsLoading && sheets.length === 0 ? (
          <p className="font-body text-xs text-slate-500">
            No {sideOfBall === "offense" ? "offensive" : "defensive"} call sheets for this game version yet.
          </p>
        ) : null}
      </label>

      {selectedSheet ? (
        <p className="font-body text-sm text-slate-300">
          <span className="text-slate-400">{playbookLabel}:</span> {derivedPlaybookName || "—"}
        </p>
      ) : (
        <div className="space-y-1">
          <TeamCombobox<PlaybookOption>
            label={playbookLabel}
            inputId={`film-${sideOfBall}-playbook`}
            selected={playbookRow}
            onSelect={(row) => onPlaybookChange(row?.team_name ?? null)}
            options={playbookOptions}
            loading={playbooksLoading}
            placeholder="Select playbook"
            getOptionLabel={(row) => row.team_name}
            getOptionKey={(row) => row.team_name}
            getSearchText={(row) => row.team_name}
            getOptionSection={(row) => getCatalogPlaybookSectionForSide(row.team_name, sideOfBall)}
            optionSections={catalogSections}
          />
        </div>
      )}
    </div>
  );
}

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

            <SideSetupSection
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

            <SideSetupSection
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
