"use client";

type PlayType = "RUN" | "PASS" | "RPO";

function badgeClass(type: PlayType): string {
  if (type === "RUN") return "border-emerald-700/70 bg-emerald-900/30 text-emerald-300";
  if (type === "PASS") return "border-blue-700/70 bg-blue-900/30 text-blue-300";
  return "border-amber-700/70 bg-amber-900/30 text-amber-300";
}

export function PlayTypeBadge({ type }: { type: PlayType }) {
  return (
    <span
      className={`inline-flex min-h-6 min-w-[2.5rem] items-center justify-center rounded-full border px-2 font-mono text-[10px] uppercase tracking-wide ${badgeClass(type)}`}
    >
      {type}
    </span>
  );
}
