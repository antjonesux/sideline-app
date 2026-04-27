"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { deriveFieldZone, deriveScenario } from "@/lib/derivePlayContext";
import { fromAbsoluteYard } from "@/lib/fieldPosition";
import type { LoggedPlay } from "@/lib/types";
import { endCriticalFlow } from "@/lib/perfInstrumentation";
import { buildSituationAwareCallingSuggestions } from "@/lib/filmLoggerCallingSuggestions";
import { fetchCfb26PlaybookEntries, fetchPlaySheetScenarioCalls } from "@/lib/filmLoggerCatalogFetch";
import { filmLoggerQueryKeys } from "@/lib/filmLoggerQueryKeys";

type Args = {
  down: number;
  distance: number;
  fieldPos: number;
  playbook: string;
  /** Logged coach calls for this game (all drives) — avoids refetching drives inside the hook. */
  allGameCoachCalls: LoggedPlay[];
  /** When the caller already knows the sheet, pass its ID to skip the lookup. */
  sheetId?: string | null;
  /** Optional in-flight logger-open flow id started by the parent. */
  loggerOpenFlowId?: string | null;
};

const CATALOG_STALE_MS = 5 * 60 * 1000;
const CATALOG_GC_MS = 45 * 60 * 1000;
const SHEET_STALE_MS = 2 * 60 * 1000;
const SHEET_GC_MS = 20 * 60 * 1000;

export function usePlaySuggestions({
  down,
  distance,
  fieldPos,
  playbook,
  allGameCoachCalls,
  sheetId,
  loggerOpenFlowId,
}: Args) {
  const scenarioLabel = useMemo(() => {
    const { side, yard_line } = fromAbsoluteYard(fieldPos);
    const fieldZone = deriveFieldZone(yard_line, side);
    return deriveScenario(down, distance, fieldZone);
  }, [down, distance, fieldPos]);

  const situationKey = `${down}:${distance}:${fieldPos}`;

  const catalogQuery = useQuery({
    queryKey: filmLoggerQueryKeys.cfb26Catalog(playbook),
    queryFn: () => fetchCfb26PlaybookEntries(playbook),
    enabled: Boolean(playbook.trim()),
    staleTime: CATALOG_STALE_MS,
    gcTime: CATALOG_GC_MS,
  });

  const sheetQuery = useQuery({
    queryKey: filmLoggerQueryKeys.sheetScenario(sheetId ?? "", scenarioLabel),
    queryFn: () => fetchPlaySheetScenarioCalls(sheetId as string, scenarioLabel),
    enabled: Boolean(sheetId?.trim() && scenarioLabel),
    staleTime: SHEET_STALE_MS,
    gcTime: SHEET_GC_MS,
  });

  const playbookEntries = catalogQuery.data ?? [];
  const sheetCalls = sheetQuery.data?.sheetCalls ?? [];
  const sheetName = sheetQuery.data?.sheetName ?? null;

  const suggestions = useMemo(
    () =>
      buildSituationAwareCallingSuggestions(
        playbookEntries,
        allGameCoachCalls,
        scenarioLabel,
        down,
        distance,
        fieldPos,
        6,
      ),
    [playbookEntries, allGameCoachCalls, scenarioLabel, situationKey, down, distance, fieldPos],
  );

  const loggerFlowCompletionRef = useRef<{ flowId: string | null; done: boolean }>({
    flowId: null,
    done: false,
  });

  /** End `film_logger_open_with_sheet` as cancelled when the flow id changes or the hook unmounts before ok/error/skipped. */
  useEffect(() => {
    const id = loggerOpenFlowId;
    if (!id) return;
    return () => {
      const r = loggerFlowCompletionRef.current;
      if (r.flowId === id && !r.done) {
        void endCriticalFlow(id, "cancelled", { reason: "logger_flow_unmount_or_id_change" });
      }
    };
  }, [loggerOpenFlowId]);

  useEffect(() => {
    if (!loggerOpenFlowId) return;
    if (loggerFlowCompletionRef.current.flowId !== loggerOpenFlowId) {
      loggerFlowCompletionRef.current = { flowId: loggerOpenFlowId, done: false };
    }
    if (loggerFlowCompletionRef.current.done) return;

    if (!playbook.trim()) {
      endCriticalFlow(loggerOpenFlowId, "skipped", { reason: "no_playbook" });
      loggerFlowCompletionRef.current.done = true;
      return;
    }

    if (catalogQuery.isPending) return;

    if (catalogQuery.isError) {
      endCriticalFlow(loggerOpenFlowId, "error", {
        reason: "catalog_fetch_failed",
        message: catalogQuery.error instanceof Error ? catalogQuery.error.message : "unknown",
      });
      loggerFlowCompletionRef.current.done = true;
      return;
    }

    if (sheetId?.trim()) {
      if (sheetQuery.isPending) return;
      if (sheetQuery.isError) {
        endCriticalFlow(loggerOpenFlowId, "error", {
          reason: "sheet_fetch_failed",
          message: sheetQuery.error instanceof Error ? sheetQuery.error.message : "unknown",
          scenario: scenarioLabel,
        });
        loggerFlowCompletionRef.current.done = true;
        return;
      }
      endCriticalFlow(loggerOpenFlowId, "ok", {
        scenario: scenarioLabel,
        sheetCalls: sheetCalls.length,
        catalogRows: playbookEntries.length,
      });
      loggerFlowCompletionRef.current.done = true;
      return;
    }

    endCriticalFlow(loggerOpenFlowId, "ok", {
      scenario: scenarioLabel,
      sheetCalls: 0,
      catalogRows: playbookEntries.length,
      reason: "no_sheet_id",
    });
    loggerFlowCompletionRef.current.done = true;
  }, [
    loggerOpenFlowId,
    playbook,
    catalogQuery.isPending,
    catalogQuery.isError,
    catalogQuery.error,
    sheetId,
    sheetQuery.isPending,
    sheetQuery.isError,
    sheetQuery.error,
    scenarioLabel,
    sheetCalls.length,
    playbookEntries.length,
  ]);

  return { suggestions, sheetCalls, sheetName, scenarioLabel };
}
