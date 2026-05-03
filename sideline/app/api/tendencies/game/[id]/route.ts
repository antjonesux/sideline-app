import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import { buildTendenciesGamePayload, type DriveWithPlays } from "@/lib/tendenciesGameBreakdown";
import { withNormalizedPlayName } from "@/lib/utils";
import { fetchCfbPlayTypeMap, playbookForGame, type GameRow } from "@/lib/tendenciesServer";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const [gameRes, driveRes] = await Promise.all([
    supabase.from("game_sessions").select("*").eq("id", id).eq("user_id", user.id).single(),
    supabase
      .from("drives")
      .select("*")
      .eq("game_session_id", id)
      .eq("user_id", user.id)
      .order("drive_number", { ascending: true }),
  ]);
  const { data: game, error: gErr } = gameRes;
  if (gErr || !game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  const { data: driveRows, error: dErr } = driveRes;
  if (dErr) {
    console.error("tendencies game drives:", dErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 500 });
  }

  const g = game as GameRow;
  const pb = playbookForGame(g);
  const driveList = driveRows ?? [];

  const [cfbTypes, playRows] = await Promise.all([
    fetchCfbPlayTypeMap(supabase, [pb]),
    Promise.all(
      driveList.map((d) =>
        supabase
          .from("logged_plays")
          .select(
            "id, game_session_id, drive_id, play_number, down, distance, formation, play_name, yards_gained, result_tag, scenario, is_success",
          )
          .eq("drive_id", d.id)
          .eq("user_id", user.id)
          .order("play_number", { ascending: true }),
      ),
    ),
  ]);

  const drives: DriveWithPlays[] = driveList.map((d, i) => {
    const { data: plays } = playRows[i] ?? { data: null };
    return {
      id: d.id,
      drive_number: d.drive_number,
      quarter: d.quarter,
      score_mine: d.score_mine,
      score_opponent: d.score_opponent,
      note: d.note,
      plays: ((plays ?? []) as DriveWithPlays["plays"])
        .map(withNormalizedPlayName)
        .filter((p) => {
          const playName = String(p.play_name ?? "").trim().toLowerCase();
          const resultTag = String(p.result_tag ?? "").trim().toLowerCase();
          return playName !== "punt" && resultTag !== "punt";
        }),
    };
  });

  const breakdown = buildTendenciesGamePayload(g, drives, cfbTypes);

  return NextResponse.json({
    game: g,
    drives,
    ...breakdown,
  });
}
