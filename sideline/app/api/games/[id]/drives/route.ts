import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import { loadCfbPlayTypeMapForPlaybooks, playbookForGame, storedPlayTypeFromMap, type GameRow } from "@/lib/playTypeResolution";
import { createClient } from "@/lib/supabase/server";
import { withNormalizedPlayName } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";

type Ctx = { params: Promise<{ id: string }> };

function jsonFromPostgrestError(context: string, err: PostgrestError, status = 500) {
  console.error(context, err);
  return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status });
}

export async function GET(_: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const [drivesRes, gameRes] = await Promise.all([
    supabase
      .from("drives")
      .select("*")
      .eq("game_session_id", id)
      .eq("user_id", user.id)
      .order("drive_number", { ascending: true }),
    supabase
      .from("game_sessions")
      .select("id, my_playbook, offensive_playbook")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  const { data, error } = drivesRes;
  if (error) return NextResponse.json([], { status: 200 });

  const { data: gameSession } = gameRes;
  const drivesList = data ?? [];
  const pb = gameSession ? playbookForGame(gameSession as GameRow) : "";

  const [typeMap, playRows] = await Promise.all([
    loadCfbPlayTypeMapForPlaybooks(supabase, pb ? [pb] : []),
    Promise.all(
      drivesList.map((drive) =>
        supabase
          .from("logged_plays")
          .select("*")
          .eq("drive_id", drive.id)
          .eq("user_id", user.id)
          .order("play_number", { ascending: true }),
      ),
    ),
  ]);

  const withPlays = drivesList.map((drive, i) => {
    const { data: plays } = playRows[i] ?? { data: null };
    return {
      ...drive,
      plays: (plays ?? []).map((p) => {
        const normalized = withNormalizedPlayName(p);
        return {
          ...normalized,
          play_type: storedPlayTypeFromMap(
            pb,
            normalized.formation,
            normalized.play_name,
            typeMap,
            (normalized as { play_type?: string | null }).play_type,
          ),
        };
      }),
    };
  });

  return NextResponse.json(withPlays);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const { data: game } = await supabase.from("game_sessions").select("id").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const { count, error: countError } = await supabase
    .from("drives")
    .select("*", { count: "exact", head: true })
    .eq("game_session_id", id)
    .eq("user_id", user.id);

  if (countError) {
    return jsonFromPostgrestError("Drive count error:", countError);
  }

  const drive_number = (count ?? 0) + 1;

  const sideRaw = typeof body.side_of_ball === "string" ? body.side_of_ball.trim() : "";
  const side_of_ball = sideRaw === "defense" ? "defense" : "offense";

  const { data, error } = await supabase
    .from("drives")
    .insert({
      user_id: user.id,
      game_session_id: id,
      drive_number,
      side_of_ball,
      quarter: typeof body.quarter === "number" ? body.quarter : 1,
      starting_down: typeof body.starting_down === "number" ? body.starting_down : 1,
      starting_distance: typeof body.starting_distance === "number" ? body.starting_distance : 10,
      is_inches: body.is_inches === true || body.is_inches === "true",
      starting_absolute_yard: typeof body.starting_absolute_yard === "number" ? body.starting_absolute_yard : null,
      time_remaining: typeof body.time_remaining === "string" ? body.time_remaining : null,
      starting_yard_line: typeof body.starting_yard_line === "number" ? body.starting_yard_line : null,
      starting_side: body.starting_side === "OWN" || body.starting_side === "OPP" ? body.starting_side : "OWN",
      score_mine: typeof body.score_mine === "number" ? body.score_mine : 0,
      score_opponent: typeof body.score_opponent === "number" ? body.score_opponent : 0,
      note: typeof body.note === "string" ? body.note : null,
    })
    .select("*")
    .single();

  if (error) {
    return jsonFromPostgrestError("Drive insert error:", error);
  }

  return NextResponse.json(data);
}
