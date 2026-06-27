"use client";

import { CallSheetViewerHome } from "@/components/playbook/CallSheetViewerHome";
import { CallSheetMenuButton, CallSheetViewerMenu } from "@/components/playbook/CallSheetViewerMenu";
import { CallSheetViewerSituation } from "@/components/playbook/CallSheetViewerSituation";
import { PlaybookEditorSkeleton } from "@/components/shared/AppSkeleton";
import { Button } from "@/components/ui/button";
import {
  CALL_SHEET_VIEWER_EMPTY_BODY,
  CALL_SHEET_VIEWER_EMPTY_CTA,
  CALL_SHEET_VIEWER_EMPTY_HEADLINE,
  COULDNT_LOAD,
} from "@/lib/coachCopy";
import { appShellPrimaryCtaButtonClass } from "@/lib/constants/designTokens";
import { PLAY_SHEET_VIEWER_PATH } from "@/lib/navigation/playSheetNav";
import { isCallSheetPlaySheet, sortSheetScenariosByCanonicalOrder } from "@/lib/playbookUtils";
import type { PlaybookListResponse, SheetScenarioBlock } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type SheetPayload = {
  id: string;
  name: string;
  playbook: string;
  cfb26_playbook?: string | null;
  scenarios: SheetScenarioBlock[];
};

const SHEET_STALE_MS = 5 * 60 * 1000;

function coercePlaybookListResponse(payload: unknown): PlaybookListResponse {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const o = payload as Record<string, unknown>;
    const playbooks = Array.isArray(o.playbooks) ? o.playbooks : [];
    return {
      playbooks,
      active_call_sheet_id: typeof o.active_call_sheet_id === "string" ? o.active_call_sheet_id : null,
    };
  }
  return { playbooks: [], active_call_sheet_id: null };
}

export function CallSheetViewer() {
  const searchParams = useSearchParams();
  const situationParam = searchParams.get("situation")?.trim() ?? "";
  const [menuOpen, setMenuOpen] = useState(false);

  const listQuery = useQuery({
    queryKey: ["playbooks", "list"],
    queryFn: async () => {
      const res = await fetch("/api/playbook");
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Failed to load play sheets");
      return coercePlaybookListResponse(j);
    },
    retry: 2,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const activeSheetId = listQuery.data?.active_call_sheet_id ?? null;
  const sheets = listQuery.data?.playbooks ?? [];

  const sheetQuery = useQuery({
    queryKey: ["playbook", activeSheetId],
    queryFn: async () => {
      const res = await fetch(`/api/playbook/${activeSheetId}`);
      const j = (await res.json()) as SheetPayload & { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Failed to load call sheet");
      return j;
    },
    enabled: Boolean(activeSheetId),
    retry: 2,
    staleTime: SHEET_STALE_MS,
  });

  const sheet = sheetQuery.data;
  const scenarios = useMemo(
    () => sortSheetScenariosByCanonicalOrder(sheet?.scenarios ?? []),
    [sheet?.scenarios],
  );
  const callSheetSheet = useMemo(() => isCallSheetPlaySheet(scenarios), [scenarios]);

  const activeScenario = useMemo(() => {
    if (situationParam && scenarios.some((s) => s.scenario === situationParam)) {
      return situationParam;
    }
    return scenarios[0]?.scenario ?? "";
  }, [situationParam, scenarios]);

  const showSituationScreen = Boolean(situationParam && callSheetSheet);

  if (listQuery.isError || sheetQuery.isError) {
    return (
      <div className="space-y-4">
        <EmptyMenuButton onOpenMenu={() => setMenuOpen(true)} />
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-3" role="alert">
          <p className="font-sans text-sm text-red-200">{COULDNT_LOAD}</p>
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={listQuery.isFetching || sheetQuery.isFetching}
            onClick={() => {
              void listQuery.refetch();
              void sheetQuery.refetch();
            }}
          >
            {listQuery.isFetching || sheetQuery.isFetching ? "Hang on…" : "Try again"}
          </Button>
        </div>
        <CallSheetViewerMenu open={menuOpen} onOpenChange={setMenuOpen} />
      </div>
    );
  }

  if (listQuery.isLoading || (activeSheetId && sheetQuery.isLoading)) {
    return (
      <div className="space-y-4">
        <EmptyMenuButton onOpenMenu={() => setMenuOpen(true)} />
        <PlaybookEditorSkeleton />
        <CallSheetViewerMenu open={menuOpen} onOpenChange={setMenuOpen} />
      </div>
    );
  }

  if (!activeSheetId || !sheet) {
    return (
      <div className="space-y-6">
        <EmptyMenuButton onOpenMenu={() => setMenuOpen(true)} />
        <div className="flex min-h-[50dvh] flex-col items-center justify-center px-2 py-10 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-500" aria-hidden>
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 12h6M9 16h6" />
            </svg>
          </div>
          <p className="font-sans text-base font-medium text-white">{CALL_SHEET_VIEWER_EMPTY_HEADLINE}</p>
          <p className="mt-2 max-w-sm font-sans text-sm text-slate-500">{CALL_SHEET_VIEWER_EMPTY_BODY}</p>
          <Button asChild className={`${appShellPrimaryCtaButtonClass} mt-6 max-w-sm`}>
            <Link href="/playbook">{CALL_SHEET_VIEWER_EMPTY_CTA}</Link>
          </Button>
        </div>
        <CallSheetViewerMenu open={menuOpen} onOpenChange={setMenuOpen} />
      </div>
    );
  }

  if (showSituationScreen) {
    return (
      <CallSheetViewerSituation
        backHref={PLAY_SHEET_VIEWER_PATH}
        activeScenario={activeScenario}
        scenarios={scenarios}
      />
    );
  }

  return (
    <CallSheetViewerHome
      sheetName={sheet.name}
      sheets={sheets}
      activeSheetId={activeSheetId}
      scenarios={scenarios}
    />
  );
}

function EmptyMenuButton({ onOpenMenu }: { onOpenMenu: () => void }) {
  return <CallSheetMenuButton onClick={onOpenMenu} />;
}
