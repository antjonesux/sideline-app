"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PlayBrowser } from "@/components/film/PlayBrowser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayRow } from "@/components/film/atoms/PlayRow";
import { AddPlayBrowseRow } from "@/components/playbook/AddPlayBrowseRow";
import { DefensiveLogSheet } from "@/components/film/DefensiveLogSheet";
import { YardageSheet, type PlayResult } from "@/components/film/YardageSheet";
import { driveSideOfBall } from "@/lib/filmGameDetailHelpers";
import { deriveDefensiveStoredResultTag, type DefensiveResultTag } from "@/lib/defensiveResultTags";
import { usePlaySuggestions } from "@/hooks/usePlaySuggestions";
import { fetchPlaySheetOverview, fetchPlaySheetScenarioCalls } from "@/lib/filmLoggerCatalogFetch";
import { filmLoggerQueryKeys } from "@/lib/filmLoggerQueryKeys";
import { PlaySheetSituationChipScroll } from "@/components/shared/PlaySheetSituationChipScroll";
import { scenarioDisplayLabel, sortScenariosByCanonicalOrder } from "@/lib/playbookUtils";
import { deriveStoredResultTag, replayGameStateFromPlays } from "@/lib/gameStateEngine";
import { possessionEndedFromSnapAndTag } from "@/lib/driveOutcome";
import { formatFieldPosition } from "@/lib/fieldPosition";
import { formatDownDistanceLabel } from "@/lib/formatDownDistance";
import type { Drive, LoggedPlay } from "@/lib/types";
import type { PlaybookEntry } from "@/lib/playbook";
import { useToastStore } from "@/store/toastStore";
import { COULDNT_SAVE, filmLoggerMySheetEmptyHint } from "@/lib/coachCopy";
import { parseCatalogGameVersion, type CatalogGameVersion, type CatalogSideOfBall } from "@/lib/constants";
import { isCoachCallPlay } from "@/lib/filmPlayCounting";
import { isFilmLoggerSpecialTeamsEntry } from "@/lib/filmLoggerSpecialTeams";
import { endCriticalFlow } from "@/lib/perfInstrumentation";
import { emitProductEvent, markMilestoneFired, wasMilestoneFired } from "@/lib/productAnalytics";

type LoggerView = "suggestions" | "yardage";

type LoggerPickTab = "browse" | "my_sheet";

/** Matches `gameDetailTabTriggerClass` in `app/film/[gameId]/page.tsx` (Drive Summary / Tendencies). */
const filmLoggerPickTabTriggerClass =
  "flex min-h-12 w-full items-center justify-center rounded-none border-b-2 border-transparent bg-transparent px-2 text-center text-sm font-sans font-medium text-slate-400 shadow-none ring-offset-transparent transition-colors data-[state=active]:border-amber-400 data-[state=active]:bg-transparent data-[state=active]:text-slate-100 data-[state=active]:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400";

const FILM_SHEET_OVERVIEW_STALE_MS = 2 * 60 * 1000;
const FILM_SHEET_OVERVIEW_GC_MS = 20 * 60 * 1000;
const FILM_SHEET_SCENARIO_STALE_MS = 2 * 60 * 1000;
const FILM_SHEET_SCENARIO_GC_MS = 20 * 60 * 1000;

interface PlayLoggerV2Props {
  gameId: string;
  driveId: string;
  playbook: string;
  drive: Drive;
  onRefresh: () => Promise<void>;
  /** Explicit active sheet ID resolved by the parent page. */
  sheetId?: string | null;
  /** Cross-component logger-open flow id started by the game detail page. */
  loggerOpenFlowId?: string | null;
  /** When true, My Sheet preselects `guidedMySheetScenario` and avoids momentum-killing empty states. */
  guidedOnboarding?: boolean;
  /** Sheet situation to show in My Sheet (from Play Sheet onboarding step). */
  guidedMySheetScenario?: string | null;
  /** Plays in this game (all drives) before this log — parent state, no optimistic rows. */
  totalPlayRowsInGame: number;
  /** Non-punt call count before this log — matches Film game header stats. */
  totalCoachCallsInGame: number;
  /** Fired after a successful save when this snap ended the possession (TD, FG, punt, turnover, turnover on downs, etc.). */
  onPossessionEndedAfterLog?: (args: { driveId: string; storedResultTag: string }) => void;
  /** All coach calls logged in this game (all drives) — powers situation-weighted suggestions without refetching drives. */
  allGameCoachCalls: LoggedPlay[];
  /** Catalog game version for play-art resolution in Browse. */
  catalogGameVersion?: CatalogGameVersion | string | null;
  /** Catalog side for Browse playbook filter and play-art URLs. */
  catalogSideOfBall?: CatalogSideOfBall;
}

export function PlayLoggerV2({
  gameId,
  driveId,
  playbook,
  drive,
  onRefresh,
  sheetId,
  loggerOpenFlowId,
  guidedOnboarding = false,
  guidedMySheetScenario = null,
  totalPlayRowsInGame,
  totalCoachCallsInGame,
  onPossessionEndedAfterLog,
  allGameCoachCalls,
  catalogGameVersion,
  catalogSideOfBall = "offense",
}: PlayLoggerV2Props) {
  const addToast = useToastStore((s) => s.addToast);
  const [view, setView] = useState<LoggerView>("suggestions");
  const [pickTab, setPickTab] = useState<LoggerPickTab>(() => (sheetId?.trim() ? "my_sheet" : "browse"));
  const [selectedPlay, setSelectedPlay] = useState<PlaybookEntry | null>(null);
  /**
   * Where the pending selection came from. Distinguishes app-curated surfaces from unguided PlayBrowser
   * (both previously used the same "not sheet" boolean).
   */
  const [playSelectionSource, setPlaySelectionSource] = useState<
    "sheet" | "situation_suggestions" | "browser" | null
  >(null);
  const [optimistic, setOptimistic] = useState<LoggedPlay[]>([]);
  const [flashOk, setFlashOk] = useState(false);
  const [accordionExpanded, setAccordionExpanded] = useState(false);
  const [locallyHiddenPlayIds, setLocallyHiddenPlayIds] = useState<Set<string>>(() => new Set());
  const [pendingDeletePlayId, setPendingDeletePlayId] = useState<string | null>(null);

  const hasMySheet = Boolean(sheetId?.trim());

  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!hasMySheet && pickTab === "my_sheet") {
      setPickTab("browse");
    }
  }, [hasMySheet, pickTab]);

  const resolvedCatalogGameVersion = parseCatalogGameVersion(catalogGameVersion ?? undefined);
  const isDefensiveDrive = driveSideOfBall(drive) === "defense";

  useEffect(() => {
    return () => {
      void onRefreshRef.current();
      // TODO: QA18 — When `drives` exposes a persisted outcome + PUT accepts it, write
      // `deriveDriveResult(lastLoggedPlay)` here instead of refresh-only.
    };
  }, [driveId]);

  const loggedVisible = useMemo(
    () => (drive.plays ?? []).filter((p) => !locallyHiddenPlayIds.has(p.id)),
    [drive.plays, locallyHiddenPlayIds],
  );

  const mergedPlays = useMemo(() => {
    const combined = [...loggedVisible, ...optimistic];
    return combined.sort((a, b) => (a.play_number ?? 0) - (b.play_number ?? 0));
  }, [loggedVisible, optimistic]);

  const currentGameState = useMemo(
    () => replayGameStateFromPlays(mergedPlays, drive.drive_number, drive),
    [mergedPlays, drive],
  );

  const { sheetName, scenarioLabel } = usePlaySuggestions({
    down: currentGameState.down,
    distance: currentGameState.distance,
    fieldPos: currentGameState.absoluteYard,
    playbook,
    allGameCoachCalls,
    sheetId,
    loggerOpenFlowId,
  });

  const [mySheetSelectedScenario, setMySheetSelectedScenario] = useState(() =>
    guidedOnboarding && guidedMySheetScenario?.trim() ? guidedMySheetScenario.trim() : scenarioLabel,
  );

  const guidedInitRef = useRef(false);
  useEffect(() => {
    if (!guidedOnboarding || !guidedMySheetScenario?.trim() || !hasMySheet || guidedInitRef.current) return;
    guidedInitRef.current = true;
    setPickTab("my_sheet");
    setMySheetSelectedScenario(guidedMySheetScenario.trim());
  }, [guidedOnboarding, guidedMySheetScenario, hasMySheet]);

  useLayoutEffect(() => {
    if (guidedOnboarding) return;
    if (pickTab !== "my_sheet") return;
    setMySheetSelectedScenario(scenarioLabel);
  }, [guidedOnboarding, pickTab, scenarioLabel]);

  const sheetOverviewQuery = useQuery({
    queryKey: filmLoggerQueryKeys.playSheetOverview(sheetId ?? ""),
    queryFn: () => fetchPlaySheetOverview(sheetId as string),
    enabled: Boolean(sheetId?.trim()),
    staleTime: FILM_SHEET_OVERVIEW_STALE_MS,
    gcTime: FILM_SHEET_OVERVIEW_GC_MS,
  });

  const mySheetPlaysQuery = useQuery({
    queryKey: filmLoggerQueryKeys.sheetScenario(sheetId ?? "", mySheetSelectedScenario),
    queryFn: () => fetchPlaySheetScenarioCalls(sheetId as string, mySheetSelectedScenario, catalogSideOfBall),
    enabled: pickTab === "my_sheet" && Boolean(sheetId?.trim() && mySheetSelectedScenario),
    staleTime: FILM_SHEET_SCENARIO_STALE_MS,
    gcTime: FILM_SHEET_SCENARIO_GC_MS,
  });

  /** All sheet situations (same coverage as Play Sheet situation strip), including 0-call slots like 2 Minute. */
  const mySheetBadgeScenarios = useMemo(() => {
    const scenarios = sheetOverviewQuery.data?.scenarios ?? [];
    return sortScenariosByCanonicalOrder([...scenarios]);
  }, [sheetOverviewQuery.data?.scenarios]);

  const mySheetDisplayPlays = mySheetPlaysQuery.data?.sheetCalls ?? [];
  const mySheetDisplayName = mySheetPlaysQuery.data?.sheetName ?? sheetName;

  const streamPlaysDesc = useMemo(
    () => [...mergedPlays].sort((a, b) => (b.play_number ?? 0) - (a.play_number ?? 0)),
    [mergedPlays],
  );

  function handlePlaySelect(play: PlaybookEntry, source: "sheet" | "situation_suggestions" | "browser") {
    setSelectedPlay(play);
    setPlaySelectionSource(source);
    setView("yardage");
  }

  async function persistLoggedPlay(
    snap: {
      down: number;
      distance: number;
      is_inches: boolean;
      yard_line: number;
      side: "OWN" | "OPP";
      hash: "MIDDLE";
      formation: string;
      play_name: string;
      result_tag: string;
      yards_gained: number;
      note: null;
      game_session_id: string;
      opponent_scheme: string;
      drive_number: number;
      situation_override: null;
      result_tags?: string[] | null;
      play_type?: string;
    },
    optimisticPlay: LoggedPlay,
    meta: {
      loggedPlay: PlaybookEntry;
      logSelectionSource: typeof playSelectionSource;
      logCameFromSheet: boolean;
      logScenario: string;
      submitFlowId?: string;
    },
  ) {
    const { loggedPlay, logSelectionSource, logCameFromSheet, logScenario, submitFlowId } = meta;
    const allPlaysAfterLog = totalPlayRowsInGame + 1;
    const coachCallsAfterLog = totalCoachCallsInGame + (isCoachCallPlay(snap) ? 1 : 0);

    setOptimistic((p) => [...p, optimisticPlay]);
    setSelectedPlay(null);
    setPlaySelectionSource(null);
    setView("suggestions");
    setFlashOk(true);
    setTimeout(() => setFlashOk(false), 350);

    try {
      const res = await fetch(`/api/drives/${driveId}/plays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snap),
      });

      if (!res.ok) {
        setOptimistic((p) => p.filter((row) => row.id !== optimisticPlay.id));
        addToast(COULDNT_SAVE, "error");
        if (submitFlowId) {
          endCriticalFlow(submitFlowId, "error", { reason: "save_play_failed" });
        }
        return;
      }
      if (allPlaysAfterLog === 1 && !wasMilestoneFired("first_play", gameId)) {
        markMilestoneFired("first_play", gameId);
        emitProductEvent("first_play", { gameId, source: "film_logger" });
      }
      if (coachCallsAfterLog === 10 && !wasMilestoneFired("ten_plays", gameId)) {
        markMilestoneFired("ten_plays", gameId);
        emitProductEvent("ten_plays", { gameId, source: "film_logger" });
      }
      if (logCameFromSheet) {
        emitProductEvent("on_sheet_call_made", {
          gameId,
          sheetId: sheetId ?? null,
          scenario: logScenario,
          source: "film_logger",
        });
      }
      const appCurated =
        logSelectionSource === "sheet" ||
        logSelectionSource === "situation_suggestions" ||
        (logSelectionSource === "browser" && isFilmLoggerSpecialTeamsEntry(loggedPlay));
      if (appCurated) {
        emitProductEvent("play_call_changed_based_on_app_data", {
          gameId,
          appSelectionPath: logSelectionSource === "browser" ? "special_teams_browser" : logSelectionSource,
          scenario: logScenario,
          sheetId: sheetId ?? null,
          source: "film_logger",
        });
      }
      setOptimistic((p) => p.filter((row) => row.id !== optimisticPlay.id));
      await onRefresh();
      if (guidedOnboarding) {
        if (logCameFromSheet) {
          setPickTab("my_sheet");
        } else {
          setPickTab("browse");
        }
      }
      if (submitFlowId) {
        endCriticalFlow(submitFlowId, "ok", {
          driveId,
          playName: snap.play_name,
          resultTag: snap.result_tag,
        });
      }
      if (possessionEndedFromSnapAndTag(snap.down, snap.result_tag)) {
        onPossessionEndedAfterLog?.({ driveId, storedResultTag: snap.result_tag });
      }
    } catch (error) {
      setOptimistic((p) => p.filter((row) => row.id !== optimisticPlay.id));
      addToast(COULDNT_SAVE, "error");
      if (submitFlowId) {
        endCriticalFlow(submitFlowId, "error", {
          reason: "unexpected_error",
          message: error instanceof Error ? error.message : "unknown",
        });
      }
    }
  }

  async function handleDefensiveLog(
    resultTags: DefensiveResultTag[],
    yards: number,
    _endingFieldPos: number,
    submitFlowId?: string,
  ) {
    if (!selectedPlay) return;
    const loggedPlay = selectedPlay;
    const logSelectionSource = playSelectionSource;
    const logCameFromSheet = logSelectionSource === "sheet";
    const logScenario = scenarioLabel;
    const storedTag = deriveDefensiveStoredResultTag(resultTags, yards, currentGameState.distance);
    const snap = {
      down: currentGameState.down,
      distance: currentGameState.distance,
      is_inches: Boolean(currentGameState.isInches),
      yard_line: currentGameState.absoluteYard <= 50 ? currentGameState.absoluteYard : 100 - currentGameState.absoluteYard,
      side: (currentGameState.absoluteYard <= 50 ? "OWN" : "OPP") as "OWN" | "OPP",
      hash: "MIDDLE" as const,
      formation: loggedPlay.formation,
      play_name: loggedPlay.play_name,
      play_type: loggedPlay.play_type,
      result_tag: storedTag,
      yards_gained: yards,
      result_tags: resultTags,
      note: null,
      game_session_id: gameId,
      opponent_scheme: "",
      drive_number: drive.drive_number,
      situation_override: null,
    };
    const optimisticPlay: LoggedPlay = {
      id: `optimistic-${Date.now()}`,
      play_number: mergedPlays.length + 1,
      drive_number: drive.drive_number,
      down: snap.down,
      distance: snap.distance,
      is_inches: snap.is_inches,
      yard_line: snap.yard_line,
      side: snap.side,
      hash: snap.hash,
      formation: snap.formation,
      play_name: snap.play_name,
      result_tag: snap.result_tag,
      yards_gained: snap.yards_gained,
      result_tags: snap.result_tags,
    };
    await persistLoggedPlay(snap, optimisticPlay, {
      loggedPlay,
      logSelectionSource,
      logCameFromSheet,
      logScenario,
      submitFlowId,
    });
  }

  async function handleLog(yards: number, result: PlayResult | null, _endingFieldPos: number, submitFlowId?: string) {
    if (!selectedPlay) return;
    const loggedPlay = selectedPlay;
    const logSelectionSource = playSelectionSource;
    const logCameFromSheet = logSelectionSource === "sheet";
    const logScenario = scenarioLabel;
    const uiTag =
      result === "PUNT"
        ? "PUNT"
        : result === "FIELD_GOAL"
          ? "FIELD_GOAL"
          : result === "TURNOVER"
            ? "TURNOVER"
          : result === "FG_MISS"
            ? "TURNOVER"
            : result === "TOUCHDOWN"
              ? "TOUCHDOWN"
              : result === "INCOMPLETE"
                ? "INCOMPLETE"
                : result === "SACK"
                  ? "LOSS"
                  : yards < 0
                    ? "LOSS"
                    : yards === 0
                      ? "NO_GAIN"
                      : "GAIN";

    const storedTag = uiTag === "GAIN" ? deriveStoredResultTag("GAIN", Math.max(0, yards), currentGameState.distance) : uiTag;
    const snap = {
      down: currentGameState.down,
      distance: currentGameState.distance,
      is_inches: Boolean(currentGameState.isInches),
      yard_line: currentGameState.absoluteYard <= 50 ? currentGameState.absoluteYard : 100 - currentGameState.absoluteYard,
      side: (currentGameState.absoluteYard <= 50 ? "OWN" : "OPP") as "OWN" | "OPP",
      hash: "MIDDLE" as const,
      formation: loggedPlay.formation,
      play_name: loggedPlay.play_name,
      play_type: loggedPlay.play_type,
      result_tag: storedTag,
      yards_gained: yards,
      note: null,
      game_session_id: gameId,
      opponent_scheme: "",
      drive_number: drive.drive_number,
      situation_override: null,
    };
    const optimisticPlay: LoggedPlay = {
      id: `optimistic-${Date.now()}`,
      play_number: mergedPlays.length + 1,
      drive_number: drive.drive_number,
      down: snap.down,
      distance: snap.distance,
      is_inches: snap.is_inches,
      yard_line: snap.yard_line,
      side: snap.side,
      hash: snap.hash,
      formation: snap.formation,
      play_name: snap.play_name,
      result_tag: snap.result_tag,
      yards_gained: snap.yards_gained,
    };

    await persistLoggedPlay(snap, optimisticPlay, {
      loggedPlay,
      logSelectionSource,
      logCameFromSheet,
      logScenario,
      submitFlowId,
    });
  }

  async function handleConfirmDeletePlay(play: LoggedPlay) {
    setPendingDeletePlayId(null);
    if (play.id.startsWith("optimistic-")) {
      setOptimistic((o) => o.filter((x) => x.id !== play.id));
      return;
    }
    setLocallyHiddenPlayIds((prev) => new Set(prev).add(play.id));
    const res = await fetch(`/api/plays/${play.id}`, { method: "DELETE" });
    if (!res.ok) {
      setLocallyHiddenPlayIds((prev) => {
        const next = new Set(prev);
        next.delete(play.id);
        return next;
      });
      addToast(COULDNT_SAVE, "error");
      return;
    }
    await onRefresh();
    setLocallyHiddenPlayIds((prev) => {
      const next = new Set(prev);
      next.delete(play.id);
      return next;
    });
    addToast("Call removed.", "success");
  }

  const situationLine = formatDownDistanceLabel(currentGameState.down, currentGameState.distance, {
    isGoalToGo: false,
    yardLine: currentGameState.absoluteYard,
    isInches: currentGameState.isInches,
  });
  const fieldLine = formatFieldPosition(currentGameState.absoluteYard);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col bg-slate-950">
      <div
        className={`sticky top-0 w-full border-b border-slate-700 ${flashOk ? "bg-emerald-900/30" : "bg-slate-900"}`}
      >
        <div className="flex w-full items-center gap-3 px-4 py-3">
          <span className="whitespace-nowrap font-mono text-[13px] font-semibold uppercase tracking-widest text-amber-400">
            DRIVE {drive.drive_number}
          </span>

          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0">
            <span className="font-mono text-[13px] font-semibold text-white">{situationLine}</span>
            <span className="font-mono text-xs text-slate-400">· {fieldLine}</span>
          </div>

          <button
            type="button"
            data-no-press
            className="flex min-h-11 shrink-0 items-center gap-1 text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            onClick={() => setAccordionExpanded((e) => !e)}
            aria-expanded={accordionExpanded}
          >
            <span className="font-mono text-xs font-medium uppercase tracking-widest">
              {mergedPlays.length} {mergedPlays.length === 1 ? "CALL" : "CALLS"}
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
              className={`size-4 shrink-0 transition-transform motion-reduce:transition-none ${accordionExpanded ? "rotate-180" : ""}`}
              aria-hidden
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>

        {accordionExpanded && streamPlaysDesc.length > 0 ? (
          <div className="max-h-48 overflow-y-auto border-t border-slate-800/80 px-4 pb-3 pt-0">
            <div className="space-y-2">
              {streamPlaysDesc.map((play, idx) => (
                <div
                  key={play.id}
                  className={idx === 0 ? "motion-safe:animate-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-200" : ""}
                >
                  <PlayRow
                    variant="stream"
                    play={play}
                    streamIndex={idx}
                    isConfirmingDelete={pendingDeletePlayId === play.id}
                    onDeletePress={() => setPendingDeletePlayId(play.id)}
                    onConfirmDelete={() => void handleConfirmDeletePlay(play)}
                    onCancelDelete={() => setPendingDeletePlayId(null)}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div
        className={`min-h-0 w-full flex-1 bg-slate-900 ${
          view === "suggestions"
            ? "flex min-h-0 flex-col overflow-hidden"
            : "overflow-y-auto pt-0"
        }`}
      >
        {view === "suggestions" ? (
          hasMySheet ? (
            <Tabs
              value={pickTab}
              onValueChange={(v) => setPickTab(v as LoggerPickTab)}
              className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden"
            >
              <TabsList
                aria-label="Play pick views"
                className="grid h-auto w-full shrink-0 grid-cols-2 gap-0 rounded-none border-b border-slate-800 bg-transparent p-0 text-muted-foreground"
              >
                <TabsTrigger value="my_sheet" className={filmLoggerPickTabTriggerClass}>
                  My Call Sheet
                </TabsTrigger>
                <TabsTrigger value="browse" className={filmLoggerPickTabTriggerClass}>
                  Browse
                </TabsTrigger>
              </TabsList>

              <div className="relative z-[5] flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-3">
                <TabsContent
                  value="my_sheet"
                  className="mt-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=inactive]:hidden"
                >
                  <div className="flex min-h-0 flex-1 flex-col pb-4">
                    <div className="shrink-0">
                      {sheetOverviewQuery.isError ? (
                        <p className="px-4 pb-2 font-sans text-sm text-red-300">
                          {(sheetOverviewQuery.error as Error)?.message ?? "Could not load situations."}
                        </p>
                      ) : sheetOverviewQuery.isPending ? (
                        <p className="px-4 pb-2 font-sans text-xs text-slate-500">Loading situations…</p>
                      ) : mySheetBadgeScenarios.length > 0 ? (
                        <PlaySheetSituationChipScroll
                          scenarios={mySheetBadgeScenarios}
                          selectedScenario={mySheetSelectedScenario}
                          onSelect={setMySheetSelectedScenario}
                          tabSemantics
                        />
                      ) : (
                        <p className="px-4 pb-2 font-sans text-xs text-slate-500">No situations on this sheet.</p>
                      )}
                    </div>

                    <div className="px-4 pb-4">
                      <div className="mb-2">
                        {mySheetDisplayName ? (
                          <p className="font-sans text-xs text-slate-400">Based on {mySheetDisplayName} play sheet</p>
                        ) : null}
                      </div>
                      {mySheetPlaysQuery.isPending ? (
                        <p className="font-sans text-sm text-slate-500">Loading plays…</p>
                      ) : mySheetDisplayPlays.length > 0 ? (
                        <div className="flex flex-col overflow-hidden rounded-lg border border-slate-700/50">
                          {mySheetDisplayPlays.map((play) => (
                            <AddPlayBrowseRow
                              key={`sheet-${mySheetSelectedScenario}-${play.play_id}`}
                              play={play}
                              formationLabel={play.formation}
                              inGoTo={false}
                              onSelect={(p) => handlePlaySelect(p, "sheet")}
                              catalogSideOfBall={catalogSideOfBall}
                              catalogGameVersion={resolvedCatalogGameVersion}
                              catalogPlaybook={playbook}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="font-sans text-sm text-slate-500">
                          {filmLoggerMySheetEmptyHint(scenarioDisplayLabel(mySheetSelectedScenario))}
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent
                  value="browse"
                  className="mt-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=inactive]:hidden"
                >
                  <PlayBrowser
                    playbook={playbook}
                    presentation="inline"
                    onClose={() => {}}
                    showTopLevelBack={false}
                    onSelect={(play) => handlePlaySelect(play, "browser")}
                    showPlayArtRows
                    catalogSideOfBall={catalogSideOfBall}
                    catalogGameVersion={resolvedCatalogGameVersion}
                  />
                </TabsContent>
              </div>
            </Tabs>
          ) : (
            <PlayBrowser
              playbook={playbook}
              presentation="inline"
              onClose={() => {}}
              showTopLevelBack={false}
              onSelect={(play) => handlePlaySelect(play, "browser")}
              showPlayArtRows
              catalogSideOfBall={catalogSideOfBall}
              catalogGameVersion={resolvedCatalogGameVersion}
              hideSearchSeparator
            />
          )
        ) : null}

        {view === "yardage" && selectedPlay ? (
          isDefensiveDrive ? (
            <DefensiveLogSheet
              play={selectedPlay}
              currentGameState={currentGameState}
              onLog={handleDefensiveLog}
              onCancel={() => {
                setView("suggestions");
                setSelectedPlay(null);
                setPlaySelectionSource(null);
              }}
            />
          ) : (
            <YardageSheet
              play={selectedPlay}
              currentGameState={currentGameState}
              onLog={handleLog}
              onboardingSpotHelper={guidedOnboarding}
              onCancel={() => {
                setView("suggestions");
                setSelectedPlay(null);
                setPlaySelectionSource(null);
              }}
            />
          )
        ) : null}
      </div>

    </div>
  );
}
