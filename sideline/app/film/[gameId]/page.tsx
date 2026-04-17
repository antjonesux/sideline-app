"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { tendenciesQueryKeys } from "@/lib/tendenciesQueryKeys";
import { EditGameDetailsModal } from "@/components/film/EditGameDetailsModal";
import { GameStatsInline } from "@/components/film/GameStatsInline";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { PlayLogger } from "@/components/film/PlayLogger";
import { ResultBadge } from "@/components/import/ResultBadge";
import { ConfirmDestructiveModal } from "@/components/shared/ConfirmDestructiveModal";
import { DataTable } from "@/components/shared/DataTable";
import { drivePlayTableColumns } from "@/components/shared/drivePlayTableColumns";
import { GameDetailSkeleton } from "@/components/shared/AppSkeleton";
import { BackToFilmLink } from "@/components/shared/BackToFilmLink";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { useToastStore } from "@/store/toastStore";
import { useScrollLock } from "@/lib/useScrollLock";
import type { Drive, GameSession, LoggedPlay } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { normalizePlayName } from "@/lib/utils";
import { parseFieldPosition } from "@/lib/fieldPosition";
import { closeAllDropdownMenus } from "@/lib/dropdownMenuRegistry";

function getDriveResult(
  plays: LoggedPlay[] | undefined | null,
): "TOUCHDOWN" | "TURNOVER" | "PUNT" | "FIELD_GOAL" | "ACTIVE" | "NO_PLAYS" {
  if (!plays || plays.length === 0) return "NO_PLAYS";
  const lastPlay = plays[plays.length - 1];
  if (lastPlay.result_tag === "TOUCHDOWN") return "TOUCHDOWN";
  if (lastPlay.result_tag === "TURNOVER") return "TURNOVER";
  if (lastPlay.result_tag === "PUNT") return "PUNT";
  if (lastPlay.result_tag === "FIELD_GOAL") return "FIELD_GOAL";
  return "ACTIVE";
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

/** Drive summary header badge — same ResultBadge / muted pill split as Tendencies → Game Film. */
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
  if (outcome === "NO_PLAYS") return "NO PLAYS";

  if (last) {
    const norm = normalizeResultTag(last.result_tag);
    if (norm === "FIRST DOWN") return "FIRST DOWN";
    if (norm === "NO GAIN") return "NO GAIN";
  }

  if (opts.isLastDrive) return "ACTIVE";
  return "RECORDED";
}

function DriveSummaryOutcomeBadge({ label }: { label: string }) {
  if (label === "NO PLAYS" || label === "ACTIVE" || label === "RECORDED" || label === "GAME ENDED") {
    return (
      <span className="font-mono shrink-0 rounded-full border border-[#2A2E3A] bg-[#1C1F28] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#A0A3AD]">
        {label}
      </span>
    );
  }
  const resultLabel = label === "TD" ? "TOUCHDOWN" : label === "FG" ? "FIELD_GOAL" : label;
  return <ResultBadge label={resultLabel} />;
}

type GameLogPageProps = { params: Promise<{ gameId: string }> };

export default function GameLogPage({ params }: GameLogPageProps) {
  const { gameId } = use(params);
  const queryClient = useQueryClient();

  const [game, setGame] = useState<GameSession | null>(null);
  const [drives, setDrives] = useState<Drive[]>([]);
  const [expandedDriveIds, setExpandedDriveIds] = useState<string[]>([]);
  const [editingDriveId, setEditingDriveId] = useState<string>("");
  const [activeDrive, setActiveDrive] = useState<string>("");
  const [showLogger, setShowLogger] = useState(false);
  const [editPlay, setEditPlay] = useState<LoggedPlay | null>(null);
  const [showEndGameModal, setShowEndGameModal] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [endingGame, setEndingGame] = useState(false);
  const [pendingDriveDelete, setPendingDriveDelete] = useState<string | null>(null);
  const [pendingPlayDelete, setPendingPlayDelete] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const addToast = useToastStore((s) => s.addToast);
  useScrollLock(showEndGameModal || showLogger);

  const drivePlayCols = useMemo(() => drivePlayTableColumns(), []);

  const refresh = useCallback(async (opts?: { expandDriveId?: string }) => {
    if (!gameId) return;
    const res = await fetch(`/api/games/${gameId}/drives`);
    const data = (await res.json()) as Drive[];
    setDrives(data);
    setExpandedDriveIds((current) => {
      if (opts?.expandDriveId) return [...new Set([...current, opts.expandDriveId])];
      return current;
    });
    setActiveDrive((current) => {
      if (opts?.expandDriveId) return opts.expandDriveId;
      return current || data[0]?.id || "";
    });
    void queryClient.invalidateQueries({ queryKey: tendenciesQueryKeys.all });
    void queryClient.invalidateQueries({ queryKey: ["games", "list"] });
  }, [gameId, queryClient]);

  useEffect(() => {
    if (showLogger) closeAllDropdownMenus();
  }, [showLogger]);

  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    setPageReady(false);
    (async () => {
      try {
        const [gRes, dRes] = await Promise.all([fetch(`/api/games/${gameId}`), fetch(`/api/games/${gameId}/drives`)]);
        const g = (await gRes.json()) as GameSession;
        const d = (await dRes.json()) as Drive[];
        if (cancelled) return;
        setGame(g);
        setDrives(d);
        setExpandedDriveIds([]);
        setActiveDrive((current) => current || d[0]?.id || "");
      } finally {
        if (!cancelled) setPageReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  async function addDrive(opts?: { toastStarted?: boolean }) {
    if (!gameId) return;
    if (game?.ended_at) {
      await fetch(`/api/games/${gameId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ended_at: null }),
      });
      setGame((prev) => (prev ? { ...prev, ended_at: null } : prev));
    }

    const { data: existingDrives } = await supabase.from("drives").select("id").eq("game_session_id", gameId);

    const driveNumber = (existingDrives?.length ?? 0) + 1;

    const { data, error } = await supabase
      .from("drives")
      .insert({
        game_session_id: gameId,
        drive_number: driveNumber,
        score_mine: 0,
        score_opponent: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Drive insert error:", error.message, error.details, error.hint, error.code);
      addToast("Failed to save", "error");
      return;
    }

    if (!data) return;

    const newDrive: Drive = { ...(data as Drive), plays: [] };
    setDrives((prev) => [...prev, newDrive]);
    setExpandedDriveIds((current) => [...new Set([...current, newDrive.id])]);
    setActiveDrive(newDrive.id);
    addToast(opts?.toastStarted ? `Drive ${driveNumber} started` : "Drive added", "success");
  }

  async function setGameEnded(nextEnded: boolean) {
    if (!gameId || endingGame) return;
    setEndingGame(true);
    try {
      const endedAt = nextEnded ? new Date().toISOString() : null;
      const res = await fetch(`/api/games/${gameId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ended_at: endedAt }),
      });
      if (!res.ok) {
        addToast("Failed to save", "error");
        return;
      }
      const updated = (await res.json()) as GameSession;
      setGame(updated);
      setShowEndGameModal(false);
      await refresh();
    } finally {
      setEndingGame(false);
    }
  }

  async function saveDrive(drive: Drive) {
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
      addToast(saveBody.error ?? "Failed to save drive", "error");
      return;
    }
    addToast("Changes saved", "success");
    setEditingDriveId("");
    await refresh();
  }

  async function performDeleteDrive(driveId: string) {
    const prevDrives = drives;
    setDrives((current) => current.filter((d) => d.id !== driveId));
    const res = await fetch(`/api/drives/${driveId}`, { method: "DELETE" });
    if (!res.ok) {
      setDrives(prevDrives);
      addToast("Failed to save", "error");
      return;
    }
    setExpandedDriveIds((current) => current.filter((id) => id !== driveId));
    if (editingDriveId === driveId) setEditingDriveId("");
    addToast("Drive deleted", "success");
    await refresh();
  }

  function openForCreate(driveId: string) {
    setActiveDrive(driveId);
    setEditPlay(null);
    setShowLogger(true);
    setExpandedDriveIds((current) => [...new Set([...current, driveId])]);
  }

  function openForEdit(driveId: string, playToEdit: LoggedPlay) {
    setActiveDrive(driveId);
    setEditPlay(playToEdit);
    setShowLogger(true);
    setExpandedDriveIds((current) => [...new Set([...current, driveId])]);
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
      addToast("Failed to save", "error");
      return;
    }
    addToast("Play removed", "success");
    await refresh();
  }

  function findPlayById(playId: string): LoggedPlay | undefined {
    for (const d of drives) {
      const p = (d.plays ?? []).find((x) => x.id === playId);
      if (p) return p;
    }
    return undefined;
  }

  const totalPlays = drives.reduce(
    (sum, d) =>
      sum +
      (d.plays ?? []).filter((p) => {
        const playName = String(p.play_name ?? "").trim().toLowerCase();
        const resultTag = String(p.result_tag ?? "").trim().toLowerCase();
        return playName !== "punt" && resultTag !== "punt";
      }).length,
    0,
  );
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

  return (
    <section className="space-y-4">
      <div className="space-y-3">
        <Breadcrumb
          segments={[
            { label: "Film", href: "/film" },
            { label: game ? `${game.my_playbook} vs ${game.opponent_team}` : "Game Details" },
          ]}
        />
        <BackToFilmLink />

        <div className="flex items-start justify-between gap-3">
          <h1 className="app-game-title min-w-0 text-xl sm:text-2xl">
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
          {game ? (
            <EditGameDetailsModal
              gameId={gameId}
              game={game}
              onSaved={async (g) => {
                setGame(g);
                await refresh();
              }}
            />
          ) : null}
        </div>

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
        <div className="app-horizontal-scroll-strip">
          <GameStatsInline playCount={totalPlays} driveCount={totalDrives} totalYards={totalYards} tds={tds} turnovers={turnovers} />
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void addDrive()} className="btn-primary px-3 py-2 text-xs">
            Add Drive
          </button>
          {isGameEnded ? (
            <button type="button" onClick={() => void setGameEnded(false)} className="btn-secondary px-3 py-2 text-xs">
              Resume Game
            </button>
          ) : (
            <button type="button" onClick={() => setShowEndGameModal(true)} className="btn-secondary px-3 py-2 text-xs">
              End Game
            </button>
          )}
          <Link
            href={`/film/import?game_session_id=${encodeURIComponent(gameId)}`}
            className="min-h-11 inline-flex items-center px-3 py-2 font-body text-xs text-slate-400 hover:text-slate-200"
          >
            Upload CSV
          </Link>
        </div>
      </div>

      {game && drives.length === 0 ? (
        <div className="app-card app-card-pad text-center font-sans text-sm text-slate-400">
          Add a drive above to open the play logger.
        </div>
      ) : null}

      {showEndGameModal ? (
        <div className="fixed inset-0 z-[190] bg-black/60" onClick={() => setShowEndGameModal(false)}>
          <div
            className="fixed inset-x-0 bottom-0 z-[191] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="app-shell flex w-full max-h-[90vh] flex-col overflow-hidden rounded-t-2xl sm:rounded-xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <h2 className="app-modal-title text-lg">End game?</h2>
                <button type="button" className="app-no-press-scale p-2 -mr-2 text-slate-400 hover:text-white" onClick={() => setShowEndGameModal(false)}>
                  <span aria-hidden>✕</span>
                  <span className="sr-only">Close</span>
                </button>
              </div>
              <div className="space-y-4 overflow-y-auto p-4">
                <p className="font-body text-sm text-slate-400">
                  This will close the game session and return you to the Film Room. You can come back to add more plays later.
                </p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowEndGameModal(false)} className="btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="button" disabled={endingGame} onClick={() => void setGameEnded(true)} className="btn-destructive-solid">
                    End game
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showLogger && game && activeDriveObj ? (
        <>
          <div
            className="fixed inset-0 z-[200] bg-black/60"
            onClick={() => {
              setShowLogger(false);
              setEditPlay(null);
            }}
          />
          <div
            className="fixed inset-0 z-[201] flex flex-col sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="app-card flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-none border border-slate-800 p-0 sm:max-h-[85vh] sm:rounded-xl">
              <div className="flex shrink-0 items-center justify-between border-b border-slate-800 p-3">
                <h2 className="app-section-title text-base">Play Logger</h2>
                <button
                  type="button"
                  className="app-no-press-scale p-2 -mr-2 text-slate-400 hover:text-white"
                  onClick={() => {
                    setShowLogger(false);
                    setEditPlay(null);
                  }}
                >
                  <span aria-hidden>✕</span>
                  <span className="sr-only">Close</span>
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-6">
                <PlayLogger
                  gameSessionId={gameId}
                  myPlaybook={game.offensive_playbook ?? game.my_playbook}
                  opponentScheme={game.opponent_scheme}
                  drive={activeDriveObj}
                  loggedPlaysForGameStats={drives.flatMap((d) => d.plays ?? [])}
                  editPlay={editPlay}
                  onEditPlayChange={setEditPlay}
                  onLogged={refresh}
                  onStartNewDrive={() => void addDrive({ toastStarted: true })}
                  driveMenuItems={[
                    {
                      label: "Edit Drive",
                      onClick: () => {
                        setEditingDriveId(activeDriveObj.id);
                        setShowLogger(false);
                        setEditPlay(null);
                      },
                    },
                    {
                      label: "Delete Drive",
                      destructive: true,
                      onClick: () => {
                        setPendingDriveDelete(activeDriveObj.id);
                        setShowLogger(false);
                        setEditPlay(null);
                      },
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        </>
      ) : null}

      {drives.map((drive) => {
        const playCount = drive.plays?.length ?? 0;
        const yardsGained = (drive.plays ?? []).reduce((sum, p) => sum + p.yards_gained, 0);
        const yardsLabel = yardsGained >= 0 ? `+${yardsGained}` : String(yardsGained);
        const outcomeLabel = getDriveSummaryOutcomeLabel(drive, { isLastDrive: drive.id === lastDriveId, isGameEnded });
        const isExpanded = expandedDriveIds.includes(drive.id);
        const qLabel = drive.quarter != null && drive.quarter >= 5 ? "OT" : drive.quarter != null ? `Q${drive.quarter}` : "—";
        function toggleDriveExpanded() {
          setExpandedDriveIds((current) => {
            const opening = !current.includes(drive.id);
            if (opening) setActiveDrive(drive.id);
            return opening ? [...current, drive.id] : current.filter((id) => id !== drive.id);
          });
        }

        return (
          <div key={drive.id} className="app-card overflow-hidden rounded-xl">
            <div className="app-accordion-header-row flex items-stretch">
              <button
                type="button"
                className="app-no-press-scale flex min-w-0 flex-1 flex-col justify-center py-3 pl-4 pr-2 text-left transition-colors hover:bg-slate-800/40"
                aria-expanded={isExpanded}
                aria-label={isExpanded ? "Collapse drive plays" : "Expand drive plays"}
                onClick={toggleDriveExpanded}
              >
                <div className="flex min-w-0 flex-wrap items-center gap-x-0 gap-y-1 text-[13px] text-slate-400">
                  <span className="font-heading shrink-0 text-[15px] font-bold uppercase tracking-[1.2px] text-amber-400">
                    Drive {drive.drive_number}
                  </span>
                  <span className="mx-1.5 shrink-0 text-slate-500">·</span>
                  <span className="shrink-0">
                    <DriveSummaryOutcomeBadge label={outcomeLabel} />
                  </span>
                  <span className="mx-1.5 shrink-0 text-slate-500">·</span>
                  <span className="font-body whitespace-nowrap">{qLabel}</span>
                  <span className="mx-1.5 shrink-0 text-slate-500">·</span>
                  <span className="whitespace-nowrap">
                    <span className="font-mono tabular-nums text-slate-300">{playCount}</span>
                    <span className="font-body ml-1">{playCount === 1 ? "play" : "plays"}</span>
                  </span>
                  <span className="mx-1.5 shrink-0 text-slate-500">·</span>
                  <span className="whitespace-nowrap">
                    <span className="font-mono tabular-nums text-slate-300">{yardsLabel}</span>
                    <span className="font-body ml-1">yds</span>
                  </span>
                </div>
                <p className="mt-0.5 font-body text-[12px] text-slate-500">
                  <span className="font-mono tabular-nums text-slate-400">{drive.score_mine ?? 0}</span>
                  <span className="font-body">-</span>
                  <span className="font-mono tabular-nums text-slate-400">{drive.score_opponent ?? 0}</span>
                </p>
              </button>
              <DropdownMenu
                aria-label="Drive actions"
                items={[
                  {
                    label: "Edit Drive",
                    onClick: () => {
                      setEditingDriveId(drive.id);
                    },
                  },
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
                tabIndex={-1}
                className="app-no-press-scale inline-flex size-11 shrink-0 items-center justify-center self-center pr-2 text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-slate-200"
                aria-label={isExpanded ? "Collapse drive plays" : "Expand drive plays"}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDriveExpanded();
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`accordion-chevron text-current ${isExpanded ? "open" : ""}`}
                  aria-hidden
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>

            {editingDriveId === drive.id ? (
              <div className="bg-slate-950/40 px-4 py-4 text-xs">
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <label>
                    <span className="app-field-label">Quarter</span>
                    <select
                      className="app-input-compact mt-0.5 w-full"
                      value={String(drive.quarter ?? 1)}
                      onChange={(e) =>
                        setDrives((all) =>
                          all.map((d) => (d.id === drive.id ? { ...d, quarter: parseInt(e.target.value, 10) || 1 } : d)),
                        )
                      }
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                    </select>
                  </label>
                  <label>
                    <span className="app-field-label">Down</span>
                    <select
                      className="app-input-compact mt-0.5 w-full"
                      value={String(drive.starting_down ?? 1)}
                      onChange={(e) =>
                        setDrives((all) =>
                          all.map((d) => (d.id === drive.id ? { ...d, starting_down: parseInt(e.target.value, 10) || 1 } : d)),
                        )
                      }
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                    </select>
                  </label>
                  <label>
                    <span className="app-field-label">Distance</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="app-input-compact mt-0.5 w-full"
                      value={String(drive.starting_distance ?? "")}
                      onChange={(e) =>
                        setDrives((all) =>
                          all.map((d) => {
                            if (d.id !== drive.id) return d;
                            const nextDist =
                              e.target.value.trim() === ""
                                ? null
                                : Math.max(1, parseInt(e.target.value.replace(/\D/g, ""), 10) || 1);
                            return {
                              ...d,
                              starting_distance: nextDist,
                              is_inches: nextDist === 1 ? d.is_inches : false,
                            };
                          }),
                        )
                      }
                    />
                  </label>
                  {drive.starting_distance === 1 ? (
                    <div className="col-span-2">
                      <span className="app-field-label">Short yardage</span>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={`min-h-11 rounded-lg border px-3 font-mono text-xs uppercase ${
                            !drive.is_inches ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-600 text-slate-300"
                          }`}
                          onClick={() =>
                            setDrives((all) => all.map((d) => (d.id === drive.id ? { ...d, is_inches: false } : d)))
                          }
                        >
                          1 yd
                        </button>
                        <button
                          type="button"
                          className={`min-h-11 rounded-lg border px-3 font-mono text-xs uppercase ${
                            drive.is_inches ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-600 text-slate-300"
                          }`}
                          onClick={() =>
                            setDrives((all) => all.map((d) => (d.id === drive.id ? { ...d, is_inches: true } : d)))
                          }
                        >
                          {"\u0026 inches"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <label>
                    <span className="app-field-label">Field side</span>
                    <select
                      className="app-input-compact mt-0.5 w-full"
                      value={drive.starting_side ?? "OWN"}
                      onChange={(e) =>
                        setDrives((all) =>
                          all.map((d) =>
                            d.id === drive.id ? { ...d, starting_side: e.target.value === "OPP" ? "OPP" : "OWN" } : d,
                          ),
                        )
                      }
                    >
                      <option value="OWN">OWN</option>
                      <option value="OPP">OPP</option>
                    </select>
                  </label>
                  <label>
                    <span className="app-field-label">Field position</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="app-input-compact mt-0.5 w-full"
                      value={String(drive.starting_yard_line ?? "")}
                      onChange={(e) =>
                        setDrives((all) =>
                          all.map((d) =>
                            d.id === drive.id
                              ? {
                                  ...d,
                                  starting_yard_line:
                                    e.target.value.trim() === ""
                                      ? null
                                      : Math.max(1, Math.min(50, parseInt(e.target.value.replace(/\D/g, ""), 10) || 1)),
                                }
                              : d,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    <span className="app-field-label">My score</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="app-input-compact mt-0.5 w-full"
                      value={drive.score_mine ?? ""}
                      onChange={(e) =>
                        setDrives((all) => all.map((d) => (d.id === drive.id ? { ...d, score_mine: parseInt(e.target.value, 10) || 0 } : d)))
                      }
                    />
                  </label>
                  <label>
                    <span className="app-field-label">Their score</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="app-input-compact mt-0.5 w-full"
                      value={drive.score_opponent ?? ""}
                      onChange={(e) =>
                        setDrives((all) => all.map((d) => (d.id === drive.id ? { ...d, score_opponent: parseInt(e.target.value, 10) || 0 } : d)))
                      }
                    />
                  </label>
                </div>
                <label className="mb-3 block">
                  <span className="app-field-label">Drive note (optional)</span>
                  <input
                    type="text"
                    className="app-input-compact mt-0.5 w-full"
                    placeholder="e.g. opened with tempo"
                    value={drive.note ?? ""}
                    onChange={(e) => setDrives((all) => all.map((d) => (d.id === drive.id ? { ...d, note: e.target.value } : d)))}
                  />
                </label>
                <div className="mt-8 flex gap-3">
                  <button type="button" className="btn-secondary flex-1 py-3" onClick={() => setEditingDriveId("")}>
                    Cancel
                  </button>
                  <button type="button" className="btn-primary flex-1 py-3" onClick={() => saveDrive(drive)}>
                    Save drive
                  </button>
                </div>
              </div>
            ) : null}

            {isExpanded ? (
              <div className="rounded-b-xl border-t border-slate-800/80 bg-slate-950/40 px-3 py-1 sm:px-4">
                <DataTable
                  columns={drivePlayCols}
                  rows={drive.plays ?? []}
                  getRowKey={(p) => p.id}
                  rowClassName="app-no-press-scale hover:bg-white/[0.02]"
                  onRowClick={(p) => openForEdit(drive.id, p)}
                  onRowContextMenu={(e, p) => {
                    e.preventDefault();
                    setPendingPlayDelete(p.id);
                  }}
                />
                <div className="border-t border-slate-800/80 px-4 py-3">
                  <button
                    type="button"
                    className="btn-secondary w-full border-dashed py-3 text-sm"
                    onClick={() => openForCreate(drive.id)}
                  >
                    Add Play
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      {game && showPartialWarning ? (
        <div className="app-card app-card-pad !border-amber-800/50 bg-amber-500/10 text-sm text-amber-100" role="status" aria-live="polite">
          <p className="font-medium text-amber-200">Partial log notice</p>
          <p className="mt-1 text-amber-100/90">This looks like a partial log. Incomplete data may affect recommendations.</p>
        </div>
      ) : null}

      <ConfirmDestructiveModal
        open={pendingDriveDelete !== null}
        onClose={() => setPendingDriveDelete(null)}
        title="Delete drive?"
        message={
          <>
            This will permanently delete{" "}
            <strong className="font-semibold text-white">
              Drive {drives.find((d) => d.id === pendingDriveDelete)?.drive_number ?? "—"}
            </strong>{" "}
            and all plays in this drive. This can&apos;t be undone.
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
        title="Delete play?"
        message={
          <>
            This will permanently delete{" "}
            <strong className="font-mono font-semibold text-white">
              {pendingPlayRowForModal
                ? `${pendingPlayRowForModal.formation} · ${normalizePlayName(pendingPlayRowForModal.play_name)}`
                : "this play"}
            </strong>
            . This can&apos;t be undone.
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
