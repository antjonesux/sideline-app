"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { tendenciesQueryKeys } from "@/lib/tendenciesQueryKeys";
import { EditGameDetailsModal } from "@/components/film/EditGameDetailsModal";
import { GameStatsInline } from "@/components/film/GameStatsInline";
import { DropdownMenu } from "@/components/shared/DropdownMenu";
import { PlayLoggerV2 } from "@/components/film/PlayLoggerV2";
import { DriveSetupForm } from "@/components/film/DriveSetupForm";
import { DriveInlineScores } from "@/components/film/DriveInlineScores";
import { DriveStartingFieldPanel } from "@/components/film/DriveStartingFieldPanel";
import { ResultBadge } from "@/components/import/ResultBadge";
import { ConfirmDestructiveModal } from "@/components/shared/ConfirmDestructiveModal";
import { DataTable } from "@/components/shared/DataTable";
import { drivePlayTableColumns } from "@/components/shared/drivePlayTableColumns";
import { FilmGameTendenciesBody } from "@/components/film/FilmGameTendenciesBody";
import { GameDetailSkeleton } from "@/components/shared/AppSkeleton";
import { BackToFilmLink } from "@/components/shared/BackToFilmLink";
import { useToastStore } from "@/store/toastStore";
import { COULDNT_SAVE } from "@/lib/coachCopy";
import { useScrollLock } from "@/lib/useScrollLock";
import type { Drive, GameSession, LoggedPlay } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { normalizePlayName } from "@/lib/utils";
import { parseFieldPosition } from "@/lib/fieldPosition";
import { closeAllDropdownMenus } from "@/lib/dropdownMenuRegistry";
import { getDrivePossessionOutcome, type DrivePossessionOutcome } from "@/lib/driveOutcome";
import { replayGameStateFromPlays } from "@/lib/gameStateEngine";

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

/** Drive summary header badge — same ResultBadge / muted pill split as the game Tendencies tab. */
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

function DriveSummaryOutcomeBadge({ label }: { label: string }) {
  if (label === "NO PLAYS" || label === "ACTIVE" || label === "RECORDED" || label === "GAME ENDED") {
    return (
      <span className="font-mono shrink-0 rounded-full border border-[#2A2E3A] bg-[#1C1F28] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#A0A3AD]">
        {label}
      </span>
    );
  }
  const resultLabel =
    label === "TD" ? "TOUCHDOWN" : label === "FG" ? "FIELD_GOAL" : label === "TOD" ? "TURNOVER ON DOWNS" : label;
  return <ResultBadge label={resultLabel} />;
}

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
  const [noteEditDriveId, setNoteEditDriveId] = useState<string>("");
  const [noteDraft, setNoteDraft] = useState("");
  const drivePersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drivesRef = useRef<Drive[]>([]);
  drivesRef.current = drives;
  const [showLogger, setShowLogger] = useState(false);
  const [showDriveSetup, setShowDriveSetup] = useState(false);
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
    if (!noteEditDriveId) setNoteDraft("");
  }, [noteEditDriveId]);

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

  async function createDrive(payload?: Partial<Drive>) {
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
    const prevDrive = drives[drives.length - 1];
    const prevQuarter = prevDrive?.quarter != null && prevDrive.quarter >= 1 ? prevDrive.quarter : 1;
    const prevMine = Math.max(0, Number(prevDrive?.score_mine ?? 0)) || 0;
    const prevOpp = Math.max(0, Number(prevDrive?.score_opponent ?? 0)) || 0;

    const { data, error } = await supabase
      .from("drives")
      .insert({
        game_session_id: gameId,
        drive_number: driveNumber,
        quarter: payload?.quarter ?? prevQuarter,
        score_mine: payload?.score_mine ?? prevMine,
        score_opponent: payload?.score_opponent ?? prevOpp,
        starting_down: payload?.starting_down ?? 1,
        starting_distance: payload?.starting_distance ?? 10,
        starting_side: payload?.starting_side ?? "OWN",
        starting_yard_line: payload?.starting_yard_line ?? 25,
        starting_absolute_yard: parseFieldPosition(payload?.starting_side ?? "OWN", payload?.starting_yard_line ?? 25),
      })
      .select()
      .single();

    if (error) {
      console.error("Drive insert error:", error.message, error.details, error.hint, error.code);
      addToast(COULDNT_SAVE, "error");
      return;
    }

    if (!data) return;

    const newDrive: Drive = { ...(data as Drive), plays: [] };
    setDrives((prev) => [...prev, newDrive]);
    setExpandedDriveIds((current) => [...new Set([...current, newDrive.id])]);
    setActiveDrive(newDrive.id);
    addToast(`Drive ${driveNumber} started`, "success");
    return newDrive;
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
        addToast(COULDNT_SAVE, "error");
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

  async function saveDrive(drive: Drive, opts?: { silent?: boolean }) {
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
      return;
    }
    if (!opts?.silent) addToast("Saved.", "success");
    await refresh();
  }

  function scheduleDrivePersist(driveId: string) {
    if (drivePersistTimerRef.current) clearTimeout(drivePersistTimerRef.current);
    drivePersistTimerRef.current = setTimeout(() => {
      const row = drivesRef.current.find((d) => d.id === driveId);
      if (row) void saveDrive(row, { silent: true });
    }, 500);
  }

  function patchDriveAndPersist(id: string, partial: Partial<Drive>) {
    setDrives((all) => all.map((d) => (d.id === id ? { ...d, ...partial } : d)));
    scheduleDrivePersist(id);
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
    setNoteEditDriveId((id) => (id === driveId ? "" : id));
      addToast("Drive removed.", "success");
    await refresh();
  }

  function openForCreate(driveId: string) {
    setActiveDrive(driveId);
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

  const filmGameSecondaryActionClass =
    "inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-700 px-3 py-1.5 font-sans text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-white";

  return (
    <section className="space-y-0">
      <div
        className="sticky top-0 z-10 -mx-4 bg-slate-950 px-4 sm:-mx-6 sm:px-6"
        data-sticky-game-header
      >
        <div className="max-w-none space-y-2 pb-2 pt-1">
          <BackToFilmLink />

          <div className="flex items-start justify-between gap-3">
            <h1 className="app-game-title min-w-0 text-lg leading-snug sm:text-xl">
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
        </div>

        <div className="mt-3 mb-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowDriveSetup(true)} className={filmGameSecondaryActionClass}>
            Add Drive
          </button>
          {isGameEnded ? (
            <button type="button" onClick={() => void setGameEnded(false)} className={filmGameSecondaryActionClass}>
              Resume Game
            </button>
          ) : (
            <button type="button" onClick={() => setShowEndGameModal(true)} className={filmGameSecondaryActionClass}>
              End Game
            </button>
          )}
          <Link
            href={`/film/import?game_session_id=${encodeURIComponent(gameId)}`}
            className={filmGameSecondaryActionClass}
          >
            Upload CSV
          </Link>
        </div>

        <div className="grid grid-cols-2 border-b border-slate-800" role="tablist" aria-label="Game detail views">
          <button
            type="button"
            role="tab"
            aria-selected={detailTab === "drives"}
            onClick={() => setDetailTab("drives")}
            className={`flex min-h-12 items-center justify-center border-b-2 px-2 text-center text-sm font-sans font-medium transition-colors ${
              detailTab === "drives" ? "border-emerald-500 text-white" : "border-transparent text-slate-400"
            }`}
          >
            Drive Summary
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={detailTab === "tendencies"}
            onClick={() => setDetailTab("tendencies")}
            className={`flex min-h-12 items-center justify-center border-b-2 px-2 text-center text-sm font-sans font-medium transition-colors ${
              detailTab === "tendencies" ? "border-emerald-500 text-white" : "border-transparent text-slate-400"
            }`}
          >
            Tendencies
          </button>
        </div>
      </div>

      <div className="pt-3">
        {detailTab === "drives" ? (
          <div className="space-y-4">
            {game && drives.length === 0 ? (
              <div className="app-card app-card-pad text-center font-sans text-sm text-slate-400">No drives yet.</div>
            ) : null}

            <div className="flex flex-col gap-3">
            {drives.map((drive) => {
        const playCount = drive.plays?.length ?? 0;
        const yardsGained = (drive.plays ?? []).reduce((sum, p) => sum + p.yards_gained, 0);
        const yardsLabel = yardsGained >= 0 ? `+${yardsGained}` : String(yardsGained);
        const outcomeLabel = getDriveSummaryOutcomeLabel(drive, { isLastDrive: drive.id === lastDriveId, isGameEnded });
        const isExpanded = expandedDriveIds.includes(drive.id);
        const mine = drive.score_mine ?? 0;
        const theirs = drive.score_opponent ?? 0;
        function toggleDriveExpanded() {
          setExpandedDriveIds((current) => {
            const opening = !current.includes(drive.id);
            if (opening) setActiveDrive(drive.id);
            else {
              setNoteEditDriveId((id) => (id === drive.id ? "" : id));
            }
            return opening ? [...current, drive.id] : current.filter((id) => id !== drive.id);
          });
        }

        const quarterMeta =
          drive.quarter != null && drive.quarter >= 5 ? "OT" : drive.quarter != null ? `Q${drive.quarter}` : "Q1";
        const row2Parts = [
          quarterMeta,
          `${mine}-${theirs}`,
          `${playCount} ${playCount === 1 ? "call" : "calls"}`,
          ...(playCount > 0 ? [`${yardsLabel} yds`] : []),
        ];

        return (
          <div key={drive.id} className="app-card overflow-hidden rounded-xl">
            <div className="app-accordion-header-row border-b border-slate-800/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <button
                    type="button"
                    className="app-no-press-scale flex w-full min-w-0 flex-wrap items-center gap-2 text-left transition-colors hover:bg-slate-800/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? "Collapse drive" : "Expand drive"}
                    onClick={toggleDriveExpanded}
                  >
                    <span className="app-drive-number font-display shrink-0 text-sm font-semibold uppercase tracking-wide">
                      Drive {drive.drive_number}
                    </span>
                    <span className="shrink-0">
                      <DriveSummaryOutcomeBadge label={outcomeLabel} />
                    </span>
                  </button>
                  <button
                    type="button"
                    className="app-no-press-scale w-full text-left transition-colors hover:bg-slate-800/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-500"
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? "Collapse drive" : "Expand drive"}
                    onClick={toggleDriveExpanded}
                  >
                    <span className="font-mono text-xs text-slate-400">{row2Parts.join(" · ")}</span>
                  </button>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <DropdownMenu
                    clampMenuBelowSelector="[data-sticky-game-header]"
                    aria-label="Drive actions"
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
                    className="app-no-press-scale inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? "Collapse drive" : "Expand drive"}
                    onClick={toggleDriveExpanded}
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
                      className={`accordion-chevron size-4 shrink-0 text-current ${isExpanded ? "open" : ""}`}
                      aria-hidden
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {isExpanded ? (
              <div className="rounded-b-xl border-t border-slate-800/80 bg-slate-800/50 p-4">
                <div className="mb-3 flex flex-col gap-3">
                  <div>
                    <p className="app-field-label text-slate-500 dark:text-slate-500">Quarter</p>
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
                  <div className="flex min-h-11 flex-wrap items-center gap-2 border-b border-slate-800/80 pb-3">
                    {noteEditDriveId === drive.id ? (
                      <input
                        type="text"
                        className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 font-sans text-sm text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        onBlur={() => {
                          patchDriveAndPersist(drive.id, { note: noteDraft.trim() || null });
                          setNoteEditDriveId("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                        aria-label="Drive note"
                        autoFocus
                      />
                    ) : (
                      <>
                        <p className="min-w-0 flex-1 truncate font-body text-sm text-slate-300 dark:text-slate-300">
                          <span className="text-slate-500 dark:text-slate-500">Drive note: </span>
                          {drive.note?.trim() ? (
                            drive.note
                          ) : (
                            <span className="text-slate-500 dark:text-slate-500">none</span>
                          )}
                        </p>
                        <button
                          type="button"
                          className="shrink-0 font-sans text-sm font-medium text-emerald-400 hover:text-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                          onClick={() => {
                            setNoteEditDriveId(drive.id);
                            setNoteDraft(drive.note ?? "");
                          }}
                        >
                          Edit
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <DataTable
                  columns={drivePlayCols}
                  rows={drive.plays ?? []}
                  getRowKey={(p) => p.id}
                  rowClassName="app-no-press-scale hover:bg-white/[0.02]"
                  onRowClick={undefined}
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
            </div>

            {game && showPartialWarning ? (
              <div className="app-card app-card-pad !border-amber-800/50 bg-amber-500/10 text-sm text-amber-100" role="status" aria-live="polite">
                <p className="font-medium text-amber-200">Partial film</p>
                <p className="mt-1 text-amber-100/90">Partial film may skew tendencies.</p>
              </div>
            ) : null}
          </div>
        ) : (
          <FilmGameTendenciesBody gameId={gameId} />
        )}
      </div>

      {showEndGameModal ? (
        <div className="fixed inset-0 z-[190] bg-black/60" onClick={() => setShowEndGameModal(false)}>
          <div
            className="fixed inset-x-0 bottom-0 z-[191] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-700 bg-slate-900 sm:max-h-[85vh] sm:rounded-xl">
              <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-800 p-3">
                <h2 className="font-display text-base font-bold uppercase tracking-wider text-slate-100">End game</h2>
                <button type="button" className="app-no-press-scale p-2 -mr-2 text-slate-400 hover:text-white" onClick={() => setShowEndGameModal(false)}>
                  <span aria-hidden>✕</span>
                  <span className="sr-only">Close</span>
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <p className="font-sans text-sm text-slate-400">
                  Ends this game. Open it again anytime from Film Room.
                </p>
              </div>
              <div className="flex flex-shrink-0 flex-col gap-3 border-t border-slate-800 p-3">
                <button type="button" disabled={endingGame} onClick={() => void setGameEnded(true)} className="btn-destructive w-full">
                  End game
                </button>
                <button type="button" onClick={() => setShowEndGameModal(false)} className="btn-secondary-block w-full">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showDriveSetup && game ? (
        <div className="fixed inset-0 z-[195] bg-black/60" onClick={() => setShowDriveSetup(false)}>
          <div className="fixed inset-x-0 bottom-0 z-[196] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:px-4" onClick={(e) => e.stopPropagation()}>
            <div className="overflow-hidden rounded-t-2xl border border-slate-700 bg-slate-900 sm:rounded-xl">
              <div className="flex items-center justify-between border-b border-slate-800 p-3">
                <h2 className="font-display text-base font-bold uppercase tracking-wider text-slate-100">Drive Setup</h2>
                <button type="button" className="p-2 text-slate-400 hover:text-white" onClick={() => setShowDriveSetup(false)}>✕</button>
              </div>
              <DriveSetupForm
                defaultValues={{
                  quarter: Math.max(1, Number(drives[drives.length - 1]?.quarter ?? 1)),
                  score_mine: Math.max(0, Number(drives[drives.length - 1]?.score_mine ?? 0)),
                  score_opponent: Math.max(0, Number(drives[drives.length - 1]?.score_opponent ?? 0)),
                  starting_side: "OWN",
                  starting_yard_line: 25,
                  starting_down: 1,
                  starting_distance: 10,
                }}
                onCancel={() => setShowDriveSetup(false)}
                onSubmit={async (values) => {
                  const created = await createDrive(values);
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
            className="fixed inset-0 z-[200] bg-black/60"
            onClick={() => {
              setShowLogger(false);
            }}
          />
          <div
            className="fixed inset-0 z-[201] flex flex-col sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-none border border-slate-800 bg-slate-900 sm:h-auto sm:max-h-[85vh] sm:rounded-xl">
              <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-800 p-3">
                <h2 className="font-display text-base font-bold uppercase tracking-wider text-white">Play Logger</h2>
                <button
                  type="button"
                  className="app-no-press-scale p-2 -mr-2 text-slate-400 hover:text-white"
                  onClick={() => {
                    setShowLogger(false);
                  }}
                >
                  <span aria-hidden>✕</span>
                  <span className="sr-only">Close</span>
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
                <PlayLoggerV2
                  gameId={gameId}
                  driveId={activeDriveObj.id}
                  playbook={game.offensive_playbook ?? game.my_playbook}
                  drive={activeDriveObj}
                  initialGameState={replayGameStateFromPlays(activeDriveObj.plays ?? [], activeDriveObj.drive_number, activeDriveObj)}
                  onClose={() => setShowLogger(false)}
                  onRefresh={refresh}
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
