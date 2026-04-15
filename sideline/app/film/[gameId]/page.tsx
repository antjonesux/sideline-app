"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { tendenciesQueryKeys } from "@/lib/tendenciesQueryKeys";
import { EditGameDetailsModal } from "@/components/film/EditGameDetailsModal";
import { GameStatsInline } from "@/components/film/GameStatsInline";
import { PlayLogger } from "@/components/film/PlayLogger";
import { ResultBadge } from "@/components/import/ResultBadge";
import { GameDetailSkeleton } from "@/components/shared/AppSkeleton";
import { BackToFilmLink } from "@/components/shared/BackToFilmLink";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { useToastStore } from "@/store/toastStore";
import type { Drive, GameSession, LoggedPlay } from "@/lib/types";
import { supabase } from "@/lib/supabase";

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

function PlayRowSeparator() {
  return (
    <span className="shrink-0 px-0.5 text-[12px] leading-none text-[#A0A3AD]/35" aria-hidden>
      →
    </span>
  );
}

type DriveHeaderBadgeTone = "emerald" | "red" | "muted" | "amber";

function getDriveHeaderBadge(
  drive: Drive,
  opts: { isLastDrive: boolean; isGameEnded: boolean },
): { label: string; tone: DriveHeaderBadgeTone } | null {
  const plays = drive.plays ?? [];
  const outcome = getDriveResult(plays);
  const last = plays[plays.length - 1];
  if (opts.isLastDrive && opts.isGameEnded) return { label: "GAME ENDED", tone: "muted" };

  if (outcome === "TOUCHDOWN") return { label: "TD", tone: "emerald" };
  if (outcome === "FIELD_GOAL") return { label: "FG", tone: "emerald" };
  if (outcome === "TURNOVER") return { label: "TURNOVER", tone: "red" };
  if (outcome === "PUNT") return { label: "PUNT", tone: "muted" };
  if (outcome === "NO_PLAYS") return { label: "NO PLAYS", tone: "muted" };

  if (last) {
    const norm = normalizeResultTag(last.result_tag);
    if (norm === "FIRST DOWN") return { label: "FIRST DOWN", tone: "emerald" };
    if (norm === "NO GAIN") return { label: "NO GAIN", tone: "muted" };
  }

  if (opts.isLastDrive) return { label: "ACTIVE", tone: "amber" };
  return { label: "RECORDED", tone: "muted" };
}

function DriveHeaderBadge({ label, tone }: { label: string; tone: DriveHeaderBadgeTone }) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-600/80 bg-emerald-900/45 text-emerald-200"
      : tone === "red"
        ? "border-red-700/80 bg-red-900/40 text-red-200"
        : tone === "amber"
          ? "border-amber-600/70 bg-amber-900/35 text-amber-200"
          : "border-[#2A2E3A] bg-[#1C1F28] text-[#A0A3AD]";

  return (
    <span
      className={`font-mono inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${toneClass}`}
    >
      {label}
    </span>
  );
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
  const [activeDriveMenuId, setActiveDriveMenuId] = useState<string | null>(null);
  const [pageReady, setPageReady] = useState(false);
  const [endingGame, setEndingGame] = useState(false);
  const [playRowMode, setPlayRowMode] = useState<"compact" | "expanded">("compact");
  const addToast = useToastStore((s) => s.addToast);

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

  useEffect(() => {
    const stored = localStorage.getItem("drive-log-row-mode");
    if (stored === "compact" || stored === "expanded") {
      setPlayRowMode(stored);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("drive-log-row-mode", playRowMode);
  }, [playRowMode]);

  async function addDrive() {
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
    addToast("Drive added", "success");
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
    const res = await fetch(`/api/drives/${drive.id}`, {
      method: "PUT",
      body: JSON.stringify({
        score_mine: drive.score_mine ?? 0,
        score_opponent: drive.score_opponent ?? 0,
        note: drive.note ?? null,
      }),
    });
    if (!res.ok) {
      addToast("Failed to save", "error");
      return;
    }
    addToast("Changes saved", "success");
    setEditingDriveId("");
    await refresh();
  }

  async function deleteDrive(driveId: string) {
    const ok = window.confirm("Delete this drive and all of its plays?");
    if (!ok) return;
    const prevDrives = drives;
    setDrives((current) => current.filter((d) => d.id !== driveId));
    const res = await fetch(`/api/drives/${driveId}`, { method: "DELETE" });
    if (!res.ok) {
      setDrives(prevDrives);
      addToast("Failed to save", "error");
      return;
    }
    setActiveDriveMenuId(null);
    setExpandedDriveIds((current) => current.filter((id) => id !== driveId));
    if (editingDriveId === driveId) setEditingDriveId("");
    addToast("Drive deleted", "success");
    await refresh();
  }

  function openForCreate(driveId: string) {
    setActiveDrive(driveId);
    setEditPlay(null);
    setShowLogger(true);
  }

  function openForEdit(driveId: string, playToEdit: LoggedPlay) {
    setActiveDrive(driveId);
    setEditPlay(playToEdit);
    setShowLogger(true);
  }

  async function deletePlay(playId: string) {
    const ok = window.confirm("Delete this play?");
    if (!ok) return;
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

  if (!pageReady) {
    return <GameDetailSkeleton />;
  }

  return (
    <section className="space-y-4 pb-28">
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
        <div className="overflow-x-auto">
          <GameStatsInline playCount={totalPlays} driveCount={totalDrives} totalYards={totalYards} tds={tds} turnovers={turnovers} />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
            <button type="button" onClick={addDrive} className="btn-primary px-3 py-2 text-xs">
              Add Drive
            </button>
            <Link
              href={`/film/import?game_session_id=${encodeURIComponent(gameId)}`}
              className="btn-secondary px-3 py-2 text-xs"
            >
              Upload CSV
            </Link>
          </div>
          {isGameEnded ? (
            <button type="button" onClick={() => void setGameEnded(false)} className="btn-secondary w-full px-3 py-2 text-xs sm:w-auto">
              Resume Game
            </button>
          ) : (
            <button type="button" onClick={() => setShowEndGameModal(true)} className="btn-destructive w-full px-3 py-2 text-xs sm:w-auto">
              End Game
            </button>
          )}
          <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 p-1 text-xs">
            <button
              type="button"
              className={`rounded px-2 py-1 ${playRowMode === "compact" ? "bg-slate-700 text-white" : "text-slate-400"}`}
              onClick={() => setPlayRowMode("compact")}
            >
              Compact
            </button>
            <button
              type="button"
              className={`rounded px-2 py-1 ${playRowMode === "expanded" ? "bg-slate-700 text-white" : "text-slate-400"}`}
              onClick={() => setPlayRowMode("expanded")}
            >
              Expanded
            </button>
          </div>
        </div>
      </div>

      {showEndGameModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="app-shell w-full max-w-sm space-y-4">
            <h2 className="app-modal-title">End game?</h2>
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
      ) : null}

      {drives.map((drive) => {
        const playCount = drive.plays?.length ?? 0;
        const yardsGained = (drive.plays ?? []).reduce((sum, p) => sum + p.yards_gained, 0);
        const yardsLabel = yardsGained >= 0 ? `+${yardsGained}` : String(yardsGained);
        const driveBadge = getDriveHeaderBadge(drive, { isLastDrive: drive.id === lastDriveId, isGameEnded });
        const isExpanded = expandedDriveIds.includes(drive.id);
        const qLabel = drive.quarter != null && drive.quarter >= 5 ? "OT" : drive.quarter != null ? `Q${drive.quarter}` : "—";
        function toggleDriveExpanded() {
          setExpandedDriveIds((current) =>
            current.includes(drive.id) ? current.filter((id) => id !== drive.id) : [...current, drive.id],
          );
        }

        return (
          <div key={drive.id} className="app-card app-card-pad py-3.5">
            <div className="flex items-center gap-3">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={toggleDriveExpanded}>
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-heading shrink-0 text-[16px] font-bold uppercase tracking-[1.5px] text-amber-400">
                    Drive {drive.drive_number}
                  </span>
                  {driveBadge ? <DriveHeaderBadge label={driveBadge.label} tone={driveBadge.tone} /> : null}
                  <span className="min-w-0 text-[13px] leading-snug text-slate-400">
                    <span className="font-body whitespace-nowrap">{qLabel}</span>
                    <span className="mx-1.5 text-slate-500">·</span>
                    <span className="whitespace-nowrap">
                      <span className="font-mono">{playCount}</span>
                      <span className="font-body ml-1">{playCount === 1 ? "play" : "plays"}</span>
                    </span>
                    <span className="mx-1.5 text-slate-500">·</span>
                    <span className="whitespace-nowrap">
                      <span className="font-mono">{yardsLabel}</span>
                      <span className="font-body ml-1">yds</span>
                    </span>
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-slate-400">
                  <span className="font-mono">{drive.score_mine ?? 0}</span>
                  <span className="font-body">-</span>
                  <span className="font-mono">{drive.score_opponent ?? 0}</span>
                </p>
              </button>
              <div className="relative flex shrink-0 items-center gap-1.5 self-center">
                <button
                  type="button"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-transparent text-[#A0A3AD] transition-colors hover:bg-white/[0.04] hover:text-[#F5F5F0]"
                  aria-haspopup="menu"
                  aria-expanded={activeDriveMenuId === drive.id}
                  aria-label="Drive actions"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDriveMenuId((prev) => (prev === drive.id ? null : drive.id));
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <circle cx="12" cy="5" r="1.75" />
                    <circle cx="12" cy="12" r="1.75" />
                    <circle cx="12" cy="19" r="1.75" />
                  </svg>
                </button>
                {activeDriveMenuId === drive.id ? (
                  <ul className="absolute right-0 top-10 z-20 min-w-[10rem] rounded-lg border border-slate-700 bg-slate-950 py-1 text-sm shadow-lg" role="menu">
                    <li>
                      <button
                        type="button"
                        role="menuitem"
                        className="block w-full px-3 py-2 text-left font-barlow text-slate-200 hover:bg-slate-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDriveMenuId(null);
                          setEditingDriveId(drive.id);
                        }}
                      >
                        Edit Drive
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        role="menuitem"
                        className="block w-full px-3 py-2 text-left font-barlow text-red-300 hover:bg-slate-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          void deleteDrive(drive.id);
                        }}
                      >
                        Delete Drive
                      </button>
                    </li>
                  </ul>
                ) : null}
                <button
                  type="button"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-transparent text-[#A0A3AD] transition-colors hover:bg-white/[0.04] hover:text-[#F5F5F0]"
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? "Collapse drive" : "Expand drive"}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDriveExpanded();
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    aria-hidden
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </div>
            </div>

            {editingDriveId === drive.id ? (
              <div className="mt-3 text-xs">
                <div className="mb-3 grid grid-cols-2 gap-2">
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
              <div className="mt-3 flex flex-col divide-y divide-[rgba(255,255,255,0.04)] border-t border-[rgba(255,255,255,0.04)]">
                {(drive.plays ?? []).map((p) => {
                  const yds = p.yards_gained;
                  const ydsClass =
                    yds > 0 ? "text-[#10B981]" : yds < 0 ? "text-[#C0392B]" : "text-[#A0A3AD]";
                  const ydsText = yds > 0 ? `+${yds}` : String(yds);
                  return (
                    <button
                      type="button"
                      key={p.id}
                      className="flex w-full min-w-0 flex-col items-start justify-start gap-1 py-2.5 text-left transition-colors hover:bg-white/[0.02] sm:gap-2"
                      onClick={() => openForEdit(drive.id, p)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        deletePlay(p.id);
                      }}
                    >
                      <div className="flex min-w-0 w-full items-center justify-start gap-1 overflow-hidden sm:gap-1.5">
                        <span className="font-mono shrink-0 text-[12px] leading-none text-slate-400 tabular-nums">
                          {p.down}-{p.distance}
                        </span>
                        <PlayRowSeparator />
                        <span className="font-body min-w-0 shrink truncate text-[13px] text-slate-100">{p.formation}</span>
                        <PlayRowSeparator />
                        <span className="font-mono min-w-0 shrink truncate text-left text-[12px] font-medium uppercase text-white">
                          {p.play_name}
                        </span>
                        <PlayRowSeparator />
                        <span className="shrink-0">
                          <ResultBadge label={p.result_tag} />
                        </span>
                        <PlayRowSeparator />
                        <span
                          className={`font-mono min-w-[32px] shrink-0 text-left text-[13px] font-semibold tabular-nums ${ydsClass}`}
                        >
                          {ydsText}
                        </span>
                      </div>
                      {playRowMode === "expanded" ? (
                        <span className="font-body text-[11px] text-slate-500">
                          {p.side} {p.yard_line} · {p.hash}
                          {p.note ? ` · ${p.note}` : ""}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
                <div className="pt-2">
                  <button
                    type="button"
                    className="btn-secondary w-full border-dashed py-2 text-sm"
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

      {showLogger && game && activeDrive ? (
        <PlayLogger
          gameSessionId={gameId}
          myPlaybook={game.my_playbook}
          opponentScheme={game.opponent_scheme}
          driveId={activeDrive}
          previousPlay={(drives.find((d) => d.id === activeDrive)?.plays ?? []).slice(-1)[0] ?? null}
          editPlay={editPlay}
          onClose={() => {
            setShowLogger(false);
            setEditPlay(null);
          }}
          onLogged={refresh}
        />
      ) : null}

      {game && showPartialWarning ? (
        <div className="rounded-lg border border-amber-800/50 bg-amber-500/10 p-4 text-sm text-amber-100" role="status" aria-live="polite">
          <p className="font-medium text-amber-200">Partial log notice</p>
          <p className="mt-1 text-amber-100/90">This looks like a partial log. Incomplete data may affect recommendations.</p>
        </div>
      ) : null}
    </section>
  );
}
