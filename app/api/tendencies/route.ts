import { getSupabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ totals: { games: 0, successRate: 0, avgYards: 0 }, trend: [] });
  const { data, error } = await supabase.from("tracked_plays").select("result_tag,yards_gained,game_session_id,created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const plays = data ?? [];
  const successes = plays.filter((p) => p.result_tag === "FIRST_DOWN" || p.result_tag === "TOUCHDOWN").length;
  const avgYards = plays.length ? plays.reduce((acc, p) => acc + (p.yards_gained ?? 0), 0) / plays.length : 0;
  return NextResponse.json({
    totals: {
      games: new Set(plays.map((p) => p.game_session_id)).size,
      successRate: plays.length ? (successes / plays.length) * 100 : 0,
      avgYards,
    },
    trend: [],
  });
}
