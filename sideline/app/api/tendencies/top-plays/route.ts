import { supabase } from "@/lib/supabase";
import {
  aggregateByFormationPlay,
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
  const limit = showAll ? 200 : 10;

  const games = await fetchGamesOrdered(supabase);
  const gameIds = resolveFilteredGameIds(games, scope, opponent);
  const plays = await fetchLoggedPlaysForGames(supabase, gameIds);

  const ranked = aggregateByFormationPlay(plays, minUses);
  const top = ranked.slice(0, limit);
  const reconsider = aggregateByFormationPlay(plays, 1)
    .filter((r) => r.uses >= 4 && r.success_rate < 35)
    .sort((a, b) => a.success_rate - b.success_rate || a.uses - b.uses)
    .slice(0, 20);

  return NextResponse.json({
    top_plays: top,
    total_matching: ranked.length,
    reconsider_plays: reconsider,
    meta: { scope, opponent, min_uses: minUses, game_count: gameIds.length, play_count: plays.length },
  });
}
