"use client";

import type { PlaybookSummary } from "@/lib/types";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FilmRoomSkeleton } from "@/components/shared/PageSkeleton";
import { COULDNT_LOAD } from "@/lib/coachCopy";
import { PlaybookCard } from "./PlaybookCard";

function coercePlaybookList(payload: unknown): PlaybookSummary[] {
  if (Array.isArray(payload)) return payload as PlaybookSummary[];
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    if (Array.isArray(o.playbooks)) return o.playbooks as PlaybookSummary[];
    if (Array.isArray(o.data)) return o.data as PlaybookSummary[];
  }
  return [];
}

export function PlaybookHome() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["playbooks", "list"],
    queryFn: async () => {
      const res = await fetch("/api/playbook");
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Failed to load play sheets");
      return coercePlaybookList(j);
    },
    retry: 2,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  if (error) {
    return (
      <div className="app-card app-card-pad space-y-3" role="alert">
        <p className="font-sans text-sm text-red-200">{COULDNT_LOAD}</p>
        <button type="button" className="btn-secondary w-full sm:w-auto" disabled={isFetching} onClick={() => void refetch()}>
          {isFetching ? "Hang on…" : "Try again"}
        </button>
      </div>
    );
  }

  const list = coercePlaybookList(data);

  if (isLoading) {
    return <FilmRoomSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="app-page-title">Game Plan</h1>
        <Link href="/playbook/new" className="btn-primary text-sm">
          Create play sheet
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="app-card app-card-pad flex min-h-[320px] flex-col items-center justify-center py-10 text-center sm:px-8">
          <p className="font-sans text-base font-medium text-white">Your play sheet is empty.</p>
          <p className="mt-2 font-sans text-sm text-slate-500">
            Start from a CFB26 playbook. What you log in Film Room feeds tendencies here.
          </p>
          <Link href="/playbook/new" className="btn-primary mt-6 inline-flex px-5 py-2.5 text-sm">
            Create play sheet
          </Link>
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
