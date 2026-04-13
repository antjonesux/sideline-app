function classesForResult(raw: string): string {
  const u = raw.trim().toUpperCase().replace(/_/g, " ");
  if (u === "FIRST DOWN" || u === "TOUCHDOWN") return "border-emerald-600 bg-emerald-900/40 text-emerald-300";
  if (u === "GAIN") return "border-sky-600 bg-sky-900/35 text-sky-200";
  if (u === "SACK" || u === "TURNOVER") return "border-red-700 bg-red-900/35 text-red-300";
  if (u === "INCOMPLETE" || u === "NO GAIN") return "border-slate-600 bg-slate-800/80 text-slate-400";
  if (u === "PENALTY") return "border-amber-600 bg-amber-900/35 text-amber-200";
  return "border-slate-600 bg-slate-800 text-slate-300";
}

export function ResultBadge({ label }: { label: string }) {
  const display = label.replace(/_/g, " ");
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${classesForResult(label)}`}
    >
      {display}
    </span>
  );
}
