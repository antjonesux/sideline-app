"use client";

import { PlaybookCard } from "@/components/playbook/PlaybookCard";
import { SettingsLink } from "@/components/shared/AppTopBar";
import { Button } from "@/components/ui/button";
import {
  GAME_PLAN_EMPTY_BODY,
  GAME_PLAN_EMPTY_HEADLINE,
  PLAYBOOK_NEW_SHEET_TITLE,
} from "@/lib/coachCopy";
import { appShellPageTitleClass } from "@/lib/constants/designTokens";
import { playSheetQaSummaries } from "@/lib/playSheetQaFixture";
import Link from "next/link";

export function PlaySheetQaHomeEmpty() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className={`${appShellPageTitleClass} flex w-full min-w-0 items-center justify-between gap-4`}>
          <span className="min-w-0">Play Sheet</span>
          <SettingsLink />
        </h1>
      </div>

      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-900 p-4 py-10 text-center sm:px-8">
        <p className="font-sans text-base font-medium text-white">{GAME_PLAN_EMPTY_HEADLINE}</p>
        <p className="mt-2 font-sans text-sm text-slate-500">{GAME_PLAN_EMPTY_BODY}</p>
        <Button asChild variant="default" className="mt-6 inline-flex px-5 py-2.5 text-sm">
          <Link href="/playbook/new">{PLAYBOOK_NEW_SHEET_TITLE}</Link>
        </Button>
      </div>
    </div>
  );
}

export function PlaySheetQaHomeList() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className={`${appShellPageTitleClass} flex w-full min-w-0 items-center justify-between gap-4`}>
          <span className="min-w-0">Play Sheet</span>
          <SettingsLink />
        </h1>
        <Button asChild variant="default" className="text-sm">
          <Link href="/playbook/new">Create play sheet</Link>
        </Button>
      </div>

      <ul className="space-y-3">
        {playSheetQaSummaries.map((item) => (
          <li key={item.id} className="relative">
            <PlaybookCard item={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}
