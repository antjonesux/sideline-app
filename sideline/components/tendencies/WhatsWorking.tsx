"use client";

import { ReconsiderPlays } from "@/components/tendencies/ReconsiderPlays";
import { TendenciesFilters, buildTendenciesQueryString, type TendenciesFilterParams } from "@/components/tendencies/TendenciesFilters";
import { TopFormationsList, type TopFormationRow } from "@/components/tendencies/TopFormationsList";
import { TopPlaysList, type TopPlayRow } from "@/components/tendencies/TopPlaysList";
import { TendenciesSectionSkeleton } from "@/components/shared/AppSkeleton";
import { tendenciesQueryKeys } from "@/lib/tendenciesQueryKeys";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

type TopPlaysApi = {
  top_plays: TopPlayRow[];
  total_matching: number;
  reconsider_plays: TopPlayRow[];
  meta: { play_count: number };
};

type TopFormationsApi = { top_formations: TopFormationRow[]; meta: { play_count: number } };

type Props = {
  opponents: string[];
};

export function WhatsWorking({ opponents }: Props) {
  const [filters, setFilters] = useState<TendenciesFilterParams>({ pill: "all", opponentTeam: opponents[0] ?? null, minUses: 3 });
  const [playsExpanded, setPlaysExpanded] = useState(false);

  const qs = useMemo(() => buildTendenciesQueryString(filters), [filters]);
  const qsPlays = useMemo(() => {
    const sp = new URLSearchParams(qs);
    if (playsExpanded) sp.set("expand", "1");
    return sp.toString();
  }, [qs, playsExpanded]);

  const playsKey = `${qsPlays}`;
  const formationsKey = `${qs}`;

  const playsQuery = useQuery({
    queryKey: tendenciesQueryKeys.topPlays(playsKey),
    queryFn: async () => {
      const res = await fetch(`/api/tendencies/top-plays?${playsKey}`);
      if (!res.ok) throw new Error("top plays");
      return res.json() as Promise<TopPlaysApi>;
    },
    staleTime: 10 * 60 * 1000,
  });

  const formationsQuery = useQuery({
    queryKey: tendenciesQueryKeys.topFormations(formationsKey),
    queryFn: async () => {
      const res = await fetch(`/api/tendencies/top-formations?${formationsKey}`);
      if (!res.ok) throw new Error("top formations");
      return res.json() as Promise<TopFormationsApi>;
    },
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="space-y-8">
      <TendenciesFilters value={filters} onChange={setFilters} opponents={opponents} />

      <section className="space-y-3">
        <h2 className="app-section-title">Top plays</h2>
        {playsQuery.isLoading ? <TendenciesSectionSkeleton /> : null}
        {playsQuery.data && playsQuery.data.meta.play_count === 0 ? (
          <p className="font-barlow text-sm text-slate-500">No plays in this filter.</p>
        ) : null}
        {playsQuery.data && playsQuery.data.meta.play_count > 0 ? (
          <TopPlaysList
            rows={playsQuery.data.top_plays}
            totalMatching={playsQuery.data.total_matching}
            expanded={playsExpanded}
            onToggleExpand={() => setPlaysExpanded((e) => !e)}
          />
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="app-section-title">Top formations</h2>
        {formationsQuery.isLoading ? <TendenciesSectionSkeleton /> : null}
        {formationsQuery.data?.top_formations?.length ? <TopFormationsList rows={formationsQuery.data.top_formations} /> : null}
      </section>

      {playsQuery.data?.reconsider_plays?.length ? (
        <section className="space-y-3">
          <h2 className="app-section-title">Plays to reconsider</h2>
          <ReconsiderPlays rows={playsQuery.data.reconsider_plays} />
        </section>
      ) : null}
    </div>
  );
}
