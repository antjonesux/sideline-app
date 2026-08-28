import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import { createClient } from "@/lib/supabase/server";
import {
  attachPlayTypes,
  fetchCfbPlayTypeMap,
  fetchGamesOrdered,
  fetchLoggedPlaysForGames,
  filterGameRowsByGameVersion,
  parseGameVersionFilter,
  parsePlaybookFilter,
  parseScope,
  parseSideOfBallFilter,
  playbookForTendenciesSide,
  resolveFilteredGameIds,
  resolveTendenciesGamePool,
  summarizeTendenciesOverview,
} from "@/lib/tendenciesServer";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const scope = parseScope(sp.get("scope"));
  const opponent = sp.get("opponent")?.trim() || null;
  const playbook = parsePlaybookFilter(sp.get("playbook"));
  const sideOfBall = parseSideOfBallFilter(sp.get("side_of_ball"));
  const gameVersion = parseGameVersionFilter(sp.get("game_version"));

  try {
    const allGames = await fetchGamesOrdered(supabase, user.id);
    const games = filterGameRowsByGameVersion(allGames, gameVersion);
    const pool = resolveTendenciesGamePool(games, playbook, sideOfBall);
    const gameIds = resolveFilteredGameIds(pool, scope, opponent);
    const plays = await fetchLoggedPlaysForGames(supabase, gameIds, user.id, { sideOfBall });
    const gamesById = new Map(games.map((g) => [g.id, g]));

    const playbookLabels = new Set<string>();
    for (const p of plays) {
      const g = gamesById.get(p.game_session_id);
      if (!g) continue;
      const pb = playbookForTendenciesSide(g, sideOfBall);
      if (pb) playbookLabels.add(pb);
    }

    const cfbTypes = await fetchCfbPlayTypeMap(supabase, [...playbookLabels], {
      sideOfBall,
      gameVersion,
    });
    const typed = attachPlayTypes(plays, gamesById, cfbTypes, undefined, sideOfBall);
    const data = summarizeTendenciesOverview(
      plays,
      gamesById,
      typed.map((t) => t.bucket),
    );

    return NextResponse.json({ data });
  } catch (err) {
    console.error("tendencies overview:", err);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 500 });
  }
}
