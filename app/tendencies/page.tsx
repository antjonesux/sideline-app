"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const data = [
  { game: "G1", sr: 42 },
  { game: "G2", sr: 48 },
  { game: "G3", sr: 54 },
  { game: "G4", sr: 51 },
  { game: "G5", sr: 61 },
];

export default function TendenciesPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="font-display text-4xl">Tendencies</h1>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-3"><p className="text-2xl">12</p><p className="text-xs text-slate-400">Total Games</p></div>
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-3"><p className="text-2xl">55.1%</p><p className="text-xs text-slate-400">Success Rate</p></div>
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-3"><p className="text-2xl">6.8</p><p className="text-xs text-slate-400">Avg Yards/Play</p></div>
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-3"><p className="text-2xl">Gun Empty Base Flex</p><p className="text-xs text-slate-400">Best Formation</p></div>
      </div>
      <div className="mt-4 h-64 rounded-xl border border-slate-700 bg-slate-900 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="game" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip />
            <Line type="monotone" dataKey="sr" stroke="#10b981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </main>
  );
}
