"use client";

import { AppShellMenuHeader } from "@/components/shared/AppShellMenuHeader";
import { PLAY_SHEET_CREATE_CTA, PLAY_SHEETS_HOME_TITLE } from "@/lib/coachCopy";
import Link from "next/link";

const addSheetHeaderActionClass =
  "shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 font-sans text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-white";

export function PlaySheetHomeHeader() {
  return (
    <AppShellMenuHeader
      title={PLAY_SHEETS_HOME_TITLE}
      trailing={
        <Link href="/playbook/new" className={addSheetHeaderActionClass}>
          {PLAY_SHEET_CREATE_CTA}
        </Link>
      }
    />
  );
}
