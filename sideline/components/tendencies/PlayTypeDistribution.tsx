"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS: Record<string, string> = {
  Run: "#10B981",
  Pass: "#3B82F6",
  "Play Action": "#06B6D4",
  Screen: "#8B5CF6",
  RPO: "#F4A522",
  Option: "#94A3B8",
  Other: "#334155",
  Unclassified: "#334155",
};

type Row = { name: string; pct: number; count: number };

type Props = {
  data: Row[];
};

export function PlayTypeDistribution({ data }: Props) {
  const chartData = data
    .filter((d) => d.name !== "Unclassified" || d.count > 0)
    .filter((d) => d.count > 0 || d.pct > 0)
    .map((d) => ({
      ...d,
      name: d.name === "Unclassified" ? `Unclassified (${d.count})` : d.name,
    }));
  if (chartData.length === 0) {
    return <p className="font-body text-sm text-slate-500">Not enough plays to chart play types.</p>;
  }

  return (
    <div className="app-card h-56 w-full p-2 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <XAxis type="category" dataKey="name" tick={{ fill: "#e2e8f0", fontSize: 11, fontFamily: "var(--font-jetbrains-mono)" }} axisLine={false} tickLine={false} />
          <YAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.[0]) return null;
              const row = payload[0].payload as Row;
              return (
                <div className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 shadow-lg">
                  <p className="font-mono text-[11px] text-slate-200">{label}</p>
                  <p className="font-mono text-[11px] text-slate-400">
                    {row.pct}% · {row.count} plays
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="pct" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={COLORS[entry.name.replace(/\s+\(\d+\)$/, "")] ?? "#64748b"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
