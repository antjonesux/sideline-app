import { cn } from "@/lib/utils";

/** Film game-detail drive card header only — Figma-aligned tokens; does not replace shared `ResultBadge` elsewhere. */
export function DriveCardOutcomeBadge({ label }: { label: string }) {
  const base =
    "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[11px] font-medium uppercase leading-[16.5px] tracking-[0.28px]";
  const figmaSuccess =
    "border-[rgba(0,153,102,0.8)] bg-[rgba(0,79,59,0.45)] text-[#A4F4CF]";
  const muted =
    "border-[rgba(49,65,88,0.85)] bg-[rgba(30,41,59,0.35)] text-[#62748E]";
  const danger = "border-[rgba(220,38,38,0.75)] bg-[rgba(85,28,28,0.4)] text-[#fecaca]";
  const warning = "border-[rgba(217,119,6,0.78)] bg-[rgba(120,53,15,0.38)] text-[#fde68a]";
  const neutral = "border-[rgba(49,65,88,0.85)] bg-[rgba(30,41,59,0.35)] text-[#94a3b8]";

  if (label === "NO PLAYS" || label === "ACTIVE" || label === "RECORDED" || label === "GAME ENDED") {
    return <span className={cn(base, muted)}>{label}</span>;
  }

  const display =
    label === "TD" ? "TOUCHDOWN" : label === "FG" ? "FIELD GOAL" : label === "TOD" ? "TURNOVER ON DOWNS" : label;

  const surface =
    label === "TD" || label === "FG" || label === "FIRST DOWN"
      ? figmaSuccess
      : label === "TURNOVER" || label === "INTERCEPTION" || label === "FUMBLE"
        ? danger
        : label === "TOD"
          ? warning
          : neutral;

  return <span className={cn(base, surface)}>{display}</span>;
}
