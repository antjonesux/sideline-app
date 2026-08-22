"use client";

import { TendenciesSectionSkeleton } from "@/components/shared/AppSkeleton";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { PlayTypeDistribution } from "@/components/tendencies/PlayTypeDistribution";
import { ReconsiderPlays } from "@/components/tendencies/ReconsiderPlays";
import { TopFormationsList } from "@/components/tendencies/TopFormationsList";
import { TopPlaysList } from "@/components/tendencies/TopPlaysList";
import { WORKING_LIST_PAGE_SIZE } from "@/components/tendencies/WorkingListPagination";
import { COULDNT_LOAD } from "@/lib/coachCopy";
import { summarizeGameWhatsWorking } from "@/lib/gameTendenciesWhatsWorking";
import type { GameTendenciesPayload } from "@/lib/tendenciesGameBreakdown";
import { tendenciesQueryKeys } from "@/lib/tendenciesQueryKeys";
import { successRateTextClass } from "@/lib/successRateTextClass";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

async function fetchGameTendencies(id: string): Promise<GameTendenciesPayload> {
  const res = await fetch(`/api/tendencies/game/${id}`);
  if (!res.ok) throw new Error("game tendencies");
  return res.json() as Promise<GameTendenciesPayload>;
}

function CoreStatsGrid({ stats }: { stats: GameTendenciesPayload["stats"] }) {
  function Card({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
    return (
      <div className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2">
        <p className="truncate font-sans text-[9px] font-normal uppercase tracking-wide text-slate-500 sm:text-[10px]">
          {label}
        </p>
        <p
          className={`mt-0.5 truncate font-mono text-base font-semibold leading-tight tabular-nums sm:text-xl ${valueClass ?? "text-slate-100"}`}
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
    <div className="grid grid-cols-3 grid-rows-2 gap-2 sm:gap-3">
      <Card label="Calls" value={String(stats.play_count)} />
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
  const [playsExpanded, setPlaysExpanded] = useState(false);
  const [playsPage, setPlaysPage] = useState(1);
  const [formationsExpanded, setFormationsExpanded] = useState(false);
  const [formationsPage, setFormationsPage] = useState(1);
  const [reconsiderExpanded, setReconsiderExpanded] = useState(false);
  const [reconsiderPage, setReconsiderPage] = useState(1);

  const scenarioColumns = useMemo<DataTableColumn<ScenarioRow>[]>(
    () => [
      {
        key: "situation",
        header: "SITUATION",
        render: (r) => (
          <span className="block truncate font-mono text-sm text-slate-200" title={r.situation}>
            {r.situation}
          </span>
        ),
      },
      {
        key: "plays",
        header: "CALLS",
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

  const plays = useMemo(() => (q.data?.drives ?? []).flatMap((d) => d.plays), [q.data?.drives]);
  const working = useMemo(() => summarizeGameWhatsWorking(plays), [plays]);

  useEffect(() => {
    setPlaysExpanded(false);
    setPlaysPage(1);
    setFormationsExpanded(false);
    setFormationsPage(1);
    setReconsiderExpanded(false);
    setReconsiderPage(1);
  }, [gameId]);

  const rankedPlaysFull = working.rankedPlays;
  const playsRows = useMemo(() => {
    if (!playsExpanded) return rankedPlaysFull.slice(0, 5);
    const start = (playsPage - 1) * WORKING_LIST_PAGE_SIZE;
    return rankedPlaysFull.slice(start, start + WORKING_LIST_PAGE_SIZE);
  }, [rankedPlaysFull, playsExpanded, playsPage]);
  const playsRankOffset = playsExpanded ? (playsPage - 1) * WORKING_LIST_PAGE_SIZE : 0;

  const formationsListFull = working.rankedFormations;
  const formationsRows = useMemo(() => {
    if (!formationsExpanded) return formationsListFull.slice(0, 3);
    const start = (formationsPage - 1) * WORKING_LIST_PAGE_SIZE;
    return formationsListFull.slice(start, start + WORKING_LIST_PAGE_SIZE);
  }, [formationsListFull, formationsExpanded, formationsPage]);
  const formationsRankOffset = formationsExpanded ? (formationsPage - 1) * WORKING_LIST_PAGE_SIZE : 0;

  const reconsiderListFull = working.reconsiderPlays;
  const reconsiderRows = useMemo(() => {
    if (!reconsiderExpanded) return reconsiderListFull.slice(0, 3);
    const start = (reconsiderPage - 1) * WORKING_LIST_PAGE_SIZE;
    return reconsiderListFull.slice(start, start + WORKING_LIST_PAGE_SIZE);
  }, [reconsiderListFull, reconsiderExpanded, reconsiderPage]);
  const reconsiderRankOffset = reconsiderExpanded ? (reconsiderPage - 1) * WORKING_LIST_PAGE_SIZE : 0;

  if (q.isLoading) return <TendenciesSectionSkeleton />;
  if (q.isError) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 font-sans text-sm text-slate-400">{COULDNT_LOAD}</div>
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
          <p className="font-sans text-sm text-slate-500">
            Log calls to see run/pass/RPO splits, top calls, formations, and plays to reconsider.
          </p>
        )}
      </section>

      {hasPlays ? (
        <>
          <section>
            <h2 className="mb-3 font-display text-sm uppercase tracking-wider text-white">TOP PLAYS</h2>
            {rankedPlaysFull.length === 0 ? (
              <p className="font-sans text-sm text-slate-500">Not enough calls yet to rank plays.</p>
            ) : (
              <TopPlaysList
                rows={playsRows}
                totalMatching={rankedPlaysFull.length}
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
            )}
          </section>

          <section>
            <h2 className="mb-3 font-display text-sm uppercase tracking-wider text-white">TOP FORMATIONS</h2>
            {formationsListFull.length === 0 ? (
              <p className="font-sans text-sm text-slate-500">No formations logged in this game.</p>
            ) : (
              <TopFormationsList
                rows={formationsRows}
                totalCount={formationsListFull.length}
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
            )}
          </section>

          {reconsiderListFull.length > 0 ? (
            <section>
              <h2 className="mb-3 font-display text-sm uppercase tracking-wider text-white">PLAYS TO RECONSIDER</h2>
              <ReconsiderPlays
                rows={reconsiderRows}
                totalCount={reconsiderListFull.length}
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
        </>
      ) : null}

      <section>
        <h2 className="mb-3 font-display text-sm uppercase tracking-wider text-white">BY SITUATION</h2>
        {!hasPlays || data.scenario_breakdown.length === 0 ? (
          <p className="font-sans text-sm text-slate-500">No situations tagged on this log yet.</p>
        ) : (
          <div className="min-w-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
            <DataTable
              columns={scenarioColumns}
              equalColumns
              equalColumnsCompact
              rows={data.scenario_breakdown}
              getRowKey={(r) => r.situation}
            />
          </div>
        )}
      </section>
    </div>
  );
}
