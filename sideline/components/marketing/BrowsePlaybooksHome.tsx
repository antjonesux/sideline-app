"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Search, X } from "lucide-react";
import { PublicPlaybookHomeSkeleton } from "@/components/marketing/PublicPlaybookHomeSkeleton";
import { PublicPlaybookSection } from "@/components/marketing/PublicPlaybookSection";
import { Button } from "@/components/ui/button";
import { COULDNT_LOAD } from "@/lib/coachCopy";
import { appShellFormInputClass } from "@/lib/constants/designTokens";
import type { PublicPlaybookListData } from "@/lib/publicPlaybooksServer";
import { cn } from "@/lib/utils";

async function fetchPublicPlaybooks(): Promise<PublicPlaybookListData> {
  const res = await fetch("/api/public/playbooks");
  const json = (await res.json()) as { data?: PublicPlaybookListData; error?: string };
  if (!res.ok || !json.data) throw new Error(json.error ?? COULDNT_LOAD);
  return json.data;
}

function filterNames(names: string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return names;
  return names.filter((name) => name.toLowerCase().includes(q));
}

export function BrowsePlaybooksHome() {
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const query = useQuery({
    queryKey: ["public", "playbooks"],
    queryFn: fetchPublicPlaybooks,
    staleTime: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    const data = query.data;
    if (!data) {
      return {
        offensiveTeamPlaybooks: [] as string[],
        alternativeOffensivePlaybooks: [] as string[],
        defensivePlaybooks: [] as string[],
      };
    }
    return {
      offensiveTeamPlaybooks: filterNames(data.offensiveTeamPlaybooks, search),
      alternativeOffensivePlaybooks: filterNames(data.alternativeOffensivePlaybooks, search),
      defensivePlaybooks: filterNames(data.defensivePlaybooks, search),
    };
  }, [query.data, search]);

  const hasAnyMatch =
    filtered.offensiveTeamPlaybooks.length > 0 ||
    filtered.alternativeOffensivePlaybooks.length > 0 ||
    filtered.defensivePlaybooks.length > 0;

  return (
    <div className="flex h-dvh flex-col pt-24">
      {/* Pinned below marketing nav — outside the scroll pane, so no opaque bg needed. */}
      <div className="shrink-0 border-b border-slate-800/80">
        <div className="mx-auto w-full max-w-6xl pb-4 pt-2">
          <nav className="font-mono text-xs uppercase tracking-wide text-slate-500" aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/landing" className="transition-colors hover:text-slate-300">
                  Home
                </Link>
              </li>
              <li aria-hidden>
                <ChevronRight className="h-3 w-3 shrink-0 text-slate-600" />
              </li>
              <li className="text-slate-400">Playbooks</li>
            </ol>
          </nav>

          <header className="mt-4">
            <h1 className="font-heading text-2xl font-extrabold uppercase tracking-[0.08em] text-white sm:text-3xl">
              Playbooks
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
              Every playbook in EA SPORTS College Football 27. Explore formations and plays.
            </p>
          </header>

          <div className="relative mt-4 max-w-2xl">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              aria-hidden
            />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search playbooks by name"
              aria-label="Search playbooks by name"
              autoComplete="off"
              enterKeyHint="search"
              className={cn(appShellFormInputClass, "ps-10", search.length > 0 ? "pe-10" : "")}
            />
            {search.length > 0 ? (
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 transition-colors hover:text-slate-300"
                aria-label="Clear search"
                onClick={() => {
                  setSearch("");
                  searchInputRef.current?.focus();
                }}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-6xl pb-16 pt-8">
          {query.isPending ? <PublicPlaybookHomeSkeleton /> : null}

          {query.isError ? (
            <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-6 text-center" role="alert">
              <p className="font-body text-sm text-slate-300">{COULDNT_LOAD}</p>
              <Button type="button" variant="outline" className="mt-4" onClick={() => void query.refetch()}>
                Try again
              </Button>
            </div>
          ) : null}

          {query.isSuccess && !hasAnyMatch ? (
            <p className="font-body text-sm text-slate-400" role="status">
              No playbooks match your search.
            </p>
          ) : null}

          {query.isSuccess && hasAnyMatch ? (
            <>
              <PublicPlaybookSection
                title="Offensive Team Playbooks"
                playbooks={filtered.offensiveTeamPlaybooks}
                side="offense"
              />
              <PublicPlaybookSection
                title="Alternative Offensive Playbooks"
                playbooks={filtered.alternativeOffensivePlaybooks}
                side="offense"
              />
              <PublicPlaybookSection
                title="Defensive Playbooks"
                playbooks={filtered.defensivePlaybooks}
                side="defense"
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
