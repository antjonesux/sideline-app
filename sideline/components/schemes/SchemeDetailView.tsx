"use client";

import { CallSheetCoachView } from "@/components/playbook/CallSheetCoachView";
import { CallSheetMetadataRow } from "@/components/playbook/CallSheetMetadataRow";
import { AppShellMenuHeader } from "@/components/shared/AppShellMenuHeader";
import { SchemeSideToggle } from "@/components/schemes/SchemeSideToggle";
import { useCatalogPlaybookMeta } from "@/hooks/useCatalogPlaybooks";
import {
  COULDNT_LOAD,
  SCHEME_DETAIL_EDIT_SCHEME,
  SCHEME_DETAIL_EDIT_SHEET,
  SCHEME_DETAIL_LOADING_SHEET,
  SCHEME_DETAIL_NO_SHEETS,
} from "@/lib/coachCopy";
import { appShellHeaderActionButtonClass, appShellWorkspaceInnerClass } from "@/lib/constants/designTokens";
import type { CatalogSideOfBall } from "@/lib/constants";
import { fetchPlaySheetOverview } from "@/lib/filmLoggerCatalogFetch";
import { filmLoggerQueryKeys } from "@/lib/filmLoggerQueryKeys";
import { callSheetDetailsMetadataLabels } from "@/lib/playbookUtils";
import { playbookEditorHref } from "@/lib/navigation/playSheetNav";
import { fetchSchemeDetail, schemeDetailQueryKey } from "@/lib/schemeDetailQuery";
import type { SchemeDetail } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function schemeAvailableSides(scheme: SchemeDetail): CatalogSideOfBall[] {
  return scheme.call_sheets.map((entry) => entry.side_of_ball);
}

function schemeEntryForSide(scheme: SchemeDetail, side: CatalogSideOfBall) {
  return scheme.call_sheets.find((entry) => entry.side_of_ball === side) ?? null;
}

function defaultSide(scheme: SchemeDetail): CatalogSideOfBall {
  const sides = schemeAvailableSides(scheme);
  if (sides.includes("offense")) return "offense";
  return sides[0] ?? "offense";
}

function SchemeActiveSheetPanel({
  sheetId,
  sheetName,
  cfb26Playbook,
  schemeStyle,
  returnTo,
}: {
  sheetId: string;
  sheetName: string;
  cfb26Playbook: string;
  schemeStyle: string;
  returnTo: string;
}) {
  const { data: catalogMeta } = useCatalogPlaybookMeta(cfb26Playbook);
  const { data, isLoading, error } = useQuery({
    queryKey: filmLoggerQueryKeys.playSheetOverview(sheetId),
    queryFn: () => fetchPlaySheetOverview(sheetId),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-sans text-sm font-semibold text-white">{sheetName}</p>
          {catalogMeta ? (
            <CallSheetMetadataRow
              labels={callSheetDetailsMetadataLabels(catalogMeta, schemeStyle, cfb26Playbook)}
              className="mt-1 font-body text-xs text-slate-500"
            />
          ) : (
            <p className="mt-1 truncate font-body text-xs text-slate-500">Built from {cfb26Playbook} playbook</p>
          )}
        </div>
        <Link
          href={playbookEditorHref(sheetId, { from: returnTo })}
          className={`${appShellHeaderActionButtonClass} shrink-0 self-start`}
        >
          {SCHEME_DETAIL_EDIT_SHEET}
        </Link>
      </div>

      {isLoading ? (
        <p className="font-body text-sm text-slate-500" role="status">
          {SCHEME_DETAIL_LOADING_SHEET}
        </p>
      ) : null}
      {error ? (
        <p className="font-sans text-sm text-red-200" role="alert">
          {COULDNT_LOAD}
        </p>
      ) : null}
      {!isLoading && !error ? <CallSheetCoachView key={sheetId} scenarios={data?.scenarios ?? []} /> : null}
    </div>
  );
}

export function SchemeDetailView({ schemeId }: { schemeId: string }) {
  const { data: scheme, isLoading, error } = useQuery({
    queryKey: schemeDetailQueryKey(schemeId),
    queryFn: () => fetchSchemeDetail(schemeId),
    enabled: Boolean(schemeId),
  });

  const availableSides = useMemo(() => (scheme ? schemeAvailableSides(scheme) : []), [scheme]);
  const [activeSide, setActiveSide] = useState<CatalogSideOfBall>("offense");

  useEffect(() => {
    if (!scheme) return;
    setActiveSide(defaultSide(scheme));
  }, [scheme]);

  const activeEntry = scheme ? schemeEntryForSide(scheme, activeSide) : null;
  const title = isLoading ? "Scheme" : scheme?.name ?? "Scheme";

  if (error) {
    return (
      <div className={appShellWorkspaceInnerClass}>
        <AppShellMenuHeader title="Scheme" />
        <p className="mt-6 font-sans text-sm text-red-200" role="alert">
          {COULDNT_LOAD}
        </p>
      </div>
    );
  }

  if (isLoading || !scheme) {
    return (
      <div className={appShellWorkspaceInnerClass}>
        <AppShellMenuHeader title={title} />
        <p className="mt-6 font-body text-sm text-slate-500">Loading scheme…</p>
      </div>
    );
  }

  return (
    <div className={`${appShellWorkspaceInnerClass} space-y-6`}>
      <AppShellMenuHeader
        title={title}
        className="md:items-start md:justify-between md:gap-6"
        titleClassName="md:text-[2rem] md:leading-none md:tracking-tight"
        trailing={
          <Link
            href={`/schemes/${schemeId}/edit`}
            className={`${appShellHeaderActionButtonClass} shrink-0 self-start`}
          >
            {SCHEME_DETAIL_EDIT_SCHEME}
          </Link>
        }
      />

      {scheme.description ? (
        <p className="font-body text-sm text-slate-400">{scheme.description}</p>
      ) : null}
      {scheme.note ? (
        <p className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 font-body text-sm text-slate-300">
          {scheme.note}
        </p>
      ) : null}

      {availableSides.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
          <p className="font-body text-sm text-slate-500">{SCHEME_DETAIL_NO_SHEETS}</p>
          <Link
            href={`/schemes/${schemeId}/edit`}
            className={`${appShellHeaderActionButtonClass} mt-4 inline-flex`}
          >
            {SCHEME_DETAIL_EDIT_SCHEME}
          </Link>
        </div>
      ) : (
        <>
          <SchemeSideToggle
            value={activeSide}
            onChange={setActiveSide}
            availableSides={availableSides}
          />

          {activeEntry ? (
            <SchemeActiveSheetPanel
              sheetId={activeEntry.call_sheet_id}
              sheetName={activeEntry.call_sheet.name}
              cfb26Playbook={activeEntry.call_sheet.cfb26_playbook}
              schemeStyle={activeEntry.call_sheet.scheme}
              returnTo={`/schemes/${schemeId}`}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
