"use client";

import Link from "next/link";
import { PublicTeamMark } from "@/components/marketing/PublicTeamMark";
import { isGenericOffensivePlaybook } from "@/lib/playbooks/generic-playbooks";
import { getTeamLogoInfo, getTeamMascot } from "@/lib/publicTeamLogos";
import { cn } from "@/lib/utils";

type PublicPlaybookCardProps = {
  name: string;
  /** Optional side disambiguation for names that exist on both sides (e.g. Multiple). */
  side?: "offense" | "defense";
};

export function PublicPlaybookCard({ name, side }: PublicPlaybookCardProps) {
  const href =
    side === "defense"
      ? `/playbooks/${encodeURIComponent(name)}?side=defense`
      : `/playbooks/${encodeURIComponent(name)}`;

  /** Team offense only — scheme/alternative + defense use initials, no mascot. */
  const showTeamBranding =
    side !== "defense" && !isGenericOffensivePlaybook(name) && Boolean(getTeamLogoInfo(name));
  const mascot = showTeamBranding ? getTeamMascot(name) : null;

  return (
    <Link
      href={href}
      className={cn(
        "flex h-full min-h-[5.75rem] flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-900 p-4 text-center transition-colors",
        "hover:border-emerald-600/50 hover:bg-slate-800/70",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500",
      )}
    >
      <PublicTeamMark playbookName={name} preferInitials={!showTeamBranding} />
      <div className="mt-3 min-w-0 w-full">
        <span className="block font-heading text-base font-bold uppercase tracking-[0.08em] text-white sm:text-lg">
          {name}
        </span>
        {mascot ? (
          <span className="mt-0.5 block font-body text-sm font-normal text-slate-400">{mascot}</span>
        ) : null}
      </div>
    </Link>
  );
}
