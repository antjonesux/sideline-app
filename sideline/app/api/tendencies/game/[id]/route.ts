import { buildTendenciesGamePayload, type DriveWithPlays } from "@/lib/tendenciesGameBreakdown";
import { withNormalizedPlayName } from "@/lib/utils";
import { fetchCfbPlayTypeMap, playbookForGame, type GameRow } from "@/lib/tendenciesServer";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { data: game, error: gErr } = await supabase.from("game_sessions").select("*").eq("id", id).single();
  if (gErr || !game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  const { data: driveRows, error: dErr } = await supabase
    .from("drives")
    .select("*")
    .eq("game_session_id", id)
    .order("drive_number", { ascending: true });
  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

  const drives: DriveWithPlays[] = [];
  for (const d of driveRows ?? []) {
    const { data: plays } = await supabase
      .from("logged_plays")
      .select("id, game_session_id, drive_id, play_number, down, distance, formation, play_name, yards_gained, result_tag, scenario, is_success")
      .eq("drive_id", d.id)
      .order("play_number", { ascending: true });
    drives.push({
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
    });
  }

  const g = game as GameRow;
  const pb = playbookForGame(g);
  const cfbTypes = await fetchCfbPlayTypeMap(supabase, [pb]);
  const breakdown = buildTendenciesGamePayload(g, drives, cfbTypes);

  return NextResponse.json({
    game: g,
    drives,
    ...breakdown,
  });
}
