"use client";

import { PublicTeamMark } from "@/components/marketing/PublicTeamMark";
import { getTeamMascot } from "@/lib/publicTeamLogos";
import { Search } from "lucide-react";

/** Browse Playbooks grid — matches PublicPlaybookCard with real team logos. */
export function WelcomeBrowsePlaybooksMockup() {
  const teams = ["Alabama", "Ohio State", "Michigan", "Georgia"] as const;

  return (
    <div className="w-full max-w-[420px] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-lg">
      <div className="border-b border-slate-800 px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
          <span className="font-body text-[11px] text-slate-500">Search playbooks…</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 p-2.5">
        {teams.map((name) => {
          const mascot = getTeamMascot(name);
          return (
            <div
              key={name}
              className="flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-2 py-2.5 text-center"
            >
              <PublicTeamMark playbookName={name} className="h-8 w-8" />
              <p className="mt-1.5 w-full truncate font-heading text-[11px] font-bold uppercase tracking-[0.06em] text-white">
                {name}
              </p>
              {mascot ? (
                <p className="mt-0.5 w-full truncate font-body text-[10px] font-normal text-slate-400">
                  {mascot}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
