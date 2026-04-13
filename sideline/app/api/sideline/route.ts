import { deriveFieldZone, deriveScenario } from "@/lib/derivePlayContext";
import { sortByHashPerformance } from "@/lib/hashSort";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

type HashStat = { hash: string; is_success: boolean; yards_gained: number | null };
type PlayWithStats = {
  id: string;
  play_order: number;
  formation: string;
  play_name: string;
  play_count: number;
  avg_yards: number;
  success_rate: number;
  hashStats: HashStat[];
};

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const down = Number(q.get("down") ?? "1");
  const distance = Number(q.get("distance") ?? "10");
  const side = (q.get("side") ?? "OWN") as "OWN" | "OPP";
  const yardLine = Number(q.get("yard_line") ?? "25");
  const hash = q.get("hash") ?? "MIDDLE";

  const fieldZone = deriveFieldZone(yardLine, side);
  const scenario = deriveScenario(down, distance, fieldZone);

  const { data: sheet } = await supabase.from("play_sheets").select("id").eq("is_active", true).maybeSingle();
  if (!sheet) return NextResponse.json({ scenario, plays: [] });

  const { data: scenarioRow } = await supabase.from("play_sheet_scenarios").select("id").eq("play_sheet_id", sheet.id).eq("scenario", scenario).maybeSingle();
  if (!scenarioRow) return NextResponse.json({ scenario, plays: [] });

  const { data: plays } = await supabase.from("play_sheet_plays").select("*").eq("scenario_id", scenarioRow.id).order("play_order", { ascending: true });

  const withStats: PlayWithStats[] = await Promise.all((plays ?? []).map(async (play) => {
    const { data: stats } = await supabase.from("logged_plays").select("yards_gained, is_success, hash").eq("scenario", scenario).eq("formation", play.formation).eq("play_name", play.play_name);
    const typedStats = (stats ?? []) as HashStat[];
    const count = typedStats.length;
    const avg = count ? typedStats.reduce((acc, s) => acc + (s.yards_gained ?? 0), 0) / count : 0;
    const success = count ? Math.round((typedStats.filter((s) => s.is_success).length / count) * 100) : 0;
    return { ...play, play_count: count, avg_yards: avg, success_rate: success, hashStats: typedStats };
  }));

  const sorted = sortByHashPerformance(withStats, hash, withStats.map((play) => {
    const hashRows = play.hashStats.filter((s: HashStat) => s.hash === hash);
    const hashSuccess = hashRows.length > 0 ? Math.round((hashRows.filter((s: HashStat) => s.is_success).length / hashRows.length) * 100) : -1;
    return { formation: play.formation, play_name: play.play_name, hash, success_rate: hashSuccess };
  }).filter((s) => s.success_rate >= 0));

  return NextResponse.json({ scenario, plays: sorted });
}
