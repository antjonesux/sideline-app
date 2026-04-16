"use client";

import { GameBreakdown, type GameTendenciesPayload } from "@/components/tendencies/GameBreakdown";
import { GameSelector } from "@/components/tendencies/GameSelector";
import { TendenciesSectionSkeleton } from "@/components/shared/AppSkeleton";
import { tendenciesQueryKeys } from "@/lib/tendenciesQueryKeys";
import type { GameSession } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

async function fetchGame(id: string): Promise<GameTendenciesPayload> {
  const res = await fetch(`/api/tendencies/game/${id}`);
  if (!res.ok) throw new Error("game tendencies");
  return res.json() as Promise<GameTendenciesPayload>;
}

type Props = {
  games: GameSession[];
};

export function GameFilm({ games }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && games[0]?.id) {
      setSelectedId(games[0].id);
    }
  }, [games, selectedId]);

  useEffect(() => {
    if (selectedId && !games.some((g) => g.id === selectedId) && games[0]) {
      setSelectedId(games[0].id);
    }
  }, [games, selectedId]);

  const detailQuery = useQuery({
    queryKey: tendenciesQueryKeys.game(selectedId ?? ""),
    queryFn: () => fetchGame(selectedId!),
    enabled: Boolean(selectedId),
    staleTime: 30 * 1000,
  });

  if (games.length === 0) {
    return (
      <div className="app-card app-card-pad text-center">
        <p className="font-body text-sm text-slate-400">No games available in Game Film yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="min-w-0 flex-1 sm:flex-initial">
        <GameSelector games={games} selectedId={selectedId} onSelect={setSelectedId} />
      </div>
      {detailQuery.isLoading ? <TendenciesSectionSkeleton /> : null}
      {detailQuery.data ? <GameBreakdown data={detailQuery.data} /> : null}
    </div>
  );
}
