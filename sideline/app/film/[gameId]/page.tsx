"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { PlayLogger } from "@/components/film/PlayLogger";
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

type GameLogPageProps = { params: Promise<{ gameId: string }> };

export default function GameLogPage({ params }: GameLogPageProps) {
  const { gameId } = use(params);
  const router = useRouter();

  const [game, setGame] = useState<GameSession | null>(null);
  const [drives, setDrives] = useState<Drive[]>([]);
  const [expandedDriveIds, setExpandedDriveIds] = useState<string[]>([]);
  const [editingDriveId, setEditingDriveId] = useState<string>("");
  const [activeDrive, setActiveDrive] = useState<string>("");
  const [showLogger, setShowLogger] = useState(false);
  const [editPlay, setEditPlay] = useState<LoggedPlay | null>(null);
  const [showEndGameModal, setShowEndGameModal] = useState(false);

  const refresh = useCallback(async (opts?: { expandDriveId?: string }) => {
    if (!gameId) return;
    const res = await fetch(`/api/games/${gameId}/drives`);
    const data = (await res.json()) as Drive[];
    setDrives(data);
    setExpandedDriveIds((current) => {
      if (opts?.expandDriveId) return [...new Set([...current, opts.expandDriveId])];
      return current.length ? current : data[0] ? [data[0].id] : [];
    });
    setActiveDrive((current) => {
      if (opts?.expandDriveId) return opts.expandDriveId;
      return current || data[0]?.id || "";
    });
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    fetch(`/api/games/${gameId}`)
      .then((res) => res.json())
      .then((data: GameSession) => {
        if (cancelled) return;
        setGame(data);
      });
    fetch(`/api/games/${gameId}/drives`)
      .then((res) => res.json())
      .then((data: Drive[]) => {
        if (cancelled) return;
        setDrives(data);
        setExpandedDriveIds((current) => (current.length ? current : data[0] ? [data[0].id] : []));
        setActiveDrive((current) => current || data[0]?.id || "");
      });

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

  const addDriveButtonClass = "rounded bg-emerald-500 px-3 py-2 text-slate-950";

  const resultLabel = game?.result === "W" ? "W" : game?.result === "L" ? "L" : "—";
  const scoreMine = game?.my_score ?? "—";
  const scoreOpp = game?.opponent_score ?? "—";

  return (
    <section className="space-y-4 pb-28">
      <div className="space-y-3">
        <BackToFilmLink />

        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-xl leading-tight text-slate-100 sm:text-2xl">
            {game ? (
              <>
                {game.my_playbook}
                <span className="mx-2 text-slate-500">vs</span>
                {game.opponent_team}
              </>
            ) : (
              "…"
            )}
          </h1>
          <button
            type="button"
            onClick={() => setShowEndGameModal(true)}
            className="shrink-0 rounded-lg border border-red-800/60 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-900/20"
          >
            End Game
          </button>
        </div>

        <p className="text-sm text-slate-400">
          <span className="font-semibold text-slate-200">{resultLabel}</span>
          <span className="mx-2 font-mono text-slate-200">
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

        <button type="button" onClick={addDrive} className={`text-sm font-semibold ${addDriveButtonClass}`}>
          + Add Drive
        </button>
      </div>

      {showEndGameModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="font-display text-xl text-slate-100">End Game?</h2>
            <p className="text-sm text-slate-400">
              This will close the game session and return you to the Film Room. You can come back to add more plays later.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowEndGameModal(false)}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => router.push("/film")}
                className="flex-1 rounded-lg border border-red-800 bg-red-900/30 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-900/50"
              >
                End Game
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {drives.map((drive) => {
        const playCount = drive.plays?.length ?? 0;
        const yardsGained = (drive.plays ?? []).reduce((sum, p) => sum + p.yards_gained, 0);
        const driveResult = getDriveResult(drive.plays);
        const isExpanded = expandedDriveIds.includes(drive.id);
        return (
          <div key={drive.id} className="rounded border border-slate-800 bg-slate-900 p-3">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className="flex-1 text-left"
                onClick={() =>
                  setExpandedDriveIds((current) => (current.includes(drive.id) ? current.filter((id) => id !== drive.id) : [...current, drive.id]))
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">Drive {drive.drive_number}</p>
                  {driveResult === "TOUCHDOWN" ? (
                    <span className="inline-flex items-center rounded-full border border-emerald-700 bg-emerald-900/40 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                      TD
                    </span>
                  ) : null}
                  {driveResult === "TURNOVER" ? (
                    <span className="inline-flex items-center rounded-full border border-red-700 bg-red-900/40 px-2 py-0.5 text-xs font-semibold text-red-400">
                      TO
                    </span>
                  ) : null}
                  {driveResult === "PUNT" ? (
                    <span className="inline-flex items-center rounded-full border border-slate-600 bg-slate-800/80 px-2 py-0.5 text-xs font-semibold text-slate-300">
                      PUNT
                    </span>
                  ) : null}
                  {driveResult === "FIELD_GOAL" ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-900/40 border border-emerald-700 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                      FG
                    </span>
                  ) : null}
                  {driveResult === "ACTIVE" ? (
                    <span className="inline-flex items-center rounded-full border border-amber-700 bg-amber-900/40 px-2 py-0.5 text-xs font-semibold text-amber-400">
                      IN PROGRESS
                    </span>
                  ) : null}
                  {driveResult === "NO_PLAYS" ? (
                    <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-500">
                      No plays
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-400">
                  {drive.score_mine ?? 0}-{drive.score_opponent ?? 0} | {playCount} plays | {yardsGained} yds
                </p>
              </button>
              <button type="button" className="rounded border border-slate-700 px-2 py-1 text-xs" onClick={() => setEditingDriveId(drive.id)}>
                Edit Drive
              </button>
            </div>

            {editingDriveId === drive.id ? (
              <div className="mt-3 text-xs">
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <label>
                    <span className="text-xs text-slate-400">My Score</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="mt-0.5 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
                      value={drive.score_mine ?? ""}
                      onChange={(e) =>
                        setDrives((all) => all.map((d) => (d.id === drive.id ? { ...d, score_mine: parseInt(e.target.value, 10) || 0 } : d)))
                      }
                    />
                  </label>
                  <label>
                    <span className="text-xs text-slate-400">Their Score</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="mt-0.5 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
                      value={drive.score_opponent ?? ""}
                      onChange={(e) =>
                        setDrives((all) => all.map((d) => (d.id === drive.id ? { ...d, score_opponent: parseInt(e.target.value, 10) || 0 } : d)))
                      }
                    />
                  </label>
                </div>
                <label className="mb-3 block">
                  <span className="text-xs text-slate-400">Drive Note (optional)</span>
                  <input
                    type="text"
                    className="mt-0.5 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
                    placeholder="e.g. opened with tempo"
                    value={drive.note ?? ""}
                    onChange={(e) => setDrives((all) => all.map((d) => (d.id === drive.id ? { ...d, note: e.target.value } : d)))}
                  />
                </label>
                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-700"
                    onClick={() => setEditingDriveId("")}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
                    onClick={() => saveDrive(drive)}
                  >
                    Save Drive
                  </button>
                </div>
              </div>
            ) : null}

            {isExpanded ? (
              <div className="mt-3 space-y-2">
                {(drive.plays ?? []).map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className="block w-full rounded bg-slate-800 p-2 text-left text-xs"
                    onClick={() => openForEdit(drive.id, p)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      deletePlay(p.id);
                    }}
                  >
                    {p.down}-{p.distance} {p.side} {p.yard_line} {p.hash} {p.formation} → {p.play_name} {p.yards_gained >= 0 ? `+${p.yards_gained}` : p.yards_gained}{" "}
                    {p.result_tag}
                  </button>
                ))}
                <button type="button" className="w-full rounded border border-slate-700 px-3 py-2 text-sm" onClick={() => openForCreate(drive.id)}>
                  + Add Play
                </button>
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

      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <p className="font-mono text-xs uppercase tracking-widest text-slate-500">Secondary</p>
        <p className="mt-1 text-sm text-slate-400">Need a full play-by-play from a spreadsheet? CSV import creates a new session from the game setup page.</p>
        <Link
          href="/film/new"
          className="mt-3 inline-flex items-center justify-center rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:border-emerald-700/50 hover:bg-slate-800"
        >
          Import from CSV
        </Link>
      </div>
    </section>
  );
}
