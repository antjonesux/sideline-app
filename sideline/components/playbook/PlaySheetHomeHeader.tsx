"use client";

import { AppShellMenuHeader } from "@/components/shared/AppShellMenuHeader";
import {
  APP_SHELL_NEW_CALL_SHEET_LABEL,
  PLAY_SHEETS_HOME_TITLE,
  playSheetsHomeCountLabel,
} from "@/lib/coachCopy";
import { appShellHeaderPrimaryCtaClass, appShellWorkspaceInnerClass } from "@/lib/constants/designTokens";
import { Plus } from "lucide-react";
import Link from "next/link";

export function PlaySheetHomeHeader({ sheetCount }: { sheetCount?: number }) {
  const countLabel = sheetCount !== undefined ? playSheetsHomeCountLabel(sheetCount) : null;

  return (
    <div className={appShellWorkspaceInnerClass}>
      <AppShellMenuHeader
        title={PLAY_SHEETS_HOME_TITLE}
        className="md:items-start md:justify-between md:gap-6"
        titleClassName="md:text-[2rem] md:leading-none md:tracking-tight"
        trailing={
          <Link href="/playbook/new" className={`${appShellHeaderPrimaryCtaClass} hidden md:inline-flex`}>
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            {APP_SHELL_NEW_CALL_SHEET_LABEL}
          </Link>
        }
      />
      {countLabel ? (
        <p className="mt-2 hidden font-body text-sm text-slate-500 md:block">{countLabel}</p>
      ) : null}
    </div>
  );
}
