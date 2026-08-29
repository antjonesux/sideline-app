"use client";

import Link from "next/link";
import { PublicTeamMark } from "@/components/marketing/PublicTeamMark";
import { isGenericOffensivePlaybook } from "@/lib/playbooks/generic-playbooks";
import { getTeamMascot, getTeamLogoInfo } from "@/lib/publicTeamLogos";
import type { PublicPlaybookCrossRef } from "@/lib/publicPlaybooksServer";
import { cn } from "@/lib/utils";

type PublicCrossRefSectionProps = {
  title: string;
  refs: PublicPlaybookCrossRef[];
  /** Build href for each cross-ref row. */
  hrefFor: (ref: PublicPlaybookCrossRef) => string;
};

export function PublicCrossRefSection({ title, refs, hrefFor }: PublicCrossRefSectionProps) {
  if (refs.length === 0) {
    return (
      <section className="mt-12">
        <h2 className="font-heading text-sm font-bold uppercase tracking-[0.08em] text-white sm:text-base">
          {title}
        </h2>
        <p className="mt-3 font-body text-sm text-slate-500">No other playbooks list this yet.</p>
      </section>
    );
  }

  return (
    <section className="mt-12">
      <h2 className="font-heading text-sm font-bold uppercase tracking-[0.08em] text-white sm:text-base">
        {title}
      </h2>
      <ul className="mt-4 grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {refs.map((ref) => {
          const showTeam =
            ref.side_of_ball !== "defense" &&
            !isGenericOffensivePlaybook(ref.playbook) &&
            Boolean(getTeamLogoInfo(ref.playbook));
          const mascot = showTeam ? getTeamMascot(ref.playbook) : null;
          return (
            <li key={`${ref.side_of_ball}:${ref.playbook}:${ref.formation}`}>
              <Link
                href={hrefFor(ref)}
                className={cn(
                  "flex h-full min-h-[5.75rem] flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-900 p-4 text-center transition-colors",
                  "hover:border-emerald-600/50 hover:bg-slate-800/70",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500",
                )}
              >
                <PublicTeamMark playbookName={ref.playbook} preferInitials={!showTeam} />
                <div className="mt-3 min-w-0 w-full">
                  <span className="block font-heading text-base font-bold uppercase tracking-[0.08em] text-white">
                    {ref.playbook}
                  </span>
                  {mascot ? (
                    <span className="mt-0.5 block font-body text-sm font-normal text-slate-400">{mascot}</span>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
