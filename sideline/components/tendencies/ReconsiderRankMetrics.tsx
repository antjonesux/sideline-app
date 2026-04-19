"use client";

type Props = {
  touchdowns: number;
  first_downs: number;
  uses: number;
  avg_yards: number;
};

export function ReconsiderRankMetrics({ touchdowns, first_downs, uses, avg_yards }: Props) {
  const sep = <span className="mx-1.5 text-slate-600">·</span>;
  const avgClass =
    avg_yards < 0 ? "text-red-400" : avg_yards >= 3 ? "text-slate-500" : "text-amber-400";
  const fdClass = first_downs === 0 ? "text-red-400" : "text-slate-400";

  const parts: React.ReactNode[] = [
    <span key="td" className="text-red-400">
      <span className="tabular-nums">{touchdowns.toLocaleString("en-US")}</span> TD
    </span>,
    <span key="fd" className={fdClass}>
      <span className="tabular-nums">{first_downs.toLocaleString("en-US")}</span>{" "}
      {first_downs === 1 ? "1st Down" : "1st Downs"}
    </span>,
    <span key="uses" className="text-slate-400">
      <span className="tabular-nums">{uses.toLocaleString("en-US")}</span> calls
    </span>,
    <span key="avg" className={avgClass}>
      <span className="tabular-nums">{avg_yards.toFixed(1)}</span> avg yds
    </span>,
  ];

  return (
    <p className="font-mono text-[11px] leading-relaxed">
      {parts.map((node, i) => (
        <span key={i}>
          {i > 0 ? sep : null}
          {node}
        </span>
      ))}
    </p>
  );
}
