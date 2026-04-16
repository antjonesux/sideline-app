import { supabase } from "@/lib/supabase";
import {
  attachPlayTypes,
  fetchCfbPlayTypeMap,
  fetchGamesOrdered,
  fetchLoggedPlaysForGames,
  filterGameRowsByOffensivePlaybook,
  gamesWithOffensivePlaybookOnly,
  motionStatsForPlaybook,
  motionUsageStats,
  parsePlaybookFilter,
  parseScope,
  playbookForGame,
  playTypeCounts,
  redZoneTdStats,
  resolveFilteredGameIds,
  scoutingFormationReportRows,
  scoutingReportRows,
  thirdDownConvStats,
} from "@/lib/tendenciesServer";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const scope = parseScope(sp.get("scope"));
  const opponent = sp.get("opponent")?.trim() || null;
  const playbook = parsePlaybookFilter(sp.get("playbook"));
  const escapedOpponent = opponent ? opponent.replace(/'/g, "''") : null;

  const debugSql = `
WITH filtered_games AS (
  SELECT
    gs.id,
    COALESCE(NULLIF(TRIM(gs.offensive_playbook), ''), TRIM(gs.my_playbook)) AS game_playbook,
    gs.opponent_team,
    gs.game_date
  FROM game_sessions gs
),
scoped_games AS (
  SELECT fg.*
  FROM filtered_games fg
  WHERE (
    '${scope}' = 'all'
    OR ('${scope}' = 'last5' AND fg.id IN (SELECT id FROM filtered_games ORDER BY game_date DESC LIMIT 5))
    OR ('${scope}' = 'last10' AND fg.id IN (SELECT id FROM filtered_games ORDER BY game_date DESC LIMIT 10))
    OR ('${scope}' = 'opponent' AND LOWER(TRIM(fg.opponent_team)) = LOWER(TRIM('${escapedOpponent ?? ""}')))
  )
),
scoped_plays AS (
  SELECT lp.*, sg.game_playbook
  FROM logged_plays lp
  JOIN scoped_games sg
    ON sg.id = lp.game_session_id
  WHERE NOT (
    LOWER(TRIM(COALESCE(lp.play_name, ''))) = 'punt'
    OR LOWER(TRIM(COALESCE(lp.result_tag, ''))) = 'punt'
  )
),
typed_plays AS (
  SELECT
    sp.id,
    sp.game_session_id,
    sp.game_playbook,
    sp.formation,
    sp.play_name,
    cp.play_type
  FROM scoped_plays sp
  LEFT JOIN cfb26_plays cp
    ON LOWER(TRIM(cp.playbook)) = LOWER(TRIM(sp.game_playbook))
   AND LOWER(TRIM(cp.formation)) = LOWER(TRIM(sp.formation))
   AND LOWER(TRIM(cp.play_name)) = LOWER(TRIM(sp.play_name))
)
SELECT
  game_playbook,
  COUNT(*) AS total_plays,
  SUM(CASE WHEN play_type IS NULL THEN 1 ELSE 0 END) AS unclassified_plays
FROM typed_plays
GROUP BY game_playbook
ORDER BY total_plays DESC;
`.trim();

  console.info("[predictability] scope:", scope, "opponent:", opponent ?? "(none)");
  console.info(
    "[predictability] playbook source:",
    "Uses per-game COALESCE(offensive_playbook, my_playbook), not a hardcoded team value.",
  );
  console.info("[predictability] debug SQL (reference for LOWER join path):\n" + debugSql);

  const games = await fetchGamesOrdered(supabase);
  const pool = filterGameRowsByOffensivePlaybook(gamesWithOffensivePlaybookOnly(games), playbook);
  const gameIds = resolveFilteredGameIds(pool, scope, opponent);
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
  const typedPlays = attachPlayTypes(plays, gamesById, cfbTypes);
  const rawPlayTypeCounts = typedPlays.reduce<Record<string, number>>((acc, row) => {
    const key = row.rawType || "<empty>";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const otherPlayCounts = typedPlays.reduce<Record<string, { formation: string; play: string; count: number }>>((acc, row, idx) => {
    if (row.bucket !== "Other") return acc;
    const play = plays[idx];
    if (!play) return acc;
    const formation = play.formation?.trim() || "(unknown formation)";
    const playName = play.play_name?.trim() || "(unknown play)";
    const key = `${formation}\u0000${playName}`;
    const existing = acc[key];
    if (existing) {
      existing.count += 1;
      return acc;
    }
    acc[key] = { formation, play: playName, count: 1 };
    return acc;
  }, {});
  const otherPlays = Object.values(otherPlayCounts).sort((a, b) => b.count - a.count || a.formation.localeCompare(b.formation) || a.play.localeCompare(b.play));
  const classifiedBuckets = typedPlays.filter((row) => row.matched).map((row) => row.bucket);
  const counts = playTypeCounts(classifiedBuckets);
  const total = plays.length || 1;
  const unclassifiedCount = typedPlays.filter((row) => !row.matched).length;
  const classifiedCount = typedPlays.length - unclassifiedCount;
  const playbooksInScope = [...playbookCounts.keys()].sort((a, b) => a.localeCompare(b));
  console.info(
    `[Tendencies] Games: ${gameIds.length} | Playbooks: ${JSON.stringify(playbooksInScope)} | Total plays: ${plays.length} | Classified: ${classifiedCount} | Unclassified: ${unclassifiedCount}`,
  );
  console.info("[Tendencies] Play types found:", rawPlayTypeCounts);
  console.info("[Tendencies] Grouped play type counts:", counts);
  console.info('[Tendencies] "Other" plays:', otherPlays);
  type PlayTypeDistributionName = "Run" | "Pass" | "Play Action" | "Screen" | "RPO" | "Option" | "Other" | "Unclassified";
  type PlayTypeDistributionRow = { name: PlayTypeDistributionName; pct: number; count: number };
  const distributionNames = ["Run", "Pass", "Play Action", "Screen", "RPO", "Option", "Other"] as const;
  const classifiedDistributionRows: PlayTypeDistributionRow[] = distributionNames.map((name): PlayTypeDistributionRow => ({
    name,
    pct: Math.round(((counts[name] ?? 0) * 1000) / total) / 10,
    count: counts[name] ?? 0,
  }));
  const unclassifiedDistributionRows: PlayTypeDistributionRow[] =
    unclassifiedCount > 0
      ? [
          {
            name: "Unclassified",
            pct: Math.round((unclassifiedCount * 1000) / total) / 10,
            count: unclassifiedCount,
          },
        ]
      : [];
  const play_type_distribution: PlayTypeDistributionRow[] = [
    ...classifiedDistributionRows,
    ...unclassifiedDistributionRows,
  ].filter((row) => row.name !== "Unclassified" || row.count > 0);

  const buckets = typedPlays.map((x) => x.bucket);
  const scouting_report = scoutingReportRows(plays, buckets);
  const scouting_formation_report = scoutingFormationReportRows(plays, buckets);

  const motionStats = motionUsageStats(plays);
  const userMotionPct = motionStats.pct;
  const { motionPct: playbookMotionPct } = await motionStatsForPlaybook(supabase, dominantPlaybook);
  const underutilizing =
    Boolean(dominantPlaybook) && playbookMotionPct >= 10 && userMotionPct < playbookMotionPct - 5;
  const turnoverCount = plays.filter((p) => p.result_tag === "TURNOVER").length;
  const turnoverRate = plays.length > 0 ? Math.round((turnoverCount * 1000) / plays.length) / 10 : 0;
  const redZone = redZoneTdStats(plays);
  const thirdDown = thirdDownConvStats(plays);

  return NextResponse.json({
    play_type_distribution,
    scouting_report,
    scouting_formation_report,
    key_rates: {
      turnover: {
        pct: turnoverRate,
        turnovers: turnoverCount,
        total_plays: plays.length,
      },
      motion: {
        pct: userMotionPct,
        motion_plays: motionStats.motion_plays,
        total_plays: motionStats.total_plays,
        playbook_pct: playbookMotionPct,
        playbook_name: dominantPlaybook,
        underutilizing,
      },
      red_zone_td: {
        pct: redZone.pct,
        touchdowns: redZone.touchdowns,
        plays: redZone.plays,
      },
      third_down: {
        pct: thirdDown.pct,
        conversions: thirdDown.conversions,
        plays: thirdDown.plays,
      },
    },
    motion: {
      user_pct: userMotionPct,
      playbook_pct: playbookMotionPct,
      playbook_name: dominantPlaybook,
      underutilizing,
    },
    meta: {
      scope,
      opponent,
      playbook,
      game_count: gameIds.length,
      play_count: plays.length,
      turnover_count: turnoverCount,
      turnover_rate: turnoverRate,
    },
  });
}
