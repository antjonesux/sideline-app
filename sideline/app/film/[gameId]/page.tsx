"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DriveList } from "@/components/film/DriveList";
import { FilmDriveSetupOverlay } from "@/components/film/FilmDriveSetupOverlay";
import { FilmEndGameScoreDialog } from "@/components/film/FilmEndGameScoreDialog";
import { FilmGameTendenciesBody } from "@/components/film/FilmGameTendenciesBody";
import { FilmPlayLoggerOverlay } from "@/components/film/FilmPlayLoggerOverlay";
import { GameDetailHeader } from "@/components/film/GameDetailHeader";
import { ConfirmDestructiveModal } from "@/components/shared/ConfirmDestructiveModal";
import { GameDetailSkeleton } from "@/components/shared/AppSkeleton";
import { BackNavLink } from "@/components/shared/BackNavLink";
import { useToastStore } from "@/store/toastStore";
import { COULDNT_SAVE } from "@/lib/coachCopy";
import { fetchCfb26PlaybookEntries } from "@/lib/filmLoggerCatalogFetch";
import { filmLoggerQueryKeys } from "@/lib/filmLoggerQueryKeys";
import { gameDetailTabTriggerClass, getDriveResult } from "@/lib/filmGameDetailHelpers";
import { useScrollLock } from "@/lib/useScrollLock";
import { useMdUp } from "@/lib/useMdUp";
import {
  appShellSituationWorkspaceClass,
  appShellSituationWorkspaceWithBrowseClass,
  appShellSituationWorkspaceInnerClass,
  appShellSituationWorkspaceInnerWithBrowseClass,
} from "@/lib/constants/designTokens";
import { cn } from "@/lib/utils";
import type { Drive, GameSession, LoggedPlay } from "@/lib/types";
import { parseFieldPosition } from "@/lib/fieldPosition";
import { closeAllDropdownMenus } from "@/lib/dropdownMenuRegistry";
import { countCoachCallsInGame, countPlaysInGame, isCoachCallPlay } from "@/lib/filmPlayCounting";
import { endCriticalFlow, startCriticalFlow } from "@/lib/perfInstrumentation";
import { emitProductEvent, markMilestoneFired, wasMilestoneFired } from "@/lib/productAnalytics";
import { tendenciesQueryKeys } from "@/lib/tendenciesQueryKeys";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { normalizePlayName } from "@/lib/utils";

type GameLogPageProps = { params: Promise<{ gameId: string }> };

type DetailTab = "drives" | "tendencies";

export default function GameLogPage({ params }: GameLogPageProps) {
  const { gameId } = use(params);
  const queryClient = useQueryClient();
  const [detailTab, setDetailTab] = useState<DetailTab>("drives");

  const [game, setGame] = useState<GameSession | null>(null);
  const [drives, setDrives] = useState<Drive[]>([]);
  const [expandedDriveIds, setExpandedDriveIds] = useState<string[]>([]);
  const [activeDrive, setActiveDrive] = useState<string>("");
  const drivePersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drivesRef = useRef<Drive[]>([]);
  drivesRef.current = drives;
  const [showLogger, setShowLogger] = useState(false);
  const [showDriveSetup, setShowDriveSetup] = useState(false);
  const [showEndGameModal, setShowEndGameModal] = useState(false);
  const [endGameScoreMine, setEndGameScoreMine] = useState("0");
  const [endGameScoreOpp, setEndGameScoreOpp] = useState("0");
  const [pageReady, setPageReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [endingGame, setEndingGame] = useState(false);
  const [pendingDriveDelete, setPendingDriveDelete] = useState<string | null>(null);
  const [pendingPlayDelete, setPendingPlayDelete] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const addToast = useToastStore((s) => s.addToast);
  const loggerOpenFlowIdRef = useRef<string | null>(null);
  const endGameScoresSeededRef = useRef(false);
  const mdUp = useMdUp();
  const loggerSidebarOpen = showLogger && mdUp;
  useScrollLock(showLogger && !mdUp);

  const refresh = useCallback(async (opts?: { expandDriveId?: string; pruneClosedPossessions?: boolean }) => {
    if (!gameId) return;
    const [dRes, gRes] = await Promise.all([fetch(`/api/games/${gameId}/drives`), fetch(`/api/games/${gameId}`)]);
    if (!dRes.ok) {
      addToast(COULDNT_SAVE, "error");
      return;
    }
    const data = (await dRes.json()) as Drive[];
    setDrives(data);
    if (gRes.ok) {
      setGame((await gRes.json()) as GameSession);
    }
    const possessionStillOpen = (drive: Drive) => {
      const o = getDriveResult(drive.plays);
      return o === "ACTIVE" || o === "NO_PLAYS";
    };
    setExpandedDriveIds((current) => {
      if (opts?.expandDriveId) {
        const dr = data.find((d) => d.id === opts.expandDriveId);
        return dr && possessionStillOpen(dr) ? [opts.expandDriveId] : [];
      }
      const stillInGame = (ids: string[]) => ids.filter((id) => data.some((d) => d.id === id));
      const base = stillInGame(current);
      if (opts?.pruneClosedPossessions) {
        return base.filter((id) => {
          const dr = data.find((d) => d.id === id);
          return dr ? possessionStillOpen(dr) : false;
        });
      }
      return base;
    });
    setActiveDrive((current) => {
      if (opts?.expandDriveId) return opts.expandDriveId;
      return current || data[0]?.id || "";
    });
    void queryClient.invalidateQueries({ queryKey: tendenciesQueryKeys.all });
    void queryClient.invalidateQueries({ queryKey: ["games", "list"] });
    void queryClient.invalidateQueries({ queryKey: filmLoggerQueryKeys.prefix });
  }, [gameId, queryClient, addToast]);

  useEffect(() => {
    if (showLogger) closeAllDropdownMenus();
  }, [showLogger]);

  useEffect(() => {
    return () => {
      if (drivePersistTimerRef.current) clearTimeout(drivePersistTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setDetailTab("drives");
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    const flowId = startCriticalFlow("film_game_detail_load", { gameId });
    let flowCompleted = false;
    let loadedDriveCount = 0;
    let loadedHasSheet = false;
    setPageReady(false);
    setLoadError(false);
    (async () => {
      try {
        const [gRes, dRes] = await Promise.all([fetch(`/api/games/${gameId}`), fetch(`/api/games/${gameId}/drives`)]);
        if (!gRes.ok || !dRes.ok) {
          if (!cancelled) setLoadError(true);
          if (!flowCompleted) {
            endCriticalFlow(flowId, "error", { gameOk: gRes.ok, drivesOk: dRes.ok });
            flowCompleted = true;
          }
          return;
        }
        const g = (await gRes.json()) as GameSession;
        const d = (await dRes.json()) as Drive[];
        if (cancelled) return;
        setGame(g);
        setDrives(d);
        const last = d[d.length - 1];
        const lastOutcome = last ? getDriveResult(last.plays) : null;
        const expandLast = last && (lastOutcome === "ACTIVE" || lastOutcome === "NO_PLAYS");
        setExpandedDriveIds(expandLast && last ? [last.id] : []);
        setActiveDrive((current) => current || d[0]?.id || "");
        loadedDriveCount = d.length;
        loadedHasSheet = Boolean(g.play_sheet_id);
      } finally {
        if (!cancelled) {
          setPageReady(true);
          if (!flowCompleted) {
            endCriticalFlow(flowId, "ok", { driveCount: loadedDriveCount, hasPlaySheet: loadedHasSheet });
            flowCompleted = true;
          }
        } else if (!flowCompleted) {
          endCriticalFlow(flowId, "cancelled", { reason: "game_change_or_unmount" });
          flowCompleted = true;
        }
      }
    })();
    return () => {
      cancelled = true;
      if (!flowCompleted) {
        endCriticalFlow(flowId, "cancelled", { reason: "effect_cleanup" });
        flowCompleted = true;
      }
    };
  }, [gameId]);

  const allGameCoachCalls = useMemo(() => {
    const out: LoggedPlay[] = [];
    for (const d of drives) {
      for (const p of d.plays ?? []) {
        if (isCoachCallPlay(p)) out.push(p);
      }
    }
    return out;
  }, [drives]);

  useEffect(() => {
    if (!pageReady || !game?.offensive_playbook?.trim()) return;
    const pb = game.offensive_playbook.trim();
    void queryClient.prefetchQuery({
      queryKey: filmLoggerQueryKeys.cfb26Catalog(pb),
      queryFn: () => fetchCfb26PlaybookEntries(pb),
      staleTime: 5 * 60 * 1000,
      gcTime: 45 * 60 * 1000,
    });
  }, [pageReady, game?.offensive_playbook, queryClient]);

  useEffect(() => {
    if (!showEndGameModal) {
      endGameScoresSeededRef.current = false;
      return;
    }
    if (!game || endGameScoresSeededRef.current) return;
    endGameScoresSeededRef.current = true;
    const last = drives[drives.length - 1];
    const mine = game.my_score ?? last?.score_mine ?? 0;
    const opp = game.opponent_score ?? last?.score_opponent ?? 0;
    setEndGameScoreMine(String(Math.max(0, Number(mine) || 0)));
    setEndGameScoreOpp(String(Math.max(0, Number(opp) || 0)));
  }, [showEndGameModal, game, drives]);

  async function createDrive(payload?: Partial<Drive> & { side_of_ball?: "offense" | "defense" }) {
    if (!gameId) return;

    const prevDrive = drives[drives.length - 1];
    const prevQuarter = prevDrive?.quarter != null && prevDrive.quarter >= 1 ? prevDrive.quarter : 1;
    const prevMine = Math.max(0, Number(prevDrive?.score_mine ?? 0)) || 0;
    const prevOpp = Math.max(0, Number(prevDrive?.score_opponent ?? 0)) || 0;

    const res = await fetch(`/api/games/${gameId}/drives`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        side_of_ball: payload?.side_of_ball === "defense" ? "defense" : "offense",
        quarter: payload?.quarter ?? prevQuarter,
        score_mine: payload?.score_mine ?? prevMine,
        score_opponent: payload?.score_opponent ?? prevOpp,
        starting_down: payload?.starting_down ?? 1,
        starting_distance: payload?.starting_distance ?? 10,
        starting_side: payload?.starting_side ?? "OWN",
        starting_yard_line: payload?.starting_yard_line ?? 25,
        starting_absolute_yard: parseFieldPosition(payload?.starting_side ?? "OWN", payload?.starting_yard_line ?? 25),
      }),
    });

    if (!res.ok) {
      addToast(COULDNT_SAVE, "error");
      return;
    }

    const data = await res.json();
    if (!data) return;

    const newDrive: Drive = { ...(data as Drive), plays: [] };
    setDrives((prev) => [...prev, newDrive]);
    setExpandedDriveIds([newDrive.id]);
    setActiveDrive(newDrive.id);
    addToast(`Drive ${newDrive.drive_number ?? drives.length + 1} started`, "success");
    return newDrive;
  }

  async function setGameEnded(nextEnded: boolean, finalScores?: { my_score: number; opponent_score: number }) {
    if (!gameId || endingGame) return;
    setEndingGame(true);
    try {
      const wasEnded = Boolean(game?.ended_at);
      const endedAt = nextEnded ? new Date().toISOString() : null;
      const body: Record<string, unknown> = { ended_at: endedAt };
      if (nextEnded && finalScores) {
        body.my_score = finalScores.my_score;
        body.opponent_score = finalScores.opponent_score;
      }
      const res = await fetch(`/api/games/${gameId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        addToast(COULDNT_SAVE, "error");
        return;
      }
      const updated = (await res.json()) as GameSession;
      setGame(updated);
      if (nextEnded && !wasEnded && !wasMilestoneFired("full_game", gameId)) {
        markMilestoneFired("full_game", gameId);
        emitProductEvent("full_game", { gameId });
      }
      setShowEndGameModal(false);
      if (nextEnded) setShowLogger(false);
      await refresh();
    } finally {
      setEndingGame(false);
    }
  }

  async function saveDrive(drive: Drive, opts?: { silent?: boolean; skipRefresh?: boolean }): Promise<boolean> {
    const startingYardLine =
      typeof drive.starting_yard_line === "number" && drive.starting_yard_line >= 1 && drive.starting_yard_line <= 50
        ? drive.starting_yard_line
        : null;
    const startingSide = drive.starting_side === "OWN" || drive.starting_side === "OPP" ? drive.starting_side : null;
    const startingAbsolute =
      startingYardLine && startingSide ? parseFieldPosition(startingSide, startingYardLine) : null;
    const res = await fetch(`/api/drives/${drive.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        score_mine: Math.max(0, Number(drive.score_mine ?? 0)) || 0,
        score_opponent: Math.max(0, Number(drive.score_opponent ?? 0)) || 0,
        quarter: drive.quarter != null ? Number(drive.quarter) : null,
        starting_down: drive.starting_down != null ? Number(drive.starting_down) : null,
        starting_distance: drive.starting_distance != null ? Number(drive.starting_distance) : null,
        is_inches: Boolean(drive.is_inches),
        starting_side: startingSide,
        starting_yard_line: startingYardLine,
        starting_absolute_yard: startingAbsolute,
        note: drive.note ?? null,
      }),
    });
    if (!res.ok) {
      addToast(COULDNT_SAVE, "error");
      return false;
    }
    if (!opts?.silent) addToast("Saved.", "success");
    if (!opts?.skipRefresh) await refresh();
    return true;
  }

  function scheduleDrivePersist(driveId: string) {
    if (drivePersistTimerRef.current) clearTimeout(drivePersistTimerRef.current);
    drivePersistTimerRef.current = setTimeout(() => {
      const row = drivesRef.current.find((d) => d.id === driveId);
      if (row) void saveDrive(row, { silent: true, skipRefresh: true });
    }, 500);
  }

  function patchDriveAndPersist(id: string, partial: Partial<Drive>) {
    setDrives((all) => all.map((d) => (d.id === id ? { ...d, ...partial } : d)));
    scheduleDrivePersist(id);
  }

  async function handlePossessionEndedAfterLog(args: { driveId: string; storedResultTag: string }) {
    const { driveId, storedResultTag } = args;
    setShowLogger(false);
    setActiveDrive(driveId);

    const norm = storedResultTag.trim().toUpperCase().replace(/\s+/g, "_");
    let bump = 0;
    if (norm === "TOUCHDOWN") bump = 7;
    else if (norm === "FIELD_GOAL") bump = 3;

    if (bump > 0) {
      const dr = drivesRef.current.find((d) => d.id === driveId);
      if (dr) {
        await saveDrive(
          { ...dr, score_mine: Math.max(0, Number(dr.score_mine ?? 0) + bump) },
          { silent: true, skipRefresh: true },
        );
      }
    }
    await refresh({ pruneClosedPossessions: true });
  }

  async function performDeleteDrive(driveId: string) {
    const prevDrives = drives;
    setDrives((current) => current.filter((d) => d.id !== driveId));
    const res = await fetch(`/api/drives/${driveId}`, { method: "DELETE" });
    if (!res.ok) {
      setDrives(prevDrives);
      addToast(COULDNT_SAVE, "error");
      return;
    }
    setExpandedDriveIds((current) => current.filter((id) => id !== driveId));
    addToast("Drive removed.", "success");
    await refresh();
  }

  function openForCreate(driveId: string) {
    const prevLoggerOpen = loggerOpenFlowIdRef.current;
    if (prevLoggerOpen) {
      endCriticalFlow(prevLoggerOpen, "cancelled", { reason: "superseded_by_new_open" });
    }
    const drive = drivesRef.current.find((d) => d.id === driveId);
    const hasSheetId = Boolean(
      drive && (drive.side_of_ball === "defense" ? game?.defensive_play_sheet_id : game?.play_sheet_id),
    );
    loggerOpenFlowIdRef.current = startCriticalFlow("film_logger_open_with_sheet", {
      gameId,
      driveId,
      hasSheetId,
    });
    setActiveDrive(driveId);
    setShowLogger(true);
    setExpandedDriveIds([driveId]);
  }

  async function performDeletePlay(playId: string) {
    const prevDrives = drives;
    setDrives((current) =>
      current.map((drive) => ({
        ...drive,
        plays: (drive.plays ?? []).filter((play) => play.id !== playId),
      })),
    );
    const res = await fetch(`/api/plays/${playId}`, { method: "DELETE" });
    if (!res.ok) {
      setDrives(prevDrives);
      addToast(COULDNT_SAVE, "error");
      return;
    }
    addToast("Call removed.", "success");
    await refresh();
  }

  function findPlayById(playId: string): LoggedPlay | undefined {
    for (const d of drives) {
      const p = (d.plays ?? []).find((x) => x.id === playId);
      if (p) return p;
    }
    return undefined;
  }

  const totalPlays = countCoachCallsInGame(drives);
  const totalPlayRowsInGame = countPlaysInGame(drives);
  const totalDrives = drives.length;
  const totalYards = drives.reduce(
    (sum, d) =>
      sum +
      (d.plays ?? []).reduce((s, p) => {
        const playName = String(p.play_name ?? "").trim().toLowerCase();
        const resultTag = String(p.result_tag ?? "").trim().toLowerCase();
        if (playName === "punt" || resultTag === "punt") return s;
        return s + (p.yards_gained ?? 0);
      }, 0),
    0,
  );
  const tds = drives.reduce(
    (sum, d) =>
      sum +
      (d.plays ?? []).filter((p) => {
        const playName = String(p.play_name ?? "").trim().toLowerCase();
        const resultTag = String(p.result_tag ?? "").trim().toLowerCase();
        return playName !== "punt" && resultTag === "touchdown";
      }).length,
    0,
  );
  const turnovers = drives.reduce(
    (sum, d) =>
      sum +
      (d.plays ?? []).filter((p) => {
        const playName = String(p.play_name ?? "").trim().toLowerCase();
        const resultTag = String(p.result_tag ?? "").trim().toLowerCase();
        return playName !== "punt" && resultTag === "turnover";
      }).length,
    0,
  );
  const isGameEnded = Boolean(game?.ended_at);
  const lastDriveId = drives[drives.length - 1]?.id ?? "";
  const pendingPlayRowForModal = pendingPlayDelete ? findPlayById(pendingPlayDelete) : undefined;
  const activeDriveObj = drives.find((d) => d.id === activeDrive) ?? drives[0] ?? null;

  if (!pageReady) {
    return <GameDetailSkeleton />;
  }

  if (loadError) {
    return (
      <section className="space-y-4 py-6 text-center">
        <BackNavLink />
        <h1 className="font-heading text-3xl leading-none font-bold uppercase tracking-[0.14em] text-white sm:text-4xl">Game not found</h1>
        <p className="font-sans text-sm text-slate-400">This game doesn&apos;t exist or you don&apos;t have access to it.</p>
        <Button asChild variant="default" className="inline-block px-5 py-2 text-sm">
          <Link href="/film">Back to Film Room</Link>
        </Button>
      </section>
    );
  }

  return (
    <>
      <div
        className={cn(
          loggerSidebarOpen && appShellSituationWorkspaceClass,
          loggerSidebarOpen && appShellSituationWorkspaceWithBrowseClass,
          loggerSidebarOpen && "flex min-h-0 flex-col md:flex",
        )}
      >
        <div className={cn(loggerSidebarOpen && "flex min-h-0 flex-1 items-start gap-0")}>
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                loggerSidebarOpen
                  ? appShellSituationWorkspaceInnerWithBrowseClass
                  : appShellSituationWorkspaceInnerClass,
                "min-w-0 py-0 md:py-1 lg:py-2",
                !loggerSidebarOpen && "mx-auto",
              )}
            >
              <section className="space-y-0">
              <GameDetailHeader
                game={game}
                stats={{ playCount: totalPlays, driveCount: totalDrives, totalYards, tds, turnovers }}
                isGameEnded={isGameEnded}
                endingGame={endingGame}
                onAddDrive={() => setShowDriveSetup(true)}
                onEndGame={() => setShowEndGameModal(true)}
                onResumeGame={() => void setGameEnded(false)}
              />

              <Tabs value={detailTab} onValueChange={(v) => setDetailTab(v as DetailTab)} className="w-full">
                <TabsList
                  aria-label="Game detail views"
                  data-film-game-dropdown-clamp
                  className="grid h-auto w-full grid-cols-2 gap-0 rounded-none border-b border-slate-800 bg-transparent p-0 text-muted-foreground"
                >
                  <TabsTrigger value="drives" className={gameDetailTabTriggerClass}>
                    Drive Summary
                  </TabsTrigger>
                  <TabsTrigger value="tendencies" className={gameDetailTabTriggerClass}>
                    Tendencies
                  </TabsTrigger>
                </TabsList>

                <div className="pt-3">
                  <TabsContent value="drives" className="mt-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                    {detailTab === "drives" && game ? (
                      <DriveList
                        drives={drives}
                        isGameEnded={isGameEnded}
                        lastDriveId={lastDriveId}
                        expandedDriveIds={expandedDriveIds}
                        onExpandedDriveIdsChange={setExpandedDriveIds}
                        onActiveDriveChange={setActiveDrive}
                        onPatchDrive={patchDriveAndPersist}
                        onRequestDeleteDrive={setPendingDriveDelete}
                        onRequestDeletePlay={setPendingPlayDelete}
                        onOpenLogger={openForCreate}
                        onShowDriveSetup={() => setShowDriveSetup(true)}
                      />
                    ) : null}
                  </TabsContent>
                  <TabsContent value="tendencies" className="mt-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                    {detailTab === "tendencies" ? <FilmGameTendenciesBody gameId={gameId} /> : null}
                  </TabsContent>
                </div>
              </Tabs>
            </section>
            </div>
          </div>

          {game && activeDriveObj && loggerSidebarOpen ? (
            <FilmPlayLoggerOverlay
              layout="sidebar"
              open={showLogger}
              gameId={gameId}
              game={game}
              activeDrive={activeDriveObj}
              loggerOpenFlowId={loggerOpenFlowIdRef.current}
              totalPlayRowsInGame={totalPlayRowsInGame}
              totalCoachCallsInGame={totalPlays}
              allGameCoachCalls={allGameCoachCalls}
              onClose={() => setShowLogger(false)}
              onRefresh={refresh}
              onPossessionEndedAfterLog={(payload) => {
                void handlePossessionEndedAfterLog(payload);
              }}
            />
          ) : null}
        </div>
      </div>

      {game && activeDriveObj && showLogger && !mdUp ? (
        <FilmPlayLoggerOverlay
          layout="overlay"
          open={showLogger}
          gameId={gameId}
          game={game}
          activeDrive={activeDriveObj}
          loggerOpenFlowId={loggerOpenFlowIdRef.current}
          totalPlayRowsInGame={totalPlayRowsInGame}
          totalCoachCallsInGame={totalPlays}
          allGameCoachCalls={allGameCoachCalls}
          onClose={() => setShowLogger(false)}
          onRefresh={refresh}
          onPossessionEndedAfterLog={(payload) => {
            void handlePossessionEndedAfterLog(payload);
          }}
        />
      ) : null}

      <FilmEndGameScoreDialog
        open={showEndGameModal}
        endingGame={endingGame}
        scoreMine={endGameScoreMine}
        scoreOpp={endGameScoreOpp}
        onOpenChange={setShowEndGameModal}
        onScoreMineChange={setEndGameScoreMine}
        onScoreOppChange={setEndGameScoreOpp}
        onConfirm={(scores) => void setGameEnded(true, scores)}
      />

      <FilmDriveSetupOverlay
        open={showDriveSetup && Boolean(game)}
        drives={drives}
        onClose={() => setShowDriveSetup(false)}
        onSubmit={async (values) => {
          const created = await createDrive(values);
          if (!created) return;
          setShowDriveSetup(false);
          openForCreate(created.id);
        }}
      />

      <ConfirmDestructiveModal
        open={pendingDriveDelete !== null}
        onClose={() => setPendingDriveDelete(null)}
        title="Delete drive"
        confirmLabel="Delete drive"
        message={
          <>
            Removes drive{" "}
            <strong className="font-semibold text-white">
              {drives.find((d) => d.id === pendingDriveDelete)?.drive_number ?? "—"}
            </strong>{" "}
            and every call on it. Can&apos;t be undone.
          </>
        }
        busy={deleteBusy}
        onConfirm={async () => {
          if (!pendingDriveDelete) return;
          setDeleteBusy(true);
          try {
            await performDeleteDrive(pendingDriveDelete);
            setPendingDriveDelete(null);
          } finally {
            setDeleteBusy(false);
          }
        }}
      />

      <ConfirmDestructiveModal
        open={pendingPlayDelete !== null}
        onClose={() => setPendingPlayDelete(null)}
        title="Delete play"
        confirmLabel="Delete play"
        message={
          <>
            Drops this call:{" "}
            <strong className="font-mono font-semibold text-white">
              {pendingPlayRowForModal
                ? `${pendingPlayRowForModal.formation} · ${normalizePlayName(pendingPlayRowForModal.play_name)}`
                : "—"}
            </strong>
            . Can&apos;t be undone.
          </>
        }
        busy={deleteBusy}
        onConfirm={async () => {
          if (!pendingPlayDelete) return;
          setDeleteBusy(true);
          try {
            await performDeletePlay(pendingPlayDelete);
            setPendingPlayDelete(null);
          } finally {
            setDeleteBusy(false);
          }
        }}
      />
    </>
  );
}
