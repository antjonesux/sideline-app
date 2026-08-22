import type { Quarter } from "@/components/film/DriveSetupForm";
import { getDrivePossessionOutcome, type DrivePossessionOutcome } from "@/lib/driveOutcome";
import type { Drive, LoggedPlay } from "@/lib/types";

export function quarterFromDriveForSetup(q: number | null | undefined): Quarter {
  if (q == null || q < 1) return "1";
  if (q >= 5) return "OT";
  const clamped = Math.min(4, Math.floor(q)) as 1 | 2 | 3 | 4;
  return String(clamped) as Quarter;
}

export function getDriveResult(plays: LoggedPlay[] | undefined | null): DrivePossessionOutcome {
  return getDrivePossessionOutcome(plays);
}

function normalizeResultTag(tag: string): string {
  return tag.trim().toUpperCase().replace(/_/g, " ");
}

export function formatGameDetailDate(isoDate: string): string {
  const parts = isoDate.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return isoDate;
  const [y, m, d] = parts;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(y, m - 1, d),
  );
}

/** Drive summary header badge label (short codes mapped to display copy in `DriveCardOutcomeBadge`). */
export function getDriveSummaryOutcomeLabel(
  drive: Drive,
  opts: { isLastDrive: boolean; isGameEnded: boolean },
): string {
  const plays = drive.plays ?? [];
  const outcome = getDriveResult(plays);
  const last = plays[plays.length - 1];
  if (opts.isLastDrive && opts.isGameEnded) return "GAME ENDED";

  if (outcome === "TOUCHDOWN") return "TD";
  if (outcome === "FIELD_GOAL") return "FG";
  if (outcome === "TURNOVER") return "TURNOVER";
  if (outcome === "PUNT") return "PUNT";
  if (outcome === "TURNOVER_ON_DOWNS") return "TOD";
  if (outcome === "NO_PLAYS") return "NO PLAYS";

  if (last) {
    const norm = normalizeResultTag(last.result_tag);
    if (norm === "FIRST DOWN") return "FIRST DOWN";
    if (norm === "NO GAIN") return "NO GAIN";
  }

  if (opts.isLastDrive) return "ACTIVE";
  return "RECORDED";
}

export const gameDetailTabTriggerClass =
  "flex min-h-12 w-full items-center justify-center rounded-none border-b-2 border-transparent bg-transparent px-2 text-center text-sm font-sans font-medium text-slate-400 shadow-none ring-offset-transparent transition-colors data-[state=active]:border-amber-400 data-[state=active]:bg-transparent data-[state=active]:text-slate-100 data-[state=active]:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400";

export const filmGameSecondaryActionClass =
  "inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-slate-700 px-3 py-1.5 font-sans text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500";
