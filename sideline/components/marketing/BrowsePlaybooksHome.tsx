"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { PublicPlaybookHomeSkeleton } from "@/components/marketing/PublicPlaybookHomeSkeleton";
import { PublicPlaybookSection } from "@/components/marketing/PublicPlaybookSection";
import { PublicPlaybookSearchInput } from "@/components/marketing/PublicPlaybookSearchInput";
import { PublicGlobalSearchResults } from "@/components/marketing/PublicPlaybookSearchResults";
import { PublicPlaybooksBreadcrumb, publicPlaybooksBreadcrumbTrail } from "@/components/marketing/PublicPlaybooksBreadcrumb";
import { PublicPlaybooksBrowseFrame } from "@/components/marketing/PublicPlaybooksBrowseFrame";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { useDebounced } from "@/hooks/useDebounced";
import { COULDNT_LOAD } from "@/lib/coachCopy";
import type { PublicGlobalSearchData, PublicPlaybookListData } from "@/lib/publicPlaybooksServer";

const SEARCH_MIN_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 300;

async function fetchPublicPlaybooks(): Promise<PublicPlaybookListData> {
  const res = await fetch("/api/public/playbooks");
  const json = (await res.json()) as { data?: PublicPlaybookListData; error?: string };
  if (!res.ok || !json.data) throw new Error(json.error ?? COULDNT_LOAD);
  return json.data;
}

async function fetchPublicGlobalSearch(q: string): Promise<PublicGlobalSearchData> {
  const res = await fetch(`/api/public/search?q=${encodeURIComponent(q)}`);
  const json = (await res.json()) as { data?: PublicGlobalSearchData; error?: string };
  if (!res.ok || !json.data) throw new Error(json.error ?? COULDNT_LOAD);
  return json.data;
}

export function BrowsePlaybooksHome() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, SEARCH_DEBOUNCE_MS);
  const trimmedDebounced = debouncedSearch.trim();
  const searchActive = trimmedDebounced.length >= SEARCH_MIN_LENGTH;
  const searchPending = search.trim() !== trimmedDebounced;

  const listQuery = useQuery({
    queryKey: ["public", "playbooks"],
    queryFn: fetchPublicPlaybooks,
    staleTime: 5 * 60 * 1000,
    enabled: !searchActive,
  });

  const searchQuery = useQuery({
    queryKey: ["public", "search", trimmedDebounced.toLowerCase()],
    queryFn: () => fetchPublicGlobalSearch(trimmedDebounced),
    enabled: searchActive,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });

  const browseLoading = !searchActive && listQuery.isPending;
  const searchLoading = searchActive && (searchPending || searchQuery.isFetching);
  const showSearchError = searchActive && searchQuery.isError;
  const showListError = !searchActive && listQuery.isError;

  const listData = listQuery.data;

  return (
    <PublicPlaybooksBrowseFrame
      breadcrumb={
        <PublicPlaybooksBreadcrumb items={publicPlaybooksBreadcrumbTrail(Boolean(user), [])} />
      }
      pinnedHeaderExtra={
        <>
          <header className={user ? undefined : "mt-4"}>
            <h1 className="font-heading text-2xl font-extrabold uppercase tracking-[0.08em] text-white sm:text-3xl">
              Playbooks
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
              Every playbook in EA SPORTS College Football 27. Explore formations and plays.
            </p>
          </header>

          <PublicPlaybookSearchInput
            className="mt-4"
            value={search}
            onChange={setSearch}
            placeholder="Search playbooks, formations, and plays"
            ariaLabel="Search playbooks, formations, and plays"
            loading={searchLoading}
          />
        </>
      }
    >
      {browseLoading ? <PublicPlaybookHomeSkeleton /> : null}

      {showListError ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-6 text-center" role="alert">
          <p className="font-body text-sm text-slate-300">{COULDNT_LOAD}</p>
          <Button type="button" variant="outline" className="mt-4" onClick={() => void listQuery.refetch()}>
            Try again
          </Button>
        </div>
      ) : null}

      {showSearchError ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-6 text-center" role="alert">
          <p className="font-body text-sm text-slate-300">Search failed. Try again.</p>
          <Button type="button" variant="outline" className="mt-4" onClick={() => void searchQuery.refetch()}>
            Try again
          </Button>
        </div>
      ) : null}

      {searchActive && searchQuery.isSuccess && searchQuery.data ? (
        <PublicGlobalSearchResults query={trimmedDebounced} data={searchQuery.data} />
      ) : null}

      {!searchActive && listQuery.isSuccess && listData ? (
        <>
          <PublicPlaybookSection
            title="Offensive Team Playbooks"
            playbooks={listData.offensiveTeamPlaybooks}
            side="offense"
          />
          <PublicPlaybookSection
            title="Alternative Offensive Playbooks"
            playbooks={listData.alternativeOffensivePlaybooks}
            side="offense"
          />
          <PublicPlaybookSection
            title="Defensive Playbooks"
            playbooks={listData.defensivePlaybooks}
            side="defense"
          />
        </>
      ) : null}
    </PublicPlaybooksBrowseFrame>
  );
}
