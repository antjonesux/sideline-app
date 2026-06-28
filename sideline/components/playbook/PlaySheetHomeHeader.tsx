"use client";

import { AppShellMenuHeader } from "@/components/shared/AppShellMenuHeader";
import { PLAY_SHEET_CREATE_CTA, PLAY_SHEETS_HOME_TITLE } from "@/lib/coachCopy";
import { appShellHeaderActionButtonClass } from "@/lib/constants/designTokens";
import Link from "next/link";

export function PlaySheetHomeHeader() {
  return (
    <AppShellMenuHeader
      title={PLAY_SHEETS_HOME_TITLE}
      trailing={
        <Link href="/playbook/new" className={appShellHeaderActionButtonClass}>
          {PLAY_SHEET_CREATE_CTA}
        </Link>
      }
    />
  );
}
