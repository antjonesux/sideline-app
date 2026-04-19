"use client";

import { TendenciesSectionSkeleton } from "@/components/shared/AppSkeleton";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { GameFormationTable } from "@/components/tendencies/GameFormationTable";
import { PlayTypeDistribution } from "@/components/tendencies/PlayTypeDistribution";
import type { GameTendenciesPayload } from "@/lib/tendenciesGameBreakdown";
import { COULDNT_LOAD } from "@/lib/coachCopy";
import { tendenciesQueryKeys } from "@/lib/tendenciesQueryKeys";
import { successRateTextClass } from "@/lib/successRateTextClass";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

async function fetchGameTendencies(id: string): Promise<GameTendenciesPayload> {
  const res = await fetch(`/api/tendencies/game/${id}`);
  if (!res.ok) throw new Error("game tendencies");
  return res.json() as Promise<GameTendenciesPayload>;
}

function CoreStatsGrid({ stats }: { stats: GameTendenciesPayload["stats"] }) {
  function Card({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
    return (
      <div className="app-card app-card-pad">
        <p className="font-sans text-[10px] font-normal uppercase tracking-wide text-slate-500">{label}</p>
        <p
          className={`mt-1 font-mono text-xl font-semibold leading-[1.05] tabular-nums ${valueClass ?? "text-slate-100"}`}
        >
          {value}
        </p>
      </div>
    );
  }
  const totalYards = stats.total_yards;
  const yardsTone =
    totalYards > 0 ? "text-emerald-400" : totalYards < 0 ? "text-red-400" : "text-slate-500";
  const yardsVal = totalYards > 0 ? `+${totalYards}` : String(totalYards);
  const avg = stats.avg_yards_per_play;
  const avgTone = avg > 0 ? "text-emerald-400" : avg < 0 ? "text-red-400" : "text-slate-500";
  const avgVal = avg > 0 ? `+${avg.toFixed(1)}` : String(avg.toFixed(1));
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card label="Plays" value={String(stats.play_count)} />
      <Card label="Yards" value={yardsVal} valueClass={yardsTone} />
      <Card label="Avg yds" value={avgVal} valueClass={avgTone} />
      <Card label="Success" value={`${stats.success_rate}%`} valueClass={successRateTextClass(stats.success_rate)} />
      <Card label="TD" value={String(stats.tds)} />
      <Card label="TO" value={String(stats.turnovers)} />
    </div>
  );
}

type Props = { gameId: string };

type ScenarioRow = GameTendenciesPayload["scenario_breakdown"][number];

export function FilmGameTendenciesBody({ gameId }: Props) {
  const scenarioColumns = useMemo<DataTableColumn<ScenarioRow>[]>(
    () => [
      {
        key: "situation",
        header: "SITUATION",
        render: (r) => <span className="font-mono text-sm text-slate-200">{r.situation}</span>,
      },
      {
        key: "plays",
        header: "PLAYS",
        render: (r) => <span className="font-mono tabular-nums text-sm text-slate-300">{r.plays}</span>,
      },
      {
        key: "success",
        header: "SUCCESS",
        render: (r) => (
          <span className={`font-mono text-sm font-medium tabular-nums ${successRateTextClass(r.success_rate)}`}>
            {r.success_rate}%
          </span>
        ),
      },
    ],
    [],
  );

  const q = useQuery({
    queryKey: tendenciesQueryKeys.game(gameId),
    queryFn: () => fetchGameTendencies(gameId),
    enabled: Boolean(gameId),
    staleTime: 30 * 1000,
  });

  if (q.isLoading) return <TendenciesSectionSkeleton />;
  if (q.isError) {
    return (
      <div className="app-card app-card-pad font-sans text-sm text-slate-400">{COULDNT_LOAD}</div>
    );
  }
  const data = q.data;
  if (!data) return null;

  const hasPlays = data.stats.play_count > 0;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 font-display text-sm uppercase tracking-wider text-white">GAME STATS</h2>
        <CoreStatsGrid stats={data.stats} />
      </section>

      <section>
        <h2 className="mb-3 font-display text-sm uppercase tracking-wider text-white">PLAY TYPES</h2>
        {hasPlays ? (
          <PlayTypeDistribution data={data.play_type_distribution} />
        ) : (
          <p className="font-sans text-sm text-slate-500">Log plays to see run, pass, and RPO splits.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-sm uppercase tracking-wider text-white">BY SITUATION</h2>
        {!hasPlays || data.scenario_breakdown.length === 0 ? (
          <p className="font-sans text-sm text-slate-500">No situations tagged on this log yet.</p>
        ) : (
          <div className="app-card overflow-hidden">
            <DataTable
              columns={scenarioColumns}
              rows={data.scenario_breakdown}
              getRowKey={(r) => r.situation}
            />
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-sm uppercase tracking-wider text-white">FORMATIONS</h2>
        <GameFormationTable rows={data.formation_breakdown} />
      </section>
    </div>
  );
}
