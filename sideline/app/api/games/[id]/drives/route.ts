import { supabase } from "@/lib/supabase";
import { withNormalizedPlayName } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";

type Ctx = { params: Promise<{ id: string }> };

function jsonFromPostgrestError(err: PostgrestError, status = 500) {
  return NextResponse.json(
    {
      error: err.message,
      message: err.message,
      details: err.details ?? null,
      hint: err.hint ?? null,
      code: err.code ?? null,
    },
    { status },
  );
}

export async function GET(_: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { data, error } = await supabase.from("drives").select("*").eq("game_session_id", id).order("drive_number", { ascending: true });
  if (error) return NextResponse.json([], { status: 200 });

  const withPlays = await Promise.all(
    (data ?? []).map(async (drive) => {
      const { data: plays } = await supabase.from("logged_plays").select("*").eq("drive_id", drive.id).order("play_number", { ascending: true });
      return { ...drive, plays: (plays ?? []).map(withNormalizedPlayName) };
    }),
  );

  return NextResponse.json(withPlays);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const { count, error: countError } = await supabase
    .from("drives")
    .select("*", { count: "exact", head: true })
    .eq("game_session_id", id);

  if (countError) {
    console.error("Drive count error:", countError);
    return jsonFromPostgrestError(countError);
  }

  const drive_number = (count ?? 0) + 1;

  const { data, error } = await supabase
    .from("drives")
    .insert({
      game_session_id: id,
      drive_number,
      quarter: typeof body.quarter === "number" ? body.quarter : 1,
      starting_down: typeof body.starting_down === "number" ? body.starting_down : 1,
      starting_distance: typeof body.starting_distance === "number" ? body.starting_distance : 10,
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
    console.error("Drive insert error:", error);
    return jsonFromPostgrestError(error);
  }

  return NextResponse.json(data);
}
