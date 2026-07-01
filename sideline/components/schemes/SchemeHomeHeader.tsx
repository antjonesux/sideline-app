"use client";

import { AppShellMenuHeader } from "@/components/shared/AppShellMenuHeader";
import {
  APP_SHELL_NEW_SCHEME_LABEL,
  SCHEMES_HOME_TITLE,
  schemesHomeCountLabel,
} from "@/lib/coachCopy";
import { appShellHeaderPrimaryCtaClass, appShellWorkspaceInnerClass } from "@/lib/constants/designTokens";
import { Plus } from "lucide-react";
import Link from "next/link";

export function SchemeHomeHeader({ schemeCount }: { schemeCount?: number }) {
  const countLabel = schemeCount !== undefined ? schemesHomeCountLabel(schemeCount) : null;

  return (
    <div className={appShellWorkspaceInnerClass}>
      <AppShellMenuHeader
        title={SCHEMES_HOME_TITLE}
        className="md:items-start md:justify-between md:gap-6"
        titleClassName="md:text-[2rem] md:leading-none md:tracking-tight"
        trailing={
          <Link href="/schemes/new" className={`${appShellHeaderPrimaryCtaClass} hidden md:inline-flex`}>
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            {APP_SHELL_NEW_SCHEME_LABEL}
          </Link>
        }
      />
      {countLabel ? (
        <p className="mt-2 hidden font-body text-sm text-slate-500 md:block">{countLabel}</p>
      ) : null}
    </div>
  );
}
