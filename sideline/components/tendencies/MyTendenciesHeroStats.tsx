"use client";

import { SkeletonBlock } from "@/components/shared/AppSkeleton";
import { buildTendenciesQueryString } from "@/components/tendencies/TendenciesFilters";
import { COULDNT_LOAD } from "@/lib/coachCopy";
import { tendenciesQueryKeys } from "@/lib/tendenciesQueryKeys";
import type { CatalogGameVersion } from "@/lib/constants";
import type { DriveSideOfBall } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

type OverviewData = {
  wins: number;
  losses: number;
  win_rate_pct: number;
  avg_yards_per_play: number;
  run_pct: number;
  pass_pct: number;
};

type OverviewResponse = { data: OverviewData };

type Props = {
  sideOfBall: DriveSideOfBall;
  playbook: string | null;
  gameVersion: CatalogGameVersion;
  pill?: "all" | "last5" | "last10" | "vs";
  opponentTeam?: string | null;
};

function HeroStatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 flex min-h-[132px] flex-col p-4">
      <p className="font-mono text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 font-heading text-[28px] font-bold leading-none tracking-wide text-slate-100 tabular-nums">
        {value}
      </p>
      <p className="mt-auto pt-3 font-body text-[12px] font-normal leading-snug text-slate-500">{description}</p>
    </div>
  );
}

function HeroStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-700 bg-slate-900 flex min-h-[132px] flex-col p-4"
        >
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="mt-3 h-8 w-16" />
          <SkeletonBlock className="mt-auto h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

const emptyOverview: OverviewData = {
  wins: 0,
  losses: 0,
  win_rate_pct: 0,
  avg_yards_per_play: 0,
  run_pct: 0,
  pass_pct: 0,
};

export function MyTendenciesHeroStats({
  sideOfBall,
  playbook,
  gameVersion,
  pill = "all",
  opponentTeam = null,
}: Props) {
  const qs = useMemo(
    () =>
      buildTendenciesQueryString({
        pill,
        opponentTeam,
        minUses: 1,
        playbook,
        sideOfBall,
        gameVersion,
      }),
    [pill, opponentTeam, playbook, sideOfBall, gameVersion],
  );

  const q = useQuery({
    queryKey: tendenciesQueryKeys.overview(qs),
    queryFn: async () => {
      const res = await fetch(`/api/tendencies/overview?${qs}`);
      if (!res.ok) throw new Error("overview");
      return res.json() as Promise<OverviewResponse>;
    },
    staleTime: 60 * 1000,
  });

  if (q.isLoading) return <HeroStatsSkeleton />;

  const data = q.data?.data ?? emptyOverview;
  const showDash = q.isError;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <HeroStatCard
          label="WIN RATE"
          value={showDash ? "—" : `${data.win_rate_pct}%`}
          description={showDash ? "—" : `${data.wins}W – ${data.losses}L`}
        />
        <HeroStatCard
          label="AVG YPP"
          value={showDash ? "—" : data.avg_yards_per_play.toFixed(1)}
          description="Yards per play"
        />
        <HeroStatCard
          label="RUN / PASS"
          value={showDash ? "—" : `${data.run_pct}/${data.pass_pct}`}
          description="Play type split"
        />
      </div>
      {q.isError ? <p className="font-body text-xs text-slate-500">{COULDNT_LOAD}</p> : null}
    </div>
  );
}
