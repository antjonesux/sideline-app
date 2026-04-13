"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { useEffect, useState } from "react";

type TendenciesResponse = { overview: Record<string, string | number>; scenarioBreakdown: { scenario: string; success_rate: number }[]; history: { id: string; created_at: string; scenario: string; formation: string; play_name: string; hash: string; yards_gained: number }[] };

export default function TendenciesPage() {
  const [data, setData] = useState<TendenciesResponse | null>(null);
  useEffect(() => {
    fetch("/api/tendencies").then((r) => r.json()).then((d: TendenciesResponse) => setData(d));
  }, []);

  return (
    <section className="space-y-4">
      <h1 className="font-display text-3xl">Tendencies</h1>
      <div className="grid grid-cols-2 gap-2">{Object.entries(data?.overview ?? {}).map(([k, v]) => <div key={k} className="rounded bg-slate-900 p-3"><p className="text-xs text-slate-400">{k}</p><p className="text-xl">{String(v)}</p></div>)}</div>
      <div className="h-72 rounded bg-slate-900 p-3"><ResponsiveContainer width="100%" height="100%"><BarChart data={data?.scenarioBreakdown ?? []} layout="vertical"><XAxis type="number" /><YAxis type="category" dataKey="scenario" width={110} /><Bar dataKey="success_rate" fill="#10b981" /></BarChart></ResponsiveContainer></div>
      <div className="rounded bg-slate-900 p-3"><p className="mb-2 text-sm text-slate-400">Play History</p><div className="space-y-1 text-xs">{data?.history?.map((row) => <div key={row.id} className="rounded bg-slate-800 p-2">{row.created_at?.slice(0, 10)} · {row.scenario} · {row.formation} → {row.play_name} · {row.hash} · {row.yards_gained}</div>)}</div></div>
    </section>
  );
}
