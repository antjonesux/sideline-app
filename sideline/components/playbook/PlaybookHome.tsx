"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { usePlaybookList } from "@/hooks/usePlaybookList";
import { PlaySheetHomeSkeleton } from "@/components/shared/PageSkeleton";
import { COULDNT_LOAD, GAME_PLAN_EMPTY_BODY, GAME_PLAN_EMPTY_HEADLINE } from "@/lib/coachCopy";
import { appShellWorkspaceInnerClass } from "@/lib/constants/designTokens";
import { CATALOG_GAME_VERSION_LABELS } from "@/lib/constants";
import { callSheetMatchesVersionFilter, parseCallSheetVersionFilter } from "@/lib/callSheetVersionFilter";
import { PlaybookCard } from "./PlaybookCard";
import { PlaySheetHomeHeader } from "./PlaySheetHomeHeader";
import { CallSheetsVersionFilter } from "./CallSheetsVersionFilter";
import { Button } from "@/components/ui/button";

export function PlaybookHome() {
  const searchParams = useSearchParams();
  const versionFilter = parseCallSheetVersionFilter(searchParams.get("version"));
  const { data, isLoading, error, refetch, isFetching } = usePlaybookList();

  const allSheets = data?.playbooks ?? [];
  const list = useMemo(
    () => allSheets.filter((item) => callSheetMatchesVersionFilter(item.game_version, versionFilter)),
    [allSheets, versionFilter],
  );
  const hasSheetsInOtherVersion = allSheets.length > 0 && list.length === 0;

  if (error) {
    return (
      <div className={`${appShellWorkspaceInnerClass} space-y-6`}>
        <PlaySheetHomeHeader />
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
      <PlaySheetHomeHeader sheetCount={list.length} />

      <div className={appShellWorkspaceInnerClass}>
        <Suspense fallback={null}>
          <CallSheetsVersionFilter className="mb-4" />
        </Suspense>

        {list.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-4 py-10 text-center sm:px-8">
            {hasSheetsInOtherVersion ? (
              <>
                <p className="font-sans text-base font-medium text-white">
                  No call sheets for {CATALOG_GAME_VERSION_LABELS[versionFilter]}
                </p>
                <p className="mt-2 font-sans text-sm text-slate-500">
                  Switch the game version filter to see your other call sheets.
                </p>
              </>
            ) : (
              <>
                <p className="font-sans text-base font-medium text-white">{GAME_PLAN_EMPTY_HEADLINE}</p>
                <p className="mt-2 font-sans text-sm text-slate-500">{GAME_PLAN_EMPTY_BODY}</p>
              </>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {list.map((item) => (
              <li key={item.id} className="relative">
                <PlaybookCard item={item} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
