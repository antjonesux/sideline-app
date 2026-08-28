"use client";

import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS: Record<string, string> = {
  Run: "#10b981",
  Pass: "#3b82f6",
  "Play Action": "#06b6d4",
  Screen: "#8b5cf6",
  RPO: "#f59e0b",
  Option: "#94a3b8",
  Other: "#475569",
  Unclassified: "#475569",
};

const TEXT_COLORS: Record<string, string> = {
  Run: "text-emerald-500",
  Pass: "text-blue-500",
  "Play Action": "text-cyan-500",
  Screen: "text-violet-500",
  RPO: "text-amber-500",
  Option: "text-slate-400",
  Other: "text-slate-600",
  Unclassified: "text-slate-600",
};

type Row = { name: string; pct: number; count: number };

type Props = {
  data: Row[];
};

function DistributionBarList({ rows, showAll, onToggleShowAll }: { rows: Row[]; showAll: boolean; onToggleShowAll: () => void }) {
  const visibleRows = showAll ? rows : rows.slice(0, 8);

  return (
    <>
      <div className="space-y-2">
        {visibleRows.map((row) => {
          const width = Math.max(4, Math.min(100, row.pct));
          return (
            <div key={row.name} className="grid min-h-8 grid-cols-[minmax(110px,1fr)_minmax(120px,2fr)_48px] items-center gap-2 py-1">
              <span className="truncate font-body text-sm text-slate-200">{row.name}</span>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <svg className={`h-full w-full ${TEXT_COLORS[row.name] ?? "text-slate-500"}`} viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden>
                  <rect x="0" y="0" width={width} height="8" rx="2" fill="currentColor" />
                </svg>
              </div>
              <span className="w-12 text-left font-mono text-sm tabular-nums text-slate-300">{Math.round(row.pct)}%</span>
            </div>
          );
        })}
      </div>
      {rows.length > 8 ? (
        <button type="button" className="mt-3 font-body text-sm text-emerald-300 hover:text-emerald-200" onClick={onToggleShowAll}>
          {showAll ? "Show top 8" : `Show all (${rows.length})`}
        </button>
      ) : null}
    </>
  );
}

function DistributionLegend({ rows }: { rows: Row[] }) {
  return (
    <ul className="space-y-2" aria-label="Play type breakdown">
      {rows.map((row) => (
        <li key={row.name} className="font-body text-sm text-slate-300">
          <span className={`font-medium ${TEXT_COLORS[row.name] ?? "text-slate-400"}`}>{row.name}</span>
          <span className="text-slate-500"> · </span>
          <span className="font-mono tabular-nums">{Math.round(row.pct)}%</span>
          <span className="text-slate-500"> · </span>
          <span className="font-mono tabular-nums text-slate-400">
            {row.count.toLocaleString("en-US")} {row.count === 1 ? "call" : "calls"}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PlayTypeDistribution({ data }: Props) {
  const [showAll, setShowAll] = useState(false);
  const rows = useMemo(
    () =>
      data
        .filter((d) => d.name !== "Unclassified")
        .filter((d) => d.count > 0 || d.pct > 0)
        .sort((a, b) => b.pct - a.pct),
    [data],
  );

  const chartData = useMemo(
    () => rows.map((row) => ({ name: row.name, value: row.count, pct: row.pct, fill: COLORS[row.name] ?? "#64748b" })),
    [rows],
  );

  if (rows.length === 0) {
    return <p className="font-sans text-sm text-slate-500">Need more logged calls to split play types.</p>;
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <div className="md:hidden">
        <DistributionBarList rows={rows} showAll={showAll} onToggleShowAll={() => setShowAll((v) => !v)} />
      </div>

      <div className="hidden md:grid md:grid-cols-[minmax(200px,1fr)_minmax(0,1.2fr)] md:items-center md:gap-6">
        <div className="mx-auto h-[220px] w-full max-w-[280px]" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={88}
                paddingAngle={1}
                stroke="none"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "0.5rem" }}
                labelStyle={{ color: "#e2e8f0" }}
                itemStyle={{ color: "#cbd5e1" }}
                formatter={(value, _name, item) => {
                  const count = typeof value === "number" ? value : Number(value ?? 0);
                  const payload = item && "payload" in item ? item.payload : null;
                  const pct = payload && typeof payload === "object" && "pct" in payload && typeof payload.pct === "number" ? payload.pct : 0;
                  const label = payload && typeof payload === "object" && "name" in payload && typeof payload.name === "string" ? payload.name : "";
                  return [`${count.toLocaleString("en-US")} calls (${Math.round(pct)}%)`, label];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <DistributionLegend rows={rows} />
      </div>
    </div>
  );
}
