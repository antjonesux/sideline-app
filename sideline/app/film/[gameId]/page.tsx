"use client";

import { useCallback, useEffect, useState } from "react";
import type { Drive, GameSession, LoggedPlay } from "@/lib/types";

type PlayForm = {
  down: number;
  distance: number;
  yard_line: number;
  side: "OWN" | "OPP";
  hash: "LEFT" | "MIDDLE" | "RIGHT";
  formation: string;
  play_name: string;
  result_tag: "FIRST_DOWN" | "TOUCHDOWN" | "GAIN" | "NO_GAIN" | "INCOMPLETE" | "SACK" | "TURNOVER" | "OUT_OF_BOUNDS";
  yards_gained: number;
  note: string;
};

type FormationRow = { formation: string; plays: string[] };

const PLAY_DEFAULT: PlayForm = {
  down: 1,
  distance: 10,
  yard_line: 25,
  side: "OWN",
  hash: "MIDDLE",
  formation: "",
  play_name: "",
  result_tag: "GAIN",
  yards_gained: 4,
  note: "",
};

const RESULT_TAGS: PlayForm["result_tag"][] = ["FIRST_DOWN", "TOUCHDOWN", "GAIN", "NO_GAIN", "INCOMPLETE", "SACK", "TURNOVER", "OUT_OF_BOUNDS"];

export default function GameLogPage({ params }: { params: { gameId: string } }) {
  const [game, setGame] = useState<GameSession | null>(null);
  const [drives, setDrives] = useState<Drive[]>([]);
  const [expandedDriveIds, setExpandedDriveIds] = useState<string[]>([]);
  const [editingDriveId, setEditingDriveId] = useState<string>("");
  const [activeDrive, setActiveDrive] = useState<string>("");
  const [showLogger, setShowLogger] = useState(false);
  const [editPlayId, setEditPlayId] = useState<string>("");
  const [play, setPlay] = useState<PlayForm>(PLAY_DEFAULT);
  const [playbookOptions, setPlaybookOptions] = useState<FormationRow[]>([]);
  const [showFormationPicker, setShowFormationPicker] = useState(false);

  const refresh = useCallback(async (opts?: { expandDriveId?: string }) => {
    const res = await fetch(`/api/games/${params.gameId}/drives`);
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
  }, [params.gameId]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/games/${params.gameId}`)
      .then((res) => res.json())
      .then((data: GameSession) => {
        if (cancelled) return;
        setGame(data);
      });
    fetch(`/api/games/${params.gameId}/drives`)
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
  }, [params.gameId]);

  useEffect(() => {
    if (!game?.my_playbook) return;
    fetch(`/api/film/playbook?playbook=${encodeURIComponent(game.my_playbook)}`)
      .then((res) => res.json())
      .then((data: { formations: FormationRow[] }) => setPlaybookOptions(data.formations ?? []));
  }, [game?.my_playbook]);

  async function addDrive() {
    const nextDriveNumber = drives.length === 0 ? 1 : Math.max(0, ...drives.map((d) => d.drive_number ?? 0)) + 1;
    const res = await fetch(`/api/games/${params.gameId}/drives`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        drive_number: nextDriveNumber,
        quarter: 1,
        time_remaining: "15:00",
        starting_yard_line: 25,
        starting_side: "OWN",
        score_mine: game?.my_score ?? 0,
        score_opponent: game?.opponent_score ?? 0,
        note: "",
      }),
    });
    const payload = (await res.json().catch(() => null)) as Drive | { error?: string } | null;
    if (!res.ok || !payload || !("id" in payload)) {
      console.error("Add drive failed", payload);
      return;
    }
    const newDrive: Drive = { ...payload, plays: "plays" in payload && payload.plays ? payload.plays : [] };
    await refresh({ expandDriveId: newDrive.id });
  }

  async function saveDrive(drive: Drive) {
    await fetch(`/api/drives/${drive.id}`, {
      method: "PUT",
      body: JSON.stringify({
        quarter: drive.quarter,
        time_remaining: drive.time_remaining,
        starting_yard_line: drive.starting_yard_line,
        starting_side: drive.starting_side,
        score_mine: drive.score_mine,
        score_opponent: drive.score_opponent,
        note: drive.note,
      }),
    });
    setEditingDriveId("");
    await refresh();
  }

  function openForCreate(driveId: string) {
    setActiveDrive(driveId);
    setEditPlayId("");
    setPlay((prev) => ({
      ...PLAY_DEFAULT,
      down: prev.down,
      distance: prev.distance,
      formation: prev.formation,
      play_name: prev.play_name,
    }));
    setShowLogger(true);
  }

  function openForEdit(driveId: string, playToEdit: LoggedPlay) {
    setActiveDrive(driveId);
    setEditPlayId(playToEdit.id);
    setPlay({
      down: playToEdit.down,
      distance: playToEdit.distance,
      yard_line: playToEdit.yard_line,
      side: playToEdit.side,
      hash: playToEdit.hash,
      formation: playToEdit.formation,
      play_name: playToEdit.play_name,
      result_tag: playToEdit.result_tag as PlayForm["result_tag"],
      yards_gained: playToEdit.yards_gained,
      note: playToEdit.note ?? "",
    });
    setShowLogger(true);
  }

  async function savePlay() {
    if (!activeDrive || !game) return;
    if (!play.formation || !play.play_name) return;

    if (editPlayId) {
      await fetch(`/api/plays/${editPlayId}`, { method: "PUT", body: JSON.stringify(play) });
    } else {
      await fetch(`/api/drives/${activeDrive}/plays`, { method: "POST", body: JSON.stringify({ ...play, game_session_id: params.gameId, opponent_scheme: game.opponent_scheme }) });
    }

    if (!editPlayId) {
      const isReset = play.result_tag === "FIRST_DOWN" || play.result_tag === "TOUCHDOWN";
      const nextDown = isReset ? 1 : Math.min(play.down + 1, 4);
      const nextDistance = isReset ? 10 : Math.max(1, play.distance - Math.max(play.yards_gained, 0));
      const forceSameDistance = play.result_tag === "INCOMPLETE" || play.result_tag === "SACK" || play.result_tag === "TURNOVER";
      setPlay((prev) => ({
        ...prev,
        down: nextDown,
        distance: forceSameDistance ? prev.distance : nextDistance,
      }));

      if (play.down === 4 && !isReset) {
        const done = window.confirm("Drive over?");
        if (done) setShowLogger(false);
      }
    } else {
      setShowLogger(false);
      setEditPlayId("");
    }

    await refresh();
  }

  async function deletePlay(playId: string) {
    const ok = window.confirm("Delete this play?");
    if (!ok) return;
    await fetch(`/api/plays/${playId}`, { method: "DELETE" });
    await refresh();
  }

  function updateResultTag(nextTag: PlayForm["result_tag"]) {
    setPlay((prev) => ({
      ...prev,
      result_tag: nextTag,
      yards_gained: nextTag === "INCOMPLETE" ? 0 : nextTag === "SACK" ? -5 : prev.yards_gained,
    }));
  }

  return (
    <section className="space-y-4 pb-28">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Drive Log</h1>
        <button type="button" onClick={addDrive} className="rounded bg-emerald-500 px-3 py-2 text-slate-950">
          + Add Drive
        </button>
      </div>

      {drives.map((drive) => {
        const playCount = drive.plays?.length ?? 0;
        const yardsGained = (drive.plays ?? []).reduce((sum, p) => sum + p.yards_gained, 0);
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
                <p className="font-medium">Drive {drive.drive_number}</p>
                <p className="text-xs text-slate-400">
                  {drive.score_mine ?? 0}-{drive.score_opponent ?? 0} | {drive.starting_side ?? "OWN"} {drive.starting_yard_line ?? 25} | {playCount} plays | {yardsGained} yds
                </p>
              </button>
              <button type="button" className="rounded border border-slate-700 px-2 py-1 text-xs" onClick={() => setEditingDriveId(drive.id)}>
                Edit Drive
              </button>
            </div>

            {editingDriveId === drive.id ? (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <input className="rounded border border-slate-700 bg-slate-950" value={drive.score_mine ?? 0} onChange={(e) => setDrives((all) => all.map((d) => (d.id === drive.id ? { ...d, score_mine: Number(e.target.value) } : d)))} />
                <input className="rounded border border-slate-700 bg-slate-950" value={drive.score_opponent ?? 0} onChange={(e) => setDrives((all) => all.map((d) => (d.id === drive.id ? { ...d, score_opponent: Number(e.target.value) } : d)))} />
                <input className="rounded border border-slate-700 bg-slate-950" placeholder="Q2 8:42" value={drive.time_remaining ?? ""} onChange={(e) => setDrives((all) => all.map((d) => (d.id === drive.id ? { ...d, time_remaining: e.target.value } : d)))} />
                <input className="rounded border border-slate-700 bg-slate-950" value={drive.starting_yard_line ?? 25} onChange={(e) => setDrives((all) => all.map((d) => (d.id === drive.id ? { ...d, starting_yard_line: Number(e.target.value) } : d)))} />
                <input className="col-span-2 rounded border border-slate-700 bg-slate-950" maxLength={80} placeholder="Drive note" value={drive.note ?? ""} onChange={(e) => setDrives((all) => all.map((d) => (d.id === drive.id ? { ...d, note: e.target.value } : d)))} />
                <button type="button" className="rounded border border-slate-700 px-2 py-1" onClick={() => setEditingDriveId("")}>
                  Cancel
                </button>
                <button type="button" className="rounded bg-emerald-500 px-2 py-1 text-slate-950" onClick={() => saveDrive(drive)}>
                  Save
                </button>
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
                    {p.down}-{p.distance} {p.side} {p.yard_line} {p.hash} {p.formation} → {p.play_name} {p.yards_gained >= 0 ? `+${p.yards_gained}` : p.yards_gained} {p.result_tag}
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

      {showLogger ? (
        <div className="fixed inset-0 z-40 flex items-end bg-slate-950/70 p-3">
          <div className="max-h-[90vh] w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-2xl">Play Logger</h2>
              <button onClick={() => setShowLogger(false)} className="text-sm text-slate-300">Close</button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">Down & Distance</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 1, label: "1ST" },
                    { value: 2, label: "2ND" },
                    { value: 3, label: "3RD" },
                    { value: 4, label: "4TH" },
                  ].map((down) => <button key={down.value} onClick={() => setPlay((p) => ({ ...p, down: down.value }))} className={`rounded px-2 py-3 ${play.down === down.value ? "bg-emerald-500 text-slate-950" : "bg-slate-800"}`}>{down.label}</button>)}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 10, 15].map((distance) => <button key={distance} onClick={() => setPlay((p) => ({ ...p, distance }))} className={`rounded px-2 py-2 text-sm ${play.distance === distance ? "bg-emerald-500 text-slate-950" : "bg-slate-800"}`}>{distance === 15 ? "15+" : distance}</button>)}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">Field Position</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    {(["OWN", "OPP"] as const).map((side) => <button key={side} onClick={() => setPlay((p) => ({ ...p, side }))} className={`rounded px-2 py-3 ${play.side === side ? "bg-emerald-500 text-slate-950" : "bg-slate-800"}`}>{side}</button>)}
                  </div>
                  <input type="number" min={1} max={50} value={play.yard_line} onChange={(e) => setPlay((p) => ({ ...p, yard_line: Number(e.target.value) }))} className="rounded border border-slate-700 bg-slate-950" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["LEFT", "MIDDLE", "RIGHT"] as const).map((hash) => <button key={hash} onClick={() => setPlay((p) => ({ ...p, hash }))} className={`rounded px-2 py-3 ${play.hash === hash ? "bg-emerald-500 text-slate-950" : "bg-slate-800"}`}>{hash}</button>)}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">Formation + Play</p>
                <button className="w-full rounded border border-slate-700 px-3 py-3 text-left" onClick={() => setShowFormationPicker((v) => !v)}>
                  {play.formation && play.play_name ? `${play.formation} → ${play.play_name}` : "Select Formation"}
                </button>
                {showFormationPicker ? (
                  <div className="max-h-52 space-y-2 overflow-y-auto rounded border border-slate-700 p-2">
                    {playbookOptions.map((row) => (
                      <div key={row.formation} className="rounded bg-slate-800 p-2 text-xs">
                        <p className="mb-1 font-semibold">{row.formation}</p>
                        <div className="flex flex-wrap gap-1">
                          {row.plays.map((playName) => (
                            <button
                              key={playName}
                              className="rounded bg-slate-700 px-2 py-1"
                              onClick={() => {
                                setPlay((p) => ({ ...p, formation: row.formation, play_name: playName }));
                                setShowFormationPicker(false);
                              }}
                            >
                              {playName}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">Result</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {RESULT_TAGS.map((tag) => <button key={tag} onClick={() => updateResultTag(tag)} className={`rounded px-2 py-2 ${play.result_tag === tag ? "bg-emerald-500 text-slate-950" : "bg-slate-800"}`}>{tag.replaceAll("_", " ")}</button>)}
                </div>
                <input type="number" value={play.yards_gained} onChange={(e) => setPlay((p) => ({ ...p, yards_gained: Number(e.target.value) }))} className="w-full rounded border border-slate-700 bg-slate-950" />
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">Note (optional)</p>
                <input maxLength={60} value={play.note} onChange={(e) => setPlay((p) => ({ ...p, note: e.target.value }))} className="w-full rounded border border-slate-700 bg-slate-950" placeholder="What happened? (optional)" />
              </div>

              <button onClick={savePlay} className="w-full rounded bg-emerald-500 py-3 font-medium text-slate-950">{editPlayId ? "Save Play" : "Log Play"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {game && drives.reduce((sum, d) => sum + (d.plays?.length ?? 0), 0) < 10 ? (
        <div
          className="rounded-lg border border-amber-800/50 bg-amber-500/10 p-4 text-sm text-amber-100"
          role="status"
          aria-live="polite"
        >
          <p className="font-medium text-amber-200">Partial log notice</p>
          <p className="mt-1 text-amber-100/90">This looks like a partial log. Incomplete data may affect recommendations.</p>
        </div>
      ) : null}
    </section>
  );
}
