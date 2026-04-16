import { supabase } from "@/lib/supabase";
import {
  aggregateByFormationPlay,
  fetchGamesOrdered,
  fetchLoggedPlaysForGames,
  mostCommonScenarioByFormationPlay,
  parseScope,
  qualifiesForReconsiderPlay,
  resolveFilteredGameIds,
} from "@/lib/tendenciesServer";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const scope = parseScope(sp.get("scope"));
  const opponent = sp.get("opponent")?.trim() || null;
  const showAll = sp.get("expand") === "1" || sp.get("all") === "1";
  const limit = showAll ? 200 : 5;

  const games = await fetchGamesOrdered(supabase);
  const gameIds = resolveFilteredGameIds(games, scope, opponent);
  const plays = await fetchLoggedPlaysForGames(supabase, gameIds);

  const ranked = aggregateByFormationPlay(plays, 1, "composite");
  const top = ranked.slice(0, limit);
  const scenarioByPlay = mostCommonScenarioByFormationPlay(plays);
  const reconsider = aggregateByFormationPlay(plays, 1, "composite")
    .filter(qualifiesForReconsiderPlay)
    .map((r) => ({
      ...r,
      common_scenario: scenarioByPlay.get(`${r.formation}\u0000${r.play_name}`) ?? "Unknown",
    }))
    .sort((a, b) => b.uses - a.uses || a.avg_yards - b.avg_yards)
    .slice(0, 200);

  return NextResponse.json({
    top_plays: top,
    total_matching: ranked.length,
    reconsider_plays: reconsider,
    meta: { scope, opponent, game_count: gameIds.length, play_count: plays.length },
  });
}
