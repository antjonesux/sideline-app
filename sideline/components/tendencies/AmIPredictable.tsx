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
  meta: { play_count: number; turnover_count: number; turnover_rate: number };
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

  const unclassified = q.data?.play_type_distribution.find((r) => r.name === "Unclassified");
  const topTypeCards = q.data
    ? (() => {
        const byName = new Map(q.data.play_type_distribution.map((row) => [row.name, row.pct]));
        const run = (byName.get("Run") ?? 0) + (byName.get("Option") ?? 0);
        const pass = (byName.get("Pass") ?? 0) + (byName.get("Play Action") ?? 0) + (byName.get("Screen") ?? 0);
        const rpo = byName.get("RPO") ?? 0;
        const other = byName.get("Other") ?? 0;
        return [
          { name: "Run", pct: Math.round(run * 10) / 10 },
          { name: "Pass", pct: Math.round(pass * 10) / 10 },
          { name: "RPO", pct: Math.round(rpo * 10) / 10 },
          { name: "Other", pct: Math.round(other * 10) / 10 },
        ];
      })()
    : [];

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
            {q.data ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {topTypeCards.map((row) => (
                  <div key={row.name} className="app-card p-3">
                    <p className="app-field-label">{row.name}</p>
                    <p className="mt-1 font-mono text-2xl font-bold text-slate-100">{row.pct}%</p>
                  </div>
                ))}
                {unclassified && unclassified.count > 0 ? (
                  <div className="app-card p-3">
                    <p className="app-field-label">Unclassified</p>
                    <p className="mt-1 font-mono text-2xl font-bold text-slate-100">{unclassified.pct}%</p>
                    <p className="mt-1 font-body text-[11px] text-slate-500">Plays not found in your playbook data.</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="space-y-3">
            <h2 className="app-section-title">Turnover + Motion</h2>
            {q.data ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="app-card p-4">
                  <p className="app-field-label">Turnover Rate</p>
                  <p className="mt-1 font-barlow-condensed text-4xl font-bold leading-none text-slate-100">{q.data.meta.turnover_rate}%</p>
                  <p className="mt-2 font-barlow text-[13px] font-normal leading-[1.35] text-slate-400">
                    {q.data.meta.turnover_count} turnovers in {q.data.meta.play_count} plays
                  </p>
                </div>
                <MotionUsage
                  userPct={q.data.motion.user_pct}
                  playbookPct={q.data.motion.playbook_pct}
                  playbookName={q.data.motion.playbook_name}
                  underutilizing={q.data.motion.underutilizing}
                />
              </div>
            ) : null}
          </section>

          <section className="space-y-3">
            <h2 className="app-section-title">Situation tendencies</h2>
            {q.data ? <SituationTendencies rows={q.data.situation_tendencies} /> : null}
          </section>

          <section className="space-y-3">
            <h2 className="app-section-title">Formation frequency</h2>
            {q.data ? <FormationFrequency rows={q.data.formation_frequency} /> : null}
          </section>

        </>
      )}
    </div>
  );
}
