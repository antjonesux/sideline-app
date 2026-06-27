"use client";

import { PlaybookCard } from "@/components/playbook/PlaybookCard";
import { PlaySheetHomeHeader } from "@/components/playbook/PlaySheetHomeHeader";
import { GAME_PLAN_EMPTY_BODY, GAME_PLAN_EMPTY_HEADLINE } from "@/lib/coachCopy";
import { playSheetQaSummaries } from "@/lib/playSheetQaFixture";

export function PlaySheetQaHomeEmpty() {
  return (
    <div className="space-y-6">
      <PlaySheetHomeHeader />

      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-4 py-10 text-center sm:px-8">
        <p className="font-sans text-base font-medium text-white">{GAME_PLAN_EMPTY_HEADLINE}</p>
        <p className="mt-2 font-sans text-sm text-slate-500">{GAME_PLAN_EMPTY_BODY}</p>
      </div>
    </div>
  );
}

export function PlaySheetQaHomeList() {
  const activeId = playSheetQaSummaries[0]?.id ?? null;

  return (
    <div className="flex min-h-[60vh] flex-col gap-6">
      <PlaySheetHomeHeader />

      <ul className="space-y-3">
        {playSheetQaSummaries.map((item) => (
          <li key={item.id} className="relative">
            <PlaybookCard item={item} isActive={item.id === activeId} />
          </li>
        ))}
      </ul>
    </div>
  );
}
