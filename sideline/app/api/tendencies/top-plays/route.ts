import { createClient } from "@/lib/supabase/server";
import { isSpecialTeamsFormationPlayRow } from "@/lib/playTypeResolution";
import {
  aggregateByFormationPlay,
  fetchGamesOrdered,
  fetchLoggedPlaysForGames,
  mostCommonScenarioByFormationPlay,
  parsePlaybookFilter,
  parseScope,
  parseSideOfBallFilter,
  qualifiesForReconsiderPlay,
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
  const showAll = sp.get("expand") === "1" || sp.get("all") === "1";
  const limit = showAll ? 200 : 5;

  const games = await fetchGamesOrdered(supabase, user.id);
  const pool = resolveTendenciesGamePool(games, playbook, sideOfBall);
  const gameIds = resolveFilteredGameIds(pool, scope, opponent);
  const plays = await fetchLoggedPlaysForGames(supabase, gameIds, user.id, { sideOfBall });

  const ranked = aggregateByFormationPlay(plays, 1, "composite");
  const top = ranked.slice(0, limit);
  const scenarioByPlay = mostCommonScenarioByFormationPlay(plays);
  const reconsider = aggregateByFormationPlay(plays, 1, "composite")
    .filter((r) => !isSpecialTeamsFormationPlayRow(r.formation, r.play_name))
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
    meta: { scope, opponent, playbook, side_of_ball: sideOfBall, game_count: gameIds.length, play_count: plays.length },
  });
}
