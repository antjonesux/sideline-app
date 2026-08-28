"use client";

import { PlayTypeDistribution } from "@/components/tendencies/PlayTypeDistribution";
import { ScoutingReportSection } from "@/components/tendencies/ScoutingReportSection";
import type { ScoutingFormationReportRow, ScoutingReportRow } from "@/lib/tendenciesServer";
import { buildTendenciesQueryString, type TendenciesScopeParams } from "@/components/tendencies/TendenciesFilters";
import { TendenciesEmptyState } from "@/components/tendencies/TendenciesEmptyState";
import { TendenciesPredictabilityBodySkeleton } from "@/components/shared/AppSkeleton";
import { TENDENCIES_SECTION_HEADING_CLASS } from "@/lib/coachCopy";
import { tendenciesQueryKeys } from "@/lib/tendenciesQueryKeys";
import type { CatalogGameVersion } from "@/lib/constants";
import type { DriveSideOfBall } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

type PredictApi = {
  play_type_distribution: { name: string; pct: number; count: number }[];
  scouting_report: ScoutingReportRow[];
  scouting_formation_report?: ScoutingFormationReportRow[];
  key_rates: {
    turnover: { pct: number; turnovers: number; total_plays: number };
    explosive_play: { pct: number; explosive_plays: number; total_plays: number };
    motion: {
      pct: number;
      motion_plays: number;
      total_plays: number;
      playbook_pct: number;
      playbook_name: string;
      underutilizing: boolean;
    };
    red_zone: { pct: number; scoring_plays: number; plays: number };
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
    <div className="rounded-xl border border-slate-700 bg-slate-900 flex min-h-[132px] flex-col p-4">
      <p className="font-mono text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 font-heading text-[28px] font-bold leading-none tracking-wide text-slate-100 tabular-nums">{pctDisplay}</p>
      <p className="mt-auto pt-3 font-body text-[12px] font-normal leading-snug text-slate-500">{description}</p>
    </div>
  );
}

type Props = {
  opponents: string[];
  playbook: string | null;
  filters: TendenciesScopeParams;
  sideOfBall: DriveSideOfBall;
  gameVersion: CatalogGameVersion;
};

export function AmIPredictable({ opponents: _opponents, playbook, filters, sideOfBall, gameVersion }: Props) {
  const qs = useMemo(
    () => buildTendenciesQueryString({ ...filters, playbook, sideOfBall, gameVersion }),
    [filters, playbook, sideOfBall, gameVersion],
  );

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

  return (
    <div className="space-y-8">
      {showPlaybookEmpty && playbook ? <TendenciesEmptyState playbookName={playbook} /> : null}

      {showPlaybookEmpty ? null : dataLoading ? (
        <TendenciesPredictabilityBodySkeleton />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className={TENDENCIES_SECTION_HEADING_CLASS}>Play type distribution</h2>
            {q.data ? <PlayTypeDistribution data={q.data.play_type_distribution} /> : null}
          </section>

          <section className="space-y-3">
            <h2 className={TENDENCIES_SECTION_HEADING_CLASS}>Key Rates</h2>
            {q.data ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KeyRateCard
                  label="RED ZONE %"
                  pctDisplay={`${Math.round(q.data.key_rates.red_zone.pct)}%`}
                  description={(() => {
                    const z = q.data.key_rates.red_zone;
                    if (z.plays === 0) return "No red zone calls in this filter.";
                    return `${z.scoring_plays.toLocaleString("en-US")} scores · ${z.plays.toLocaleString("en-US")} red zone calls`;
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
                <KeyRateCard
                  label="EXPLOSIVE PLAY %"
                  pctDisplay={`${Math.round(q.data.key_rates.explosive_play.pct)}%`}
                  description={(() => {
                    const e = q.data.key_rates.explosive_play;
                    return `${e.explosive_plays.toLocaleString("en-US")} plays · ${e.total_plays.toLocaleString("en-US")} calls · 15+ yds`;
                  })()}
                />
                <KeyRateCard
                  label="TURNOVER RATE"
                  pctDisplay={`${Math.round(q.data.key_rates.turnover.pct)}%`}
                  description={`${q.data.key_rates.turnover.turnovers.toLocaleString("en-US")} TO · ${q.data.key_rates.turnover.total_plays.toLocaleString("en-US")} calls`}
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
