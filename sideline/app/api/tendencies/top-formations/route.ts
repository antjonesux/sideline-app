import { supabase } from "@/lib/supabase";
import {
  aggregateByFormation,
  bestPlayForFormation,
  fetchGamesOrdered,
  fetchLoggedPlaysForGames,
  filterGameRowsByOffensivePlaybook,
  gamesWithOffensivePlaybookOnly,
  parsePlaybookFilter,
  parseScope,
  resolveFilteredGameIds,
} from "@/lib/tendenciesServer";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const scope = parseScope(sp.get("scope"));
  const opponent = sp.get("opponent")?.trim() || null;
  const playbook = parsePlaybookFilter(sp.get("playbook"));
  const showAll = sp.get("expand") === "1" || sp.get("all") === "1";
  const limit = showAll ? 200 : 3;

  const games = await fetchGamesOrdered(supabase);
  const pool = filterGameRowsByOffensivePlaybook(gamesWithOffensivePlaybookOnly(games), playbook);
  const gameIds = resolveFilteredGameIds(pool, scope, opponent);
  const plays = await fetchLoggedPlaysForGames(supabase, gameIds);

  const allFormations = aggregateByFormation(plays, 1);
  const formations = allFormations.slice(0, limit);
  const withBest = formations.map((f) => {
    const best = bestPlayForFormation(plays, f.formation, 1);
    return {
      ...f,
      best_play: best
        ? {
            play_name: best.play_name,
            uses: best.uses,
            avg_yards: best.avg_yards,
            touchdowns: best.touchdowns,
            first_downs: best.first_downs,
          }
        : null,
    };
  });

  return NextResponse.json({
    top_formations: withBest,
    total_matching: allFormations.length,
    meta: { scope, opponent, playbook, game_count: gameIds.length, play_count: plays.length },
  });
}
