"use client";

type Props = {
  touchdowns: number;
  first_downs: number;
  uses: number;
  avg_yards: number;
};

export function WorkingRankMetrics({ touchdowns, first_downs, uses, avg_yards }: Props) {
  const sep = <span className="mx-1.5 text-slate-600">·</span>;
  const parts: React.ReactNode[] = [];
  if (touchdowns > 0) {
    parts.push(
      <span key="td" className="text-emerald-400">
        <span className="tabular-nums">{touchdowns.toLocaleString("en-US")}</span> TD
      </span>,
    );
  }
  parts.push(
    <span key="fd">
      <span className="tabular-nums">{first_downs.toLocaleString("en-US")}</span>{" "}
      {first_downs === 1 ? "1st Down" : "1st Downs"}
    </span>,
  );
  parts.push(
    <span key="uses">
      <span className="tabular-nums">{uses.toLocaleString("en-US")}</span> calls
    </span>,
  );
  parts.push(
    <span key="avg">
      <span className="tabular-nums">{avg_yards.toFixed(1)}</span> avg yds
    </span>,
  );
  return (
    <p className="font-mono text-[11px] leading-relaxed text-slate-400">
      {parts.map((node, i) => (
        <span key={i}>
          {i > 0 ? sep : null}
          {node}
        </span>
      ))}
    </p>
  );
}
