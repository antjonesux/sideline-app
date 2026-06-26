"use client";

import { BackNavLink } from "@/components/shared/BackNavLink";
import { appShellPageTitleClass } from "@/lib/constants/designTokens";

export function CallSheetBuilderSituationHeader({
  backHref,
  title,
  subtitle,
  playCountLabel,
}: {
  backHref: string;
  title: string;
  subtitle: string;
  playCountLabel: string;
}) {
  return (
    <>
      <BackNavLink href={backHref} />

      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className={`${appShellPageTitleClass} mt-0 min-w-0`}>{title}</h1>
            {subtitle ? <p className="mt-1 font-body text-sm text-slate-400">{subtitle}</p> : null}
          </div>
          <p className="shrink-0 pt-1 font-body text-sm text-slate-400">{playCountLabel}</p>
        </div>
      </div>
    </>
  );
}
