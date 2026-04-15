"use client";

import type { PlaybookSummary } from "@/lib/types";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FilmRoomSkeleton } from "@/components/shared/PageSkeleton";
import { PlaybookCard } from "./PlaybookCard";

export function PlaybookHome() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["playbooks", "list"],
    queryFn: async () => {
      const res = await fetch("/api/playbook");
      const j = (await res.json()) as { playbooks?: PlaybookSummary[]; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Failed to load playbooks");
      return j.playbooks ?? [];
    },
  });

  if (error) {
    return (
      <p className="rounded-lg border border-red-900/40 bg-red-950/30 p-3 font-body text-sm text-red-200" role="alert">
        {(error as Error).message}
      </p>
    );
  }

  const list = data ?? [];

  if (isLoading) {
    return <FilmRoomSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="app-page-title">Playbook</h1>
        <Link href="/playbook/new" className="btn-primary text-sm">
          + Create playbook
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="app-card app-card-pad flex min-h-[320px] flex-col items-center justify-center py-10 text-center sm:px-8">
          <p className="font-body text-base font-medium text-white">Build your playbook.</p>
          <p className="mt-2 font-body text-sm text-slate-500">
            Create a play sheet from any CFB26 playbook - your tendencies will show you what&apos;s working.
          </p>
          <Link href="/playbook/new" className="btn-primary mt-6 inline-flex px-5 py-2.5 text-sm">
            + Create Playbook
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((item) => (
            <li key={item.id}>
              <PlaybookCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
