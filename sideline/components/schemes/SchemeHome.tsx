"use client";

import { useSchemeList } from "@/hooks/useSchemeList";
import { PlaySheetHomeSkeleton } from "@/components/shared/PageSkeleton";
import {
  COULDNT_LOAD,
  SCHEMES_CREATE_CTA,
  SCHEMES_EMPTY_BODY,
  SCHEMES_EMPTY_HEADLINE,
} from "@/lib/coachCopy";
import { appShellWorkspaceInnerClass } from "@/lib/constants/designTokens";
import { SchemeCard } from "./SchemeCard";
import { SchemeHomeHeader } from "./SchemeHomeHeader";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function SchemeHome() {
  const { data, isLoading, error, refetch, isFetching } = useSchemeList();

  const list = data ?? [];

  if (error) {
    return (
      <div className={`${appShellWorkspaceInnerClass} space-y-6`}>
        <SchemeHomeHeader />
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-3" role="alert">
          <p className="font-sans text-sm text-red-200">{COULDNT_LOAD}</p>
          <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={isFetching} onClick={() => void refetch()}>
            {isFetching ? "Hang on…" : "Try again"}
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <PlaySheetHomeSkeleton />;
  }

  return (
    <div className="flex min-h-[60vh] flex-col gap-6 md:gap-8">
      <SchemeHomeHeader schemeCount={list.length} />

      <div className={appShellWorkspaceInnerClass}>
        {list.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-center">
            <p className="font-body text-base font-medium text-white">{SCHEMES_EMPTY_HEADLINE}</p>
            <p className="mt-1 font-body text-sm text-slate-400">{SCHEMES_EMPTY_BODY}</p>
            <Button asChild variant="default" className="mt-4 text-sm">
              <Link href="/schemes/new">{SCHEMES_CREATE_CTA}</Link>
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {list.map((item) => (
              <li key={item.id} className="relative">
                <SchemeCard item={item} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
