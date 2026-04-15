"use client";

import { FormationFrequency } from "@/components/tendencies/FormationFrequency";
import { MotionUsage } from "@/components/tendencies/MotionUsage";
import { PlayTypeDistribution } from "@/components/tendencies/PlayTypeDistribution";
import { SituationTendencies } from "@/components/tendencies/SituationTendencies";
import { TendenciesFilters, buildTendenciesQueryString, type TendenciesFilterParams } from "@/components/tendencies/TendenciesFilters";
import { TendenciesSectionSkeleton } from "@/components/shared/AppSkeleton";
import { tendenciesQueryKeys } from "@/lib/tendenciesQueryKeys";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

type PredictApi = {
  play_type_distribution: { name: string; pct: number; count: number }[];
  situation_tendencies: { scenario: string; run_pct: number; total_plays: number; warn: boolean }[];
  formation_frequency: { formation: string; count: number; pct: number }[];
  motion: { user_pct: number; playbook_pct: number; playbook_name: string; underutilizing: boolean };
  meta: { play_count: number };
};

type Props = {
  opponents: string[];
};

export function AmIPredictable({ opponents }: Props) {
  const [filters, setFilters] = useState<TendenciesFilterParams>({ pill: "all", opponentTeam: opponents[0] ?? null, minUses: 3 });
  const qs = useMemo(() => buildTendenciesQueryString(filters), [filters]);

  const q = useQuery({
    queryKey: tendenciesQueryKeys.predictability(qs),
    queryFn: async () => {
      const res = await fetch(`/api/tendencies/predictability?${qs}`);
      if (!res.ok) throw new Error("predictability");
      return res.json() as Promise<PredictApi>;
    },
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="space-y-8">
      <TendenciesFilters value={filters} onChange={setFilters} opponents={opponents} showMinUsesLine={false} />

      {q.isLoading ? (
        <div className="space-y-6" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <section key={i} className="space-y-3">
              <div className="app-skeleton h-6 w-56 max-w-full" />
              <TendenciesSectionSkeleton />
            </section>
          ))}
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="app-section-title">Play type distribution</h2>
            {q.data ? <PlayTypeDistribution data={q.data.play_type_distribution} /> : null}
          </section>

          <section className="space-y-3">
            <h2 className="app-section-title">Situation tendencies</h2>
            {q.data ? <SituationTendencies rows={q.data.situation_tendencies} /> : null}
          </section>

          <section className="space-y-3">
            <h2 className="app-section-title">Formation frequency</h2>
            {q.data ? <FormationFrequency rows={q.data.formation_frequency} /> : null}
          </section>

          <section className="space-y-3">
            <h2 className="app-section-title">Motion</h2>
            {q.data ? (
              <MotionUsage
                userPct={q.data.motion.user_pct}
                playbookPct={q.data.motion.playbook_pct}
                playbookName={q.data.motion.playbook_name}
                underutilizing={q.data.motion.underutilizing}
              />
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
