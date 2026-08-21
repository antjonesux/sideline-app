"use client";
// QA26: Design system enforcement pass — replaced inline styles, unified icons, enforced card/typography tokens

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { tendenciesQueryKeys } from "@/lib/tendenciesQueryKeys";
import { GameStatsInline } from "@/components/film/GameStatsInline";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { PlayLoggerV2 } from "@/components/film/PlayLoggerV2";
import { DriveCardOutcomeBadge } from "@/components/film/DriveCardOutcomeBadge";
import { DriveInlineScores } from "@/components/film/DriveInlineScores";
import { DriveSetupForm, type Quarter } from "@/components/film/DriveSetupForm";
import { DriveStartingFieldPanel } from "@/components/film/DriveStartingFieldPanel";
import {
  filmDriveDetailCardAccordionTriggerClass,
  filmDriveDetailCardChevronButtonClass,
  filmDriveDetailCardDriveLabelClass,
  filmDriveDetailCardExpandedPanelClass,
  filmDriveDetailCardHeaderRowClass,
  filmDriveDetailCardKebabTriggerClass,
  filmDriveDetailCardMetaLineClass,
  filmDriveDetailCardOuterClass,
  filmDriveDetailCardTitleRowClass,
} from "@/components/film/filmDriveDetailCardClasses";
import { ConfirmDestructiveModal } from "@/components/shared/ConfirmDestructiveModal";
import { DataTable } from "@/components/shared/DataTable";
import { drivePlayTableColumns } from "@/components/shared/drivePlayTableColumns";
import { FilmGameTendenciesBody } from "@/components/film/FilmGameTendenciesBody";
import { GameDetailSkeleton } from "@/components/shared/AppSkeleton";
import { BackNavLink } from "@/components/shared/BackNavLink";
import { useToastStore } from "@/store/toastStore";
import {
  COULDNT_SAVE,
  FILM_END_GAME_CONFIRM_CTA,
  FILM_END_GAME_SCORE_BODY,
  FILM_END_GAME_SCORE_TITLE,
  FILM_RESUME_GAME_CTA,
} from "@/lib/coachCopy";
import { fetchCfb26PlaybookEntries } from "@/lib/filmLoggerCatalogFetch";
import { filmLoggerQueryKeys } from "@/lib/filmLoggerQueryKeys";
import { useScrollLock } from "@/lib/useScrollLock";
import type { Drive, GameSession, LoggedPlay } from "@/lib/types";
import { modalCtaFooterClass, modalDialogTitleClass, overlayZ, responsiveOverlayBottomShellPositionClass, responsiveOverlayDialogContentClass, responsiveOverlayInnerCardClass, responsiveOverlayShellPositionClass } from "@/lib/constants/designTokens";
import { cn, normalizePlayName } from "@/lib/utils";
import { parseFieldPosition } from "@/lib/fieldPosition";
import { closeAllDropdownMenus } from "@/lib/dropdownMenuRegistry";
import { getDrivePossessionOutcome, type DrivePossessionOutcome } from "@/lib/driveOutcome";
import { absoluteYardAfterLoggedPlay, replayGameStateFromPlays } from "@/lib/gameStateEngine";
import { countCoachCallsInGame, countPlaysInGame, isCoachCallPlay } from "@/lib/filmPlayCounting";
import { endCriticalFlow, startCriticalFlow } from "@/lib/perfInstrumentation";
import { emitProductEvent, markMilestoneFired, wasMilestoneFired } from "@/lib/productAnalytics";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function quarterFromDriveForSetup(q: number | null | undefined): Quarter {
  if (q == null || q < 1) return "1";
  if (q >= 5) return "OT";
  const clamped = Math.min(4, Math.floor(q)) as 1 | 2 | 3 | 4;
  return String(clamped) as Quarter;
}

function getDriveResult(plays: LoggedPlay[] | undefined | null): DrivePossessionOutcome {
  return getDrivePossessionOutcome(plays);
}

function normalizeResultTag(tag: string): string {
  return tag.trim().toUpperCase().replace(/_/g, " ");
}

function formatDate(isoDate: string): string {
  const parts = isoDate.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return isoDate;
  const [y, m, d] = parts;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(y, m - 1, d));
}

/** Drive summary header badge label (short codes mapped to display copy in `DriveCardOutcomeBadge`). */
function getDriveSummaryOutcomeLabel(
  drive: Drive,
  opts: { isLastDrive: boolean; isGameEnded: boolean },
): string {
  const plays = drive.plays ?? [];
  const outcome = getDriveResult(plays);
  const last = plays[plays.length - 1];
  if (opts.isLastDrive && opts.isGameEnded) return "GAME ENDED";

  if (outcome === "TOUCHDOWN") return "TD";
  if (outcome === "FIELD_GOAL") return "FG";
  if (outcome === "TURNOVER") return "TURNOVER";
  if (outcome === "PUNT") return "PUNT";
  if (outcome === "TURNOVER_ON_DOWNS") return "TOD";
  if (outcome === "NO_PLAYS") return "NO PLAYS";

  if (last) {
    const norm = normalizeResultTag(last.result_tag);
    if (norm === "FIRST DOWN") return "FIRST DOWN";
    if (norm === "NO GAIN") return "NO GAIN";
  }

  if (opts.isLastDrive) return "ACTIVE";
  return "RECORDED";
}

type GameLogPageProps = { params: Promise<{ gameId: string }> };

type DetailTab = "drives" | "tendencies";

const gameDetailTabTriggerClass =
  "flex min-h-12 w-full items-center justify-center rounded-none border-b-2 border-transparent bg-transparent px-2 text-center text-sm font-sans font-medium text-slate-400 shadow-none ring-offset-transparent transition-colors data-[state=active]:border-amber-400 data-[state=active]:bg-transparent data-[state=active]:text-slate-100 data-[state=active]:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400";

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
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);
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
  /** End-game uses Radix `Dialog` (body scroll lock). Logger overlay still uses legacy `fixed` shell. */
  useScrollLock(showLogger);

  const drivePlayCols = useMemo(() => drivePlayTableColumns(), []);

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
            endCriticalFlow(flowId, "error", {
              gameOk: gRes.ok,
              drivesOk: dRes.ok,
            });
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
            endCriticalFlow(flowId, "ok", {
              driveCount: loadedDriveCount,
              hasPlaySheet: loadedHasSheet,
            });
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

  useEffect(() => {
    setActiveSheetId(game?.play_sheet_id ?? null);
  }, [game?.play_sheet_id]);

  async function createDrive(payload?: Partial<Drive>) {
    if (!gameId) return;

    const prevDrive = drives[drives.length - 1];
    const prevQuarter = prevDrive?.quarter != null && prevDrive.quarter >= 1 ? prevDrive.quarter : 1;
    const prevMine = Math.max(0, Number(prevDrive?.score_mine ?? 0)) || 0;
    const prevOpp = Math.max(0, Number(prevDrive?.score_opponent ?? 0)) || 0;

    const res = await fetch(`/api/games/${gameId}/drives`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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

  async function setGameEnded(
    nextEnded: boolean,
    finalScores?: { my_score: number; opponent_score: number },
  ) {
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
    const saveBody = (await res.json().catch(() => ({}))) as { error?: string };
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
    loggerOpenFlowIdRef.current = startCriticalFlow("film_logger_open_with_sheet", {
      gameId,
      driveId,
      hasSheetId: Boolean(activeSheetId),
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
  const showPartialWarning = totalDrives > 0 && totalPlays < 10;

  const resultLabel = game?.result === "W" ? "W" : game?.result === "L" ? "L" : "—";
  const scoreMine = game?.my_score ?? "—";
  const scoreOpp = game?.opponent_score ?? "—";
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

  const filmGameSecondaryActionClass =
    "inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-slate-700 px-3 py-1.5 font-sans text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500";

  return (
    <section className="space-y-0">
      <div className="space-y-3 pb-4">
        <BackNavLink />
        <h1 className="font-heading text-lg font-bold uppercase tracking-[0.1em] text-slate-100 w-full min-w-0 text-lg leading-snug sm:text-xl">
          {game ? (
            <>
              {game.my_playbook}
              <span className="mx-2 font-body font-normal text-slate-500">vs</span>
              {game.opponent_team}
            </>
          ) : (
            "…"
          )}
        </h1>

        <p className="font-body text-sm text-slate-400">
          <span className="font-mono font-semibold text-slate-200">{resultLabel}</span>
          <span className="mx-2 font-mono tabular-nums text-slate-200">
            {scoreMine} – {scoreOpp}
          </span>
          {game?.game_date ? (
            <>
              <span className="mx-2 text-slate-600">·</span>
              <span>{formatDate(game.game_date)}</span>
            </>
          ) : null}
        </p>
        <div className="overflow-x-auto touch-pan-x overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none]">
          <GameStatsInline playCount={totalPlays} driveCount={totalDrives} totalYards={totalYards} tds={tds} turnovers={turnovers} />
        </div>
        <div className="flex min-h-11 flex-wrap gap-2">
          {!isGameEnded ? (
            <button type="button" onClick={() => setShowDriveSetup(true)} className={filmGameSecondaryActionClass}>
              <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-emerald-400 motion-safe:animate-pulse" aria-hidden />
              Add Drive
            </button>
          ) : null}
          {isGameEnded ? (
            <button
              type="button"
              disabled={endingGame}
              onClick={() => void setGameEnded(false)}
              className={`${filmGameSecondaryActionClass} border-emerald-700/80 text-emerald-200 hover:border-emerald-500 hover:text-emerald-50`}
            >
              <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-emerald-400 motion-safe:animate-pulse" aria-hidden />
              {FILM_RESUME_GAME_CTA}
            </button>
          ) : (
            <button type="button" onClick={() => setShowEndGameModal(true)} className={filmGameSecondaryActionClass}>
              End Game
            </button>
          )}
        </div>
      </div>

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
            {detailTab === "drives" ? (
          <div className="space-y-4">
            {game && drives.length === 0 ? (
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-center font-sans text-sm text-slate-400">No drives yet.</div>
            ) : null}

            <div className="flex flex-col gap-3">
            {drives.map((drive) => {
        const playCount = drive.plays?.length ?? 0;
        const outcomeLabel = getDriveSummaryOutcomeLabel(drive, { isLastDrive: drive.id === lastDriveId, isGameEnded });
        const isExpanded = expandedDriveIds.includes(drive.id);
        const mine = drive.score_mine ?? 0;
        const theirs = drive.score_opponent ?? 0;
        function toggleDriveExpanded() {
          setExpandedDriveIds((current) => {
            const opening = !current.includes(drive.id);
            if (opening) {
              setActiveDrive(drive.id);
              return [drive.id];
            }
            return current.filter((id) => id !== drive.id);
          });
        }

        const quarterMeta =
          drive.quarter != null && drive.quarter >= 5 ? "OT" : drive.quarter != null ? `Q${drive.quarter}` : "Q1";
        const metaLine = `${quarterMeta} · ${mine}-${theirs} · ${playCount} ${playCount === 1 ? "call" : "calls"}`;

        return (
          <div key={drive.id} className={filmDriveDetailCardOuterClass}>
            <div className={filmDriveDetailCardHeaderRowClass}>
              <button
                type="button"
                data-no-press
                className={filmDriveDetailCardAccordionTriggerClass}
                aria-expanded={isExpanded}
                aria-label={isExpanded ? "Collapse drive" : "Expand drive"}
                onClick={toggleDriveExpanded}
              >
                <div className={filmDriveDetailCardTitleRowClass}>
                  <span className={filmDriveDetailCardDriveLabelClass}>
                    DRIVE {drive.drive_number}
                  </span>
                  <span className="shrink-0">
                    <DriveCardOutcomeBadge label={outcomeLabel} />
                  </span>
                </div>
                <span className={filmDriveDetailCardMetaLineClass}>{metaLine}</span>
              </button>
              <DropdownMenu
                aria-label="Drive actions"
                clampMenuBelowSelector="[data-film-game-dropdown-clamp]"
                triggerClassName={filmDriveDetailCardKebabTriggerClass}
                items={[
                  {
                    label: "Delete Drive",
                    destructive: true,
                    onClick: () => {
                      setPendingDriveDelete(drive.id);
                    },
                  },
                ]}
              />
              <button
                type="button"
                data-no-press
                className={filmDriveDetailCardChevronButtonClass}
                aria-expanded={isExpanded}
                aria-label={isExpanded ? "Collapse drive" : "Expand drive"}
                onClick={toggleDriveExpanded}
              >
                <svg
                  className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>

            {isExpanded ? (
              <div className={filmDriveDetailCardExpandedPanelClass}>
                <div className="mb-3 flex flex-col gap-3">
                  <div>
                    <p className="mb-1 font-sans text-xs font-normal uppercase tracking-widest text-slate-500 dark:text-slate-500">Quarter</p>
                    <div className="flex flex-wrap gap-2">
                      {([1, 2, 3, 4] as const).map((q) => {
                        const effQ = drive.quarter == null ? 1 : drive.quarter;
                        const selected = effQ === q && effQ < 5;
                        return (
                          <button
                            key={q}
                            type="button"
                            className={`min-h-11 min-w-[2.75rem] rounded-lg border px-2 font-mono text-xs font-medium uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                              selected
                                ? "border-transparent bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white"
                                : "border-slate-700 text-slate-400 dark:border-slate-700 dark:text-slate-400"
                            }`}
                            onClick={() => patchDriveAndPersist(drive.id, { quarter: q })}
                          >
                            {q}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        className={`min-h-11 min-w-[2.75rem] rounded-lg border px-2 font-mono text-xs font-medium uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                          drive.quarter != null && drive.quarter >= 5
                            ? "border-transparent bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white"
                            : "border-slate-700 text-slate-400 dark:border-slate-700 dark:text-slate-400"
                        }`}
                        onClick={() => patchDriveAndPersist(drive.id, { quarter: 5 })}
                      >
                        OT
                      </button>
                    </div>
                  </div>
                  <DriveInlineScores
                    key={drive.id}
                    driveId={drive.id}
                    scoreMine={drive.score_mine}
                    scoreOpponent={drive.score_opponent}
                    onSaveBoth={(mine, theirs) => patchDriveAndPersist(drive.id, { score_mine: mine, score_opponent: theirs })}
                  />
                  <DriveStartingFieldPanel drive={drive} onPersist={(partial) => patchDriveAndPersist(drive.id, partial)} />
                </div>
                <DataTable
                  columns={drivePlayCols}
                  equalColumns
                  rows={(drive.plays ?? []).map((p) => ({
                    ...p,
                    ending_absolute_yard: absoluteYardAfterLoggedPlay(p, drive.drive_number),
                  }))}
                  getRowKey={(p) => p.id}
                  rowClassName="hover:bg-white/[0.02]"
                  onRowClick={undefined}
                  onRowContextMenu={(e, p) => {
                    e.preventDefault();
                    setPendingPlayDelete(p.id);
                  }}
                />
                <div className="border-t border-slate-800/80 py-3">
                  {(() => {
                    const driveOutcome = getDriveResult(drive.plays);
                    const canLog =
                      !isGameEnded && (driveOutcome === "ACTIVE" || driveOutcome === "NO_PLAYS");
                    return canLog ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full border-dashed py-3 text-sm"
                        onClick={() => openForCreate(drive.id)}
                      >
                        Log a call
                      </Button>
                    ) : isGameEnded ? (
                      <p className="text-center font-sans text-xs text-slate-500">Game ended — resume to log calls</p>
                    ) : (
                      <p className="text-center font-sans text-xs text-slate-500">Drive ended</p>
                    );
                  })()}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
              {drives.length > 0 && !isGameEnded ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full border-dashed py-3 text-sm"
                  onClick={() => setShowDriveSetup(true)}
                >
                  Add Drive
                </Button>
              ) : null}
            </div>

            {game && showPartialWarning ? (
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 !border-amber-800/50 bg-amber-500/10 text-sm text-amber-100" role="status" aria-live="polite">
                <p className="font-medium text-amber-200">Partial film</p>
                <p className="mt-1 text-amber-100/90">Partial film may skew tendencies.</p>
              </div>
            ) : null}
          </div>
            ) : null}
          </TabsContent>
          <TabsContent value="tendencies" className="mt-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
            {detailTab === "tendencies" ? <FilmGameTendenciesBody gameId={gameId} /> : null}
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={showEndGameModal} onOpenChange={setShowEndGameModal}>
        <DialogContent
          overlayClassName="z-[189] bg-black/70"
          className={cn(
            responsiveOverlayDialogContentClass("md", "z-[190]"),
            "[&>button]:right-4 [&>button]:top-4 [&>button]:ring-offset-slate-900",
          )}
        >
          <DialogHeader className="space-y-0 border-b border-slate-800 px-4 py-3 text-left sm:px-6 sm:text-left">
            <DialogTitle className={cn("pr-10 text-left", modalDialogTitleClass)}>{FILM_END_GAME_SCORE_TITLE}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <DialogDescription asChild>
              <p className="font-body text-sm leading-relaxed text-slate-300">{FILM_END_GAME_SCORE_BODY}</p>
            </DialogDescription>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="film-end-score-mine" className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-slate-500">
                  Your score
                </label>
                <input
                  id="film-end-score-mine"
                  inputMode="numeric"
                  className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 font-mono tabular-nums text-white"
                  value={endGameScoreMine}
                  onChange={(e) => setEndGameScoreMine(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <div>
                <label htmlFor="film-end-score-opp" className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-slate-500">
                  Their score
                </label>
                <input
                  id="film-end-score-opp"
                  inputMode="numeric"
                  className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 font-mono tabular-nums text-white"
                  value={endGameScoreOpp}
                  onChange={(e) => setEndGameScoreOpp(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>
          </div>
          <div className={modalCtaFooterClass}>
            <Button type="button" variant="secondary" className="flex-1 py-3" disabled={endingGame} onClick={() => setShowEndGameModal(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1 py-3"
              disabled={endingGame}
              onClick={() => {
                const mine = Math.max(0, Number.parseInt(endGameScoreMine.replace(/\D/g, "") || "0", 10) || 0);
                const opp = Math.max(0, Number.parseInt(endGameScoreOpp.replace(/\D/g, "") || "0", 10) || 0);
                void setGameEnded(true, { my_score: mine, opponent_score: opp });
              }}
            >
              {FILM_END_GAME_CONFIRM_CTA}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showDriveSetup && game ? (
        <div className="fixed inset-0 z-[195] bg-black/60" onClick={() => setShowDriveSetup(false)}>
          <div className={cn("z-[196]", responsiveOverlayBottomShellPositionClass("lg"))} onClick={(e) => e.stopPropagation()}>
            <div className="overflow-hidden rounded-t-xl rounded-b-none border border-slate-700 bg-slate-900 md:rounded-xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 sm:px-6">
                <h2 className={modalDialogTitleClass}>Drive Setup</h2>
                <button type="button" className="p-2 text-slate-400 hover:text-white" onClick={() => setShowDriveSetup(false)}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                    <path d="M6 6 18 18M18 6 6 18" />
                  </svg>
                  <span className="sr-only">Close</span>
                </button>
              </div>
              <DriveSetupForm
                defaultValues={{
                  quarter: quarterFromDriveForSetup(drives[drives.length - 1]?.quarter),
                  score_mine: Math.max(0, Number(drives[drives.length - 1]?.score_mine ?? 0)),
                  score_opponent: Math.max(0, Number(drives[drives.length - 1]?.score_opponent ?? 0)),
                  starting_side: "OWN",
                  starting_yard_line: 25,
                  starting_down: 1,
                  starting_distance: 10,
                }}
                onCancel={() => setShowDriveSetup(false)}
                onSubmit={async (values) => {
                  const created = await createDrive({
                    quarter: values.quarter === "OT" ? 5 : Number(values.quarter),
                    score_mine: values.score_mine,
                    score_opponent: values.score_opponent,
                    starting_side: values.starting_side,
                    starting_yard_line: values.starting_yard_line,
                    starting_down: values.starting_down,
                    starting_distance: values.starting_distance,
                  });
                  if (!created) return;
                  setShowDriveSetup(false);
                  openForCreate(created.id);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {showLogger && game && activeDriveObj ? (
        <>
          <div
            className={cn("fixed inset-0 bg-black/60", overlayZ.filmBackdrop)}
            onClick={() => {
              setShowLogger(false);
            }}
          />
          <div
            className={cn(responsiveOverlayShellPositionClass("4xl"), overlayZ.filmShell)}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={cn(responsiveOverlayInnerCardClass, "bg-slate-900")}>
              <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <h2 className="font-display text-base font-bold uppercase tracking-wider text-slate-100">
                    Play Logger
                  </h2>
                </div>
                <button
                  type="button"
                  data-no-press
                  className="shrink-0 p-2 -mr-2 text-slate-400 hover:text-white"
                  onClick={() => {
                    setShowLogger(false);
                  }}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                    <path d="M6 6 18 18M18 6 6 18" />
                  </svg>
                  <span className="sr-only">Close</span>
                </button>
              </div>
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <PlayLoggerV2
                  gameId={gameId}
                  driveId={activeDriveObj.id}
                  playbook={game.offensive_playbook ?? ""}
                  drive={activeDriveObj}
                  onRefresh={refresh}
                  sheetId={activeSheetId}
                  loggerOpenFlowId={loggerOpenFlowIdRef.current}
                  totalPlayRowsInGame={totalPlayRowsInGame}
                  totalCoachCallsInGame={totalPlays}
                  allGameCoachCalls={allGameCoachCalls}
                  onPossessionEndedAfterLog={(payload) => {
                    void handlePossessionEndedAfterLog(payload);
                  }}
                />
              </div>
            </div>
          </div>
        </>
      ) : null}

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
    </section>
  );
}
