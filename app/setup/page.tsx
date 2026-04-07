"use client";

import { TEAM_SCHEME_MAP, powerSpreadBaseSheet } from "@/lib/seedData";
import { useLiveGameStore } from "@/store/liveGameStore";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function SetupPage() {
  const router = useRouter();
  const teams = useMemo(() => Object.keys(TEAM_SCHEME_MAP), []);
  const [offense, setOffense] = useState("Washington State");
  const [defense, setDefense] = useState("Georgia");
  const setSessionId = useLiveGameStore((s) => s.setSessionId);
  const setPlaySheet = useLiveGameStore((s) => s.setPlaySheet);
  const patchGameState = useLiveGameStore((s) => s.patchGameState);

  const onStart = async () => {
    const sessionId = crypto.randomUUID();
    setSessionId(sessionId);
    patchGameState({ defensiveScheme: TEAM_SCHEME_MAP[defense].defensiveScheme });
    setPlaySheet(powerSpreadBaseSheet());
    await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: sessionId,
        offensive_team: offense,
        offensive_scheme: TEAM_SCHEME_MAP[offense].offensiveScheme,
        opponent_team: defense,
        opponent_defensive_scheme: TEAM_SCHEME_MAP[defense].defensiveScheme,
      }),
    });
    router.push(`/game/${sessionId}`);
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="font-display text-4xl text-white">New Game Setup</h1>
      <div className="mt-6 grid gap-4 rounded-xl border border-slate-700 bg-slate-900 p-4">
        <label className="text-sm text-slate-300">Your Team</label>
        <select className="rounded-lg border border-slate-700 bg-slate-800 p-2" value={offense} onChange={(e) => setOffense(e.target.value)}>
          {teams.map((t) => <option key={t}>{t}</option>)}
        </select>
        <label className="text-sm text-slate-300">Opponent</label>
        <select className="rounded-lg border border-slate-700 bg-slate-800 p-2" value={defense} onChange={(e) => setDefense(e.target.value)}>
          {teams.map((t) => <option key={t}>{t}</option>)}
        </select>
        <button className="mt-2 rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white" onClick={onStart}>
          Enter In-Game Mode
        </button>
      </div>
    </main>
  );
}
