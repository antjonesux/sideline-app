import { supabase } from "@/lib/supabase";
import {
  attachPlayTypes,
  fetchCfbPlayTypeMap,
  fetchGamesOrdered,
  fetchLoggedPlaysForGames,
  formationFrequency,
  motionStatsForPlaybook,
  parseScope,
  playbookForGame,
  playTypeCounts,
  resolveFilteredGameIds,
  situationRunPassRows,
  userMotionRate,
} from "@/lib/tendenciesServer";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const scope = parseScope(sp.get("scope"));
  const opponent = sp.get("opponent")?.trim() || null;

  const games = await fetchGamesOrdered(supabase);
  const gameIds = resolveFilteredGameIds(games, scope, opponent);
  const plays = await fetchLoggedPlaysForGames(supabase, gameIds);
  const gamesById = new Map(games.map((g) => [g.id, g]));

  const playbookCounts = new Map<string, number>();
  for (const p of plays) {
    const g = gamesById.get(p.game_session_id);
    if (!g) continue;
    const pb = playbookForGame(g);
    if (!pb) continue;
    playbookCounts.set(pb, (playbookCounts.get(pb) ?? 0) + 1);
  }
  let dominantPlaybook = "";
  let maxC = 0;
  for (const [pb, c] of playbookCounts) {
    if (c > maxC) {
      maxC = c;
      dominantPlaybook = pb;
    }
  }

  const cfbTypes = await fetchCfbPlayTypeMap(supabase, [...playbookCounts.keys()]);
  const buckets = attachPlayTypes(plays, gamesById, cfbTypes).map((x) => x.bucket);
  const counts = playTypeCounts(buckets);
  const total = plays.length || 1;
  const play_type_distribution = (["Run", "Pass", "RPO", "Option", "Other"] as const).map((name) => ({
    name,
    pct: Math.round(((counts[name] ?? 0) * 1000) / total) / 10,
    count: counts[name] ?? 0,
  }));

  const situation_tendencies = situationRunPassRows(plays, buckets);
  const formation_frequency = formationFrequency(plays);

  const userMotionPct = userMotionRate(plays);
  const { motionPct: playbookMotionPct } = await motionStatsForPlaybook(supabase, dominantPlaybook);
  const underutilizing =
    Boolean(dominantPlaybook) && playbookMotionPct >= 10 && userMotionPct < playbookMotionPct - 5;

  return NextResponse.json({
    play_type_distribution,
    situation_tendencies,
    formation_frequency,
    motion: {
      user_pct: userMotionPct,
      playbook_pct: playbookMotionPct,
      playbook_name: dominantPlaybook,
      underutilizing,
    },
    meta: { scope, opponent, game_count: gameIds.length, play_count: plays.length },
  });
}
