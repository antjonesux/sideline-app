"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { tendenciesQueryKeys } from "@/lib/tendenciesQueryKeys";
import { EditGameDetailsModal } from "@/components/film/EditGameDetailsModal";
import { PlayLogger } from "@/components/film/PlayLogger";
import { ResultBadge } from "@/components/import/ResultBadge";
import { GameDetailSkeleton } from "@/components/shared/AppSkeleton";
import { BackToFilmLink } from "@/components/shared/BackToFilmLink";
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
): { label: string; tone: DriveHeaderBadgeTone } | null {
  const plays = drive.plays ?? [];
  const outcome = getDriveResult(plays);
  const last = plays[plays.length - 1];

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

  return { label: "ACTIVE", tone: "amber" };
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
  const router = useRouter();
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

  async function addDrive() {
    if (!gameId) return;

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
      return;
    }

    if (!data) return;

    const newDrive: Drive = { ...(data as Drive), plays: [] };
    setDrives((prev) => [...prev, newDrive]);
    setExpandedDriveIds((current) => [...new Set([...current, newDrive.id])]);
    setActiveDrive(newDrive.id);
  }

  async function saveDrive(drive: Drive) {
    await fetch(`/api/drives/${drive.id}`, {
      method: "PUT",
      body: JSON.stringify({
        score_mine: drive.score_mine ?? 0,
        score_opponent: drive.score_opponent ?? 0,
        note: drive.note ?? null,
      }),
    });
    setEditingDriveId("");
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
    await fetch(`/api/plays/${playId}`, { method: "DELETE" });
    await refresh();
  }

  const totalPlays = drives.reduce((sum, d) => sum + (d.plays?.length ?? 0), 0);
  const totalDrives = drives.length;
  const showPartialWarning = totalDrives > 0 && totalPlays < 10;

  const resultLabel = game?.result === "W" ? "W" : game?.result === "L" ? "L" : "—";
  const scoreMine = game?.my_score ?? "—";
  const scoreOpp = game?.opponent_score ?? "—";

  if (!pageReady) {
    return <GameDetailSkeleton />;
  }

  return (
    <section className="space-y-4 pb-28">
      <div className="space-y-3">
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
          <span className="font-semibold text-slate-200">{resultLabel}</span>
          <span className="mx-2 font-mono tabular-nums text-slate-200">
            {scoreMine} – {scoreOpp}
          </span>
          <span className="mx-2 text-slate-600">·</span>
          <span>
            {totalDrives} {totalDrives === 1 ? "drive" : "drives"}
          </span>
          <span className="mx-2 text-slate-600">·</span>
          <span>
            {totalPlays} {totalPlays === 1 ? "play" : "plays"}
          </span>
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
            <button type="button" onClick={addDrive} className="btn-primary px-3 py-2 text-xs">
              + Add drive
            </button>
            <Link
              href={`/film/import?game_session_id=${encodeURIComponent(gameId)}`}
              className="btn-secondary px-3 py-2 text-xs"
            >
              ↑ Upload CSV
            </Link>
          </div>
          <button type="button" onClick={() => setShowEndGameModal(true)} className="btn-destructive w-full px-3 py-2 text-xs sm:w-auto">
            ■ End game
          </button>
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
              <button type="button" onClick={() => router.push("/film")} className="btn-destructive-solid">
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
        const driveBadge = getDriveHeaderBadge(drive);
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
                  <span className="font-body min-w-0 text-[13px] leading-snug text-slate-400">
                    <span className="whitespace-nowrap">{qLabel}</span>
                    <span className="mx-1.5 text-slate-500">·</span>
                    <span className="whitespace-nowrap">
                      {playCount} {playCount === 1 ? "play" : "plays"}
                    </span>
                    <span className="mx-1.5 text-slate-500">·</span>
                    <span className="whitespace-nowrap">{yardsLabel} yds</span>
                  </span>
                </div>
                <p className="font-body mt-1 text-[12px] text-slate-400">
                  {drive.score_mine ?? 0}-{drive.score_opponent ?? 0}
                </p>
              </button>
              <div className="flex shrink-0 items-center gap-1.5 self-center">
                <button
                  type="button"
                  className="btn-secondary inline-flex items-center px-2.5 py-1.5 text-[12px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingDriveId(drive.id);
                  }}
                >
                  Edit Drive
                </button>
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
                      className="flex w-full min-w-0 items-center justify-start gap-2 py-2.5 text-left transition-colors hover:bg-white/[0.02] sm:gap-3"
                      onClick={() => openForEdit(drive.id, p)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        deletePlay(p.id);
                      }}
                    >
                      <div className="flex min-w-0 flex-1 items-center justify-start gap-1 overflow-hidden sm:gap-1.5">
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
                    </button>
                  );
                })}
                <div className="pt-2">
                  <button
                    type="button"
                    className="btn-secondary w-full border-dashed py-2 text-sm"
                    onClick={() => openForCreate(drive.id)}
                  >
                    + Add Play
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
