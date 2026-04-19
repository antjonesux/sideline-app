function classesForResult(raw: string): string {
  const u = raw.trim().toUpperCase().replace(/_/g, " ");
  if (u === "FIRST DOWN" || u === "TOUCHDOWN" || u === "FIELD GOAL") return "border-emerald-600/80 bg-emerald-900/45 text-emerald-200";
  if (u === "GAIN") return "border-sky-600/80 bg-sky-900/40 text-sky-200";
  if (u === "SACK" || u === "LOSS" || u === "TURNOVER") return "border-red-700/80 bg-red-900/40 text-red-200";
  if (u === "TURNOVER ON DOWNS" || u === "TOD") return "border-amber-600/80 bg-amber-900/45 text-amber-200";
  if (u === "INCOMPLETE" || u === "NO GAIN" || u === "PUNT") return "border-[#2A2E3A] bg-[#1C1F28] text-[#A0A3AD]";
  if (u === "PENALTY") return "border-amber-600/80 bg-amber-900/40 text-amber-200";
  return "border-[#2A2E3A] bg-[#1C1F28] text-[#A0A3AD]";
}

export function ResultBadge({ label }: { label: string }) {
  const display = label.replace(/_/g, " ");
  return (
    <span
      className={`font-mono inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${classesForResult(label)}`}
    >
      {display}
    </span>
  );
}
