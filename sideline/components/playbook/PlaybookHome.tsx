"use client";

import type { PlaybookListResponse, PlaybookSummary } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { PlaySheetHomeSkeleton } from "@/components/shared/PageSkeleton";
import { COULDNT_LOAD, GAME_PLAN_EMPTY_BODY, GAME_PLAN_EMPTY_HEADLINE } from "@/lib/coachCopy";
import { PlaybookCard } from "./PlaybookCard";
import { PlaySheetHomeHeader } from "./PlaySheetHomeHeader";
import { Button } from "@/components/ui/button";

function coercePlaybookList(payload: unknown): PlaybookSummary[] {
  if (Array.isArray(payload)) return payload as PlaybookSummary[];
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    if (Array.isArray(o.playbooks)) return o.playbooks as PlaybookSummary[];
    if (Array.isArray(o.data)) return o.data as PlaybookSummary[];
  }
  return [];
}

function coercePlaybookListResponse(payload: unknown): PlaybookListResponse {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const o = payload as Record<string, unknown>;
    return {
      playbooks: coercePlaybookList(o),
      active_call_sheet_id: typeof o.active_call_sheet_id === "string" ? o.active_call_sheet_id : null,
    };
  }
  return { playbooks: coercePlaybookList(payload), active_call_sheet_id: null };
}

export function PlaybookHome() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
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

  const list = data?.playbooks ?? [];

  if (error) {
    return (
      <div className="space-y-6">
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
    <div className="flex min-h-[60vh] flex-col gap-6">
      <PlaySheetHomeHeader />

      {list.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-4 py-10 text-center sm:px-8">
          <p className="font-sans text-base font-medium text-white">{GAME_PLAN_EMPTY_HEADLINE}</p>
          <p className="mt-2 font-sans text-sm text-slate-500">{GAME_PLAN_EMPTY_BODY}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((item) => (
            <li key={item.id} className="relative">
              <PlaybookCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
