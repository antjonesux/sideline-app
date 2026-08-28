import { createClient } from "@/lib/supabase/server";
import {
  aggregateByFormation,
  bestPlayForFormation,
  fetchGamesOrdered,
  fetchLoggedPlaysForGames,
  filterGameRowsByGameVersion,
  parseGameVersionFilter,
  parsePlaybookFilter,
  parseScope,
  parseSideOfBallFilter,
  resolveFilteredGameIds,
  resolveTendenciesGamePool,
} from "@/lib/tendenciesServer";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const scope = parseScope(sp.get("scope"));
  const opponent = sp.get("opponent")?.trim() || null;
  const playbook = parsePlaybookFilter(sp.get("playbook"));
  const sideOfBall = parseSideOfBallFilter(sp.get("side_of_ball"));
  const gameVersion = parseGameVersionFilter(sp.get("game_version"));
  const showAll = sp.get("expand") === "1" || sp.get("all") === "1";
  const limit = showAll ? 200 : 3;

  const allGames = await fetchGamesOrdered(supabase, user.id);
  const games = filterGameRowsByGameVersion(allGames, gameVersion);
  const pool = resolveTendenciesGamePool(games, playbook, sideOfBall);
  const gameIds = resolveFilteredGameIds(pool, scope, opponent);
  const plays = await fetchLoggedPlaysForGames(supabase, gameIds, user.id, { sideOfBall });

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
    meta: { scope, opponent, playbook, side_of_ball: sideOfBall, game_count: gameIds.length, play_count: plays.length },
  });
}
