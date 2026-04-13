import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { data: games, error } = await supabase.from("game_sessions").select("*").order("game_date", { ascending: false });
  if (error) return NextResponse.json([], { status: 200 });

  const enriched = await Promise.all(
    (games ?? []).map(async (game) => {
      const [{ count: drive_count }, { count: play_count }] = await Promise.all([
        supabase.from("drives").select("*", { count: "exact", head: true }).eq("game_session_id", game.id),
        supabase.from("logged_plays").select("*", { count: "exact", head: true }).eq("game_session_id", game.id),
      ]);
      return { ...game, drive_count: drive_count ?? 0, play_count: play_count ?? 0 };
    }),
  );

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const { data, error } = await supabase.from("game_sessions").insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
