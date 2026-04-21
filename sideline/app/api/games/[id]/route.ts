import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { data, error } = await supabase.from("game_sessions").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const payload = await req.json();
  const { data, error } = await supabase.from("game_sessions").update(payload).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  return PUT(req, ctx);
}

export async function DELETE(_: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  // Defensive manual cascade to support environments where FK cascade is missing or drifted.
  const { error: playsError } = await supabase.from("logged_plays").delete().eq("game_session_id", id);
  if (playsError) return NextResponse.json({ error: playsError.message }, { status: 400 });

  const { error: drivesError } = await supabase.from("drives").delete().eq("game_session_id", id);
  if (drivesError) return NextResponse.json({ error: drivesError.message }, { status: 400 });

  const { error: gameError } = await supabase.from("game_sessions").delete().eq("id", id);
  if (gameError) return NextResponse.json({ error: gameError.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
