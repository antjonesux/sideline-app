"use client";

import { ReconsiderPlays } from "@/components/tendencies/ReconsiderPlays";
import { TendenciesFilters, buildTendenciesQueryString, type TendenciesFilterParams } from "@/components/tendencies/TendenciesFilters";
import { TopFormationsList, type TopFormationRow } from "@/components/tendencies/TopFormationsList";
import { TopPlaysList, type TopPlayRow } from "@/components/tendencies/TopPlaysList";
import { WORKING_LIST_PAGE_SIZE } from "@/components/tendencies/WorkingListPagination";
import { TendenciesSectionSkeleton } from "@/components/shared/AppSkeleton";
import { tendenciesQueryKeys } from "@/lib/tendenciesQueryKeys";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

type TopPlaysApi = {
  top_plays: TopPlayRow[];
  total_matching: number;
  reconsider_plays: TopPlayRow[];
  meta: { play_count: number };
};

type TopFormationsApi = { top_formations: TopFormationRow[]; total_matching: number; meta: { play_count: number } };

type Props = {
  opponents: string[];
};

export function WhatsWorking({ opponents }: Props) {
  const [filters, setFilters] = useState<TendenciesFilterParams>({ pill: "all", opponentTeam: opponents[0] ?? null, minUses: 3 });
  const [playsExpanded, setPlaysExpanded] = useState(false);
  const [playsPage, setPlaysPage] = useState(1);
  const [formationsExpanded, setFormationsExpanded] = useState(false);
  const [formationsPage, setFormationsPage] = useState(1);
  const [reconsiderExpanded, setReconsiderExpanded] = useState(false);
  const [reconsiderPage, setReconsiderPage] = useState(1);

  const qs = useMemo(() => {
    const raw = buildTendenciesQueryString(filters);
    const sp = new URLSearchParams(raw);
    sp.delete("min_uses");
    return sp.toString();
  }, [filters]);
  const qsPlays = useMemo(() => {
    const sp = new URLSearchParams(qs);
    if (playsExpanded) sp.set("expand", "1");
    return sp.toString();
  }, [qs, playsExpanded]);
  const qsFormations = useMemo(() => {
    const sp = new URLSearchParams(qs);
    if (formationsExpanded) sp.set("expand", "1");
    return sp.toString();
  }, [qs, formationsExpanded]);

  useEffect(() => {
    setPlaysPage(1);
    setFormationsPage(1);
    setReconsiderPage(1);
  }, [qs]);

  const playsKey = `${qsPlays}`;
  const formationsKey = `${qsFormations}`;

  const playsQuery = useQuery({
    queryKey: tendenciesQueryKeys.topPlays(playsKey),
    queryFn: async () => {
      const res = await fetch(`/api/tendencies/top-plays?${playsKey}`);
      if (!res.ok) throw new Error("top plays");
      return res.json() as Promise<TopPlaysApi>;
    },
    staleTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const formationsQuery = useQuery({
    queryKey: tendenciesQueryKeys.topFormations(formationsKey),
    queryFn: async () => {
      const res = await fetch(`/api/tendencies/top-formations?${formationsKey}`);
      if (!res.ok) throw new Error("top formations");
      return res.json() as Promise<TopFormationsApi>;
    },
    staleTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const playsListRaw = playsQuery.data?.top_plays;
  const playsRows = useMemo(() => {
    const list = playsListRaw ?? [];
    if (!playsExpanded) return list;
    const start = (playsPage - 1) * WORKING_LIST_PAGE_SIZE;
    return list.slice(start, start + WORKING_LIST_PAGE_SIZE);
  }, [playsListRaw, playsExpanded, playsPage]);

  const playsRankOffset = playsExpanded ? (playsPage - 1) * WORKING_LIST_PAGE_SIZE : 0;

  const formationsListRaw = formationsQuery.data?.top_formations;
  const formationsRows = useMemo(() => {
    const list = formationsListRaw ?? [];
    if (!formationsExpanded) return list;
    const start = (formationsPage - 1) * WORKING_LIST_PAGE_SIZE;
    return list.slice(start, start + WORKING_LIST_PAGE_SIZE);
  }, [formationsListRaw, formationsExpanded, formationsPage]);

  const formationsRankOffset = formationsExpanded ? (formationsPage - 1) * WORKING_LIST_PAGE_SIZE : 0;

  const reconsiderListRaw = playsQuery.data?.reconsider_plays;
  const reconsiderRows = useMemo(() => {
    const list = reconsiderListRaw ?? [];
    if (!reconsiderExpanded) return list.slice(0, 3);
    const start = (reconsiderPage - 1) * WORKING_LIST_PAGE_SIZE;
    return list.slice(start, start + WORKING_LIST_PAGE_SIZE);
  }, [reconsiderListRaw, reconsiderExpanded, reconsiderPage]);

  const reconsiderRankOffset = reconsiderExpanded ? (reconsiderPage - 1) * WORKING_LIST_PAGE_SIZE : 0;

  return (
    <div className="space-y-8">
      <TendenciesFilters value={filters} onChange={setFilters} opponents={opponents} showMinUsesLine={false} />

      <section className="space-y-3">
        <h2 className="app-section-title">Top plays</h2>
        {playsQuery.isLoading ? <TendenciesSectionSkeleton /> : null}
        {playsQuery.data && playsQuery.data.meta.play_count === 0 ? (
          <div className="app-card app-card-pad text-center">
            <p className="font-body text-sm text-slate-300">No plays logged for this filter yet.</p>
            <p className="mt-1 font-body text-sm text-slate-500">Log plays in Film to see top calls and formations here.</p>
          </div>
        ) : null}
        {playsQuery.data && playsQuery.data.meta.play_count > 0 ? (
          <TopPlaysList
            rows={playsRows}
            totalMatching={playsQuery.data.total_matching}
            expanded={playsExpanded}
            onToggleExpand={() => {
              setPlaysExpanded((prev) => {
                if (prev) setPlaysPage(1);
                return !prev;
              });
            }}
            rankOffset={playsRankOffset}
            page={playsPage}
            onPageChange={setPlaysPage}
          />
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="app-section-title">Top formations</h2>
        {formationsQuery.isLoading ? <TendenciesSectionSkeleton /> : null}
        {formationsQuery.data?.top_formations?.length ? (
          <TopFormationsList
            rows={formationsRows}
            totalCount={formationsQuery.data.total_matching}
            expanded={formationsExpanded}
            onToggleExpand={() => {
              setFormationsExpanded((prev) => {
                if (prev) setFormationsPage(1);
                return !prev;
              });
            }}
            rankOffset={formationsRankOffset}
            page={formationsPage}
            onPageChange={setFormationsPage}
          />
        ) : null}
      </section>

      {playsQuery.data?.reconsider_plays?.length ? (
        <section className="space-y-3">
          <h2 className="app-section-title">Plays to reconsider</h2>
          <ReconsiderPlays
            rows={reconsiderRows}
            totalCount={playsQuery.data.reconsider_plays.length}
            expanded={reconsiderExpanded}
            onToggleExpand={() => {
              setReconsiderExpanded((prev) => {
                if (prev) setReconsiderPage(1);
                return !prev;
              });
            }}
            rankOffset={reconsiderRankOffset}
            page={reconsiderPage}
            onPageChange={setReconsiderPage}
          />
        </section>
      ) : null}
    </div>
  );
}
