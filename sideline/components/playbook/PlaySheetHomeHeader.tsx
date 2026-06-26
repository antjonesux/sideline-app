"use client";

import { AppShellMenuLink } from "@/components/shared/AppTopBar";
import { PLAY_SHEETS_HOME_TITLE } from "@/lib/coachCopy";
import { appShellPageTitleClass } from "@/lib/constants/designTokens";

export function PlaySheetHomeHeader() {
  return (
    <header className="flex items-center gap-2">
      <AppShellMenuLink ariaLabel="Open menu" />
      <h1 className={`${appShellPageTitleClass} min-w-0 truncate`}>{PLAY_SHEETS_HOME_TITLE}</h1>
    </header>
  );
}
