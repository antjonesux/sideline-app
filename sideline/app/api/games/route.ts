import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { persistSession: false },
});

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
  const body = await req.json();
  const startedAtIso = new Date().toISOString();
  const gameDate = startedAtIso.slice(0, 10);

  const { data, error } = await supabase
    .from("game_sessions")
    .insert({
      my_playbook: body.my_playbook,
      my_scheme: body.my_scheme,
      offensive_playbook: body.offensive_playbook ?? body.my_playbook,
      opponent_team: body.opponent_team,
      opponent_scheme: body.opponent_scheme,
      game_date: gameDate,
      my_score: body.my_score,
      opponent_score: body.opponent_score,
      result: body.result,
      quarter_started_logging: body.quarter_started_logging,
      import_source: "live",
    })
    .select()
    .single();

  if (error) {
    console.error("Game insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
