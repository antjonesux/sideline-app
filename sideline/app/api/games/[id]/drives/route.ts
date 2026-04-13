import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { data, error } = await supabase.from("drives").select("*").eq("game_session_id", id).order("drive_number", { ascending: true });
  if (error) return NextResponse.json([], { status: 200 });

  const withPlays = await Promise.all(
    (data ?? []).map(async (drive) => {
      const { data: plays } = await supabase.from("logged_plays").select("*").eq("drive_id", drive.id).order("play_number", { ascending: true });
      return { ...drive, plays: plays ?? [] };
    }),
  );

  return NextResponse.json(withPlays);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const payload = await req.json();
  const { data, error } = await supabase.from("drives").insert({ ...payload, game_session_id: id }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
