"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Drive } from "@/lib/types";

const PLAY_DEFAULT = {
  down: 1,
  distance: 10,
  yard_line: 25,
  side: "OWN",
  hash: "MIDDLE",
  formation: "Pistol U Off",
  play_name: "HB Zone Wk",
  result_tag: "GAIN",
  yards_gained: 4,
  note: "",
  opponent_scheme: "Unknown",
};

export default function GameLogPage({ params }: { params: { gameId: string } }) {
  const [drives, setDrives] = useState<Drive[]>([]);
  const [activeDrive, setActiveDrive] = useState<string>("");
  const [play, setPlay] = useState(PLAY_DEFAULT);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/games/${params.gameId}/drives`)
      .then((res) => res.json())
      .then((data: Drive[]) => {
        if (cancelled) return;
        setDrives(data);
        setActiveDrive((current) => current || data[0]?.id || "");
      });
    return () => {
      cancelled = true;
    };
  }, [params.gameId]);

  async function refresh() {
    const res = await fetch(`/api/games/${params.gameId}/drives`);
    const data = (await res.json()) as Drive[];
    setDrives(data);
    if (!activeDrive && data[0]) setActiveDrive(data[0].id);
  }

  async function addDrive() {
    await fetch(`/api/games/${params.gameId}/drives`, { method: "POST", body: JSON.stringify({ drive_number: drives.length + 1, note: "" }) });
    await refresh();
  }

  async function logPlay(e: FormEvent) {
    e.preventDefault();
    if (!activeDrive) return;
    await fetch(`/api/drives/${activeDrive}/plays`, { method: "POST", body: JSON.stringify({ ...play, game_session_id: params.gameId }) });
    setPlay((prev) => ({ ...prev, down: prev.result_tag === "FIRST_DOWN" || prev.result_tag === "TOUCHDOWN" ? 1 : Math.min(prev.down + 1, 4) }));
    await refresh();
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="font-display text-3xl">Drive Log</h1><button onClick={addDrive} className="rounded bg-emerald-500 px-3 py-2 text-slate-950">+ Add Drive</button></div>
      <div className="space-y-3">
        {drives.map((drive) => (
          <div key={drive.id} className="rounded border border-slate-800 bg-slate-900 p-3">
            <button className="flex w-full items-center justify-between text-left" onClick={() => setActiveDrive(drive.id)}><span>Drive {drive.drive_number}</span><span className="text-slate-400">{drive.plays?.length ?? 0} plays</span></button>
            <div className="mt-2 space-y-2">{drive.plays?.map((p) => <div key={p.id} className="rounded bg-slate-800 p-2 text-xs">{p.down}-{p.distance} {p.side} {p.yard_line} {p.hash} · {p.formation} → {p.play_name} · {p.yards_gained} · {p.result_tag}</div>)}</div>
          </div>
        ))}
      </div>
      <form onSubmit={logPlay} className="space-y-2 rounded border border-slate-800 bg-slate-900 p-4">
        <h2 className="font-display text-2xl">Play Logger</h2>
        <div className="grid grid-cols-2 gap-2">{Object.entries(play).map(([key, value]) => <label key={key} className="text-xs"><span className="mb-1 block text-slate-400">{key}</span><input className="w-full rounded border border-slate-700 bg-slate-950" value={String(value)} onChange={(e) => setPlay((prev) => ({ ...prev, [key]: e.target.value }))} /></label>)}</div>
        <button className="w-full rounded bg-emerald-500 py-2 text-slate-950">Log Play</button>
      </form>
    </section>
  );
}
