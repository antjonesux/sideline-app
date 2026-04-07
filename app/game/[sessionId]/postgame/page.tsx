"use client";

import { useLiveGameStore } from "@/store/liveGameStore";
import { successRate } from "@/lib/successRate";
import { useState } from "react";

export default function PostGamePage({ params }: { params: { sessionId: string } }) {
  const loggedPlays = useLiveGameStore((s) => s.loggedPlays);
  const [result, setResult] = useState<"W" | "L">("W");
  const [finalScore, setFinalScore] = useState("");
  const [note, setNote] = useState("");
  const rate = successRate(loggedPlays.map((p) => p.resultTag));

  const onSave = async () => {
    await fetch(`/api/sessions/${params.sessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ended_at: new Date().toISOString(), result, final_score: finalScore, postgame_note: note }),
    });
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="font-display text-4xl">Post-Game Summary</h1>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-3"><p className="text-2xl">{loggedPlays.length}</p><p className="text-xs text-slate-400">Plays</p></div>
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-3"><p className="text-2xl">{rate.toFixed(1)}%</p><p className="text-xs text-slate-400">Success Rate</p></div>
      </div>
      <div className="mt-4 flex gap-2">
        <button className={`rounded-lg px-4 py-2 ${result === "W" ? "bg-emerald-700" : "bg-slate-700"}`} onClick={() => setResult("W")}>W</button>
        <button className={`rounded-lg px-4 py-2 ${result === "L" ? "bg-red-700" : "bg-slate-700"}`} onClick={() => setResult("L")}>L</button>
        <input className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2" placeholder="35-21" value={finalScore} onChange={(e) => setFinalScore(e.target.value)} />
      </div>
      <textarea className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900 p-3" maxLength={150} placeholder="What to remember for next time?" value={note} onChange={(e) => setNote(e.target.value)} />
      <button className="mt-3 w-full rounded-lg bg-emerald-700 py-3" onClick={onSave}>Save Game</button>
    </main>
  );
}
