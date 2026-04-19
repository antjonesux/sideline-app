"use client";

import { PlayTypeDistribution } from "@/components/tendencies/PlayTypeDistribution";
import { ScoutingReportSection } from "@/components/tendencies/ScoutingReportSection";
import type { ScoutingFormationReportRow, ScoutingReportRow } from "@/lib/tendenciesServer";
import {
  TendenciesFilters,
  buildTendenciesQueryString,
  type TendenciesScopeParams,
} from "@/components/tendencies/TendenciesFilters";
import { TendenciesEmptyState } from "@/components/tendencies/TendenciesEmptyState";
import { TendenciesPredictabilityBodySkeleton } from "@/components/shared/AppSkeleton";
import { tendenciesQueryKeys } from "@/lib/tendenciesQueryKeys";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

type PredictApi = {
  play_type_distribution: { name: string; pct: number; count: number }[];
  scouting_report: ScoutingReportRow[];
  scouting_formation_report?: ScoutingFormationReportRow[];
  key_rates: {
    turnover: { pct: number; turnovers: number; total_plays: number };
    motion: {
      pct: number;
      motion_plays: number;
      total_plays: number;
      playbook_pct: number;
      playbook_name: string;
      underutilizing: boolean;
    };
    red_zone_td: { pct: number; touchdowns: number; plays: number };
    third_down: { pct: number; conversions: number; plays: number };
  };
  motion: { user_pct: number; playbook_pct: number; playbook_name: string; underutilizing: boolean };
  meta: {
    play_count: number;
    classified_play_count?: number;
    turnover_count: number;
    turnover_rate: number;
    game_count: number;
    overall_success_rate: number;
  };
};

function KeyRateCard({ label, pctDisplay, description }: { label: string; pctDisplay: string; description: string }) {
  return (
    <div className="app-card flex min-h-[132px] flex-col p-4">
      <p className="font-mono text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 font-heading text-[28px] font-bold leading-none tracking-wide text-slate-100 tabular-nums">{pctDisplay}</p>
      <p className="mt-auto pt-3 font-body text-[12px] font-normal leading-snug text-slate-500">{description}</p>
    </div>
  );
}

type Props = {
  opponents: string[];
  playbook: string | null;
  onPlaybookChange: (next: string | null) => void;
  playbookOptions: string[];
  playbookLoading?: boolean;
};

export function AmIPredictable({ opponents, playbook, onPlaybookChange, playbookOptions, playbookLoading = false }: Props) {
  const [filters, setFilters] = useState<TendenciesScopeParams>({ pill: "all", opponentTeam: null, minUses: 3 });
  const qs = useMemo(() => buildTendenciesQueryString({ ...filters, playbook }), [filters, playbook]);

  const q = useQuery({
    queryKey: tendenciesQueryKeys.predictability(qs),
    queryFn: async () => {
      const res = await fetch(`/api/tendencies/predictability?${qs}`);
      if (!res.ok) throw new Error("predictability");
      return res.json() as Promise<PredictApi>;
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const dataLoading = q.isLoading;

  const showPlaybookEmpty = Boolean(playbook) && !dataLoading && q.data && q.data.meta.game_count === 0;

  /**
   * Uses the same rows as the bar chart. Denominator matches the API: classified plays only (unclassified excluded).
   */
  const topTypeCards = q.data
    ? (() => {
        const byName = new Map(q.data.play_type_distribution.map((row) => [row.name, row]));
        const denom = (q.data.meta.classified_play_count ?? q.data.meta.play_count) || 1;
        const pct = (name: string) => {
          const row = byName.get(name);
          return row ? Math.round(row.pct * 10) / 10 : 0;
        };
        const passCount =
          (byName.get("Pass")?.count ?? 0) +
          (byName.get("Play Action")?.count ?? 0) +
          (byName.get("Screen")?.count ?? 0);
        const passPct = Math.round((passCount * 1000) / denom) / 10;
        return [
          { name: "Run", pct: pct("Run") },
          { name: "Pass", pct: passPct },
          { name: "RPO", pct: pct("RPO") },
          { name: "Play Action", pct: pct("Play Action") },
        ];
      })()
    : [];

  return (
    <div className="space-y-8">
      <TendenciesFilters
        value={filters}
        onChange={setFilters}
        opponents={opponents}
        playbook={playbook}
        onPlaybookChange={onPlaybookChange}
        playbookOptions={playbookOptions}
        playbookLoading={playbookLoading}
        showMinUsesLine={false}
      />

      {showPlaybookEmpty && playbook ? <TendenciesEmptyState playbookName={playbook} /> : null}

      {showPlaybookEmpty ? null : dataLoading ? (
        <TendenciesPredictabilityBodySkeleton />
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
                    <p className="mt-1 font-mono text-2xl font-bold text-slate-100">{Math.round(row.pct)}%</p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="space-y-3">
            <h2 className="app-section-title">Key Rates</h2>
            {q.data ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KeyRateCard
                  label="TURNOVER RATE"
                  pctDisplay={`${Math.round(q.data.key_rates.turnover.pct)}%`}
                  description={`${q.data.key_rates.turnover.turnovers.toLocaleString("en-US")} TO · ${q.data.key_rates.turnover.total_plays.toLocaleString("en-US")} calls`}
                />
                <KeyRateCard
                  label="MOTION USAGE"
                  pctDisplay={`${Math.round(q.data.key_rates.motion.pct)}%`}
                  description={(() => {
                    const m = q.data.key_rates.motion;
                    return `${m.motion_plays.toLocaleString("en-US")} motion · ${m.total_plays.toLocaleString("en-US")} calls`;
                  })()}
                />
                <KeyRateCard
                  label="RED ZONE TD%"
                  pctDisplay={`${Math.round(q.data.key_rates.red_zone_td.pct)}%`}
                  description={(() => {
                    const z = q.data.key_rates.red_zone_td;
                    if (z.plays === 0) return "No red zone calls in this filter.";
                    return `${z.touchdowns.toLocaleString("en-US")} TD · ${z.plays.toLocaleString("en-US")} red zone calls`;
                  })()}
                />
                <KeyRateCard
                  label="3RD DOWN CONV%"
                  pctDisplay={`${Math.round(q.data.key_rates.third_down.pct)}%`}
                  description={(() => {
                    const t = q.data.key_rates.third_down;
                    if (t.plays === 0) return "No third-down calls in this filter.";
                    return `${t.conversions.toLocaleString("en-US")} conversions · ${t.plays.toLocaleString("en-US")} third-down calls`;
                  })()}
                />
              </div>
            ) : null}
          </section>

          {q.data ? (
            <ScoutingReportSection
              situationRows={q.data.scouting_report ?? []}
              formationRows={q.data.scouting_formation_report ?? []}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
