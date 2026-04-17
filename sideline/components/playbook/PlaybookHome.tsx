"use client";

import type { PlaybookSummary } from "@/lib/types";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FilmRoomSkeleton } from "@/components/shared/PageSkeleton";
import { PlaybookCard } from "./PlaybookCard";

export function PlaybookHome() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["playbooks", "list"],
    queryFn: async () => {
      const res = await fetch("/api/playbook");
      const j = (await res.json()) as { playbooks?: PlaybookSummary[]; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Failed to load play sheets");
      return j.playbooks ?? [];
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  if (error) {
    return (
      <div className="app-card app-card-pad space-y-3" role="alert">
        <p className="font-body text-sm text-red-200">{(error as Error).message}</p>
        <button type="button" className="btn-secondary w-full sm:w-auto" disabled={isFetching} onClick={() => void refetch()}>
          {isFetching ? "Retrying..." : "Try Again"}
        </button>
      </div>
    );
  }

  const list = data ?? [];

  if (isLoading) {
    return <FilmRoomSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="app-page-title">Game Plan</h1>
        <Link href="/playbook/new" className="btn-primary text-sm">
          New Play Sheet
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="app-card app-card-pad flex min-h-[320px] flex-col items-center justify-center py-10 text-center sm:px-8">
          <p className="font-body text-base font-medium text-white">
            Create your first play sheet to start building your game plan.
          </p>
          <p className="mt-2 font-body text-sm text-slate-500">
            Pick a CFB26 playbook as the source — your tendencies will show you what&apos;s working.
          </p>
          <Link href="/playbook/new" className="btn-primary mt-6 inline-flex px-5 py-2.5 text-sm">
            New Play Sheet
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
