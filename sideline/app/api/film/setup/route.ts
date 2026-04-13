import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const [offenseRes, defenseRes] = await Promise.all([
    supabase.from("team_offensive_playbooks").select("team_name, playbook_name, scheme_style").order("team_name", { ascending: true }),
    supabase.from("team_defensive_schemes").select("team_name, defensive_scheme").order("team_name", { ascending: true }),
  ]);

  return NextResponse.json({
    offensiveTeams: offenseRes.data ?? [],
    defensiveTeams: defenseRes.data ?? [],
  });
}
