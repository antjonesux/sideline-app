import { supabase } from "@/lib/supabase";
import {
  aggregateByFormation,
  bestPlayForFormation,
  fetchGamesOrdered,
  fetchLoggedPlaysForGames,
  parseScope,
  resolveFilteredGameIds,
} from "@/lib/tendenciesServer";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const scope = parseScope(sp.get("scope"));
  const opponent = sp.get("opponent")?.trim() || null;
  const minUses = Math.max(1, Math.min(50, Number(sp.get("min_uses")) || 3));
  const showAll = sp.get("expand") === "1" || sp.get("all") === "1";
  const limit = showAll ? 200 : 3;

  const games = await fetchGamesOrdered(supabase);
  const gameIds = resolveFilteredGameIds(games, scope, opponent);
  const plays = await fetchLoggedPlaysForGames(supabase, gameIds);

  const allFormations = aggregateByFormation(plays, minUses);
  const formations = allFormations.slice(0, limit);
  const withBest = formations.map((f) => {
    const best = bestPlayForFormation(plays, f.formation, 2);
    return {
      ...f,
      best_play: best
        ? {
            play_name: best.play_name,
            success_rate: best.success_rate,
            uses: best.uses,
          }
        : null,
    };
  });

  return NextResponse.json({
    top_formations: withBest,
    total_matching: allFormations.length,
    meta: { scope, opponent, min_uses: minUses, game_count: gameIds.length, play_count: plays.length },
  });
}
