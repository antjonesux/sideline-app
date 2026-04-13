import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { getPublicSupabaseCredentials } from "@/lib/supabase";

export async function GET() {
  const creds = getPublicSupabaseCredentials();
  if (!creds) {
    return NextResponse.json(
      { error: "Missing Supabase URL or anon key for server requests." },
      { status: 500 },
    );
  }

  const supabase = createClient(creds.url, creds.anonKey, { auth: { persistSession: false } });

  const [{ data: offensiveTeams, error: offError }, { data: defensiveTeams, error: defError }] =
    await Promise.all([
      supabase
        .from("team_offensive_playbooks")
        .select("team_name, playbook_name, scheme_style")
        .order("team_name", { ascending: true }),
      supabase
        .from("team_defensive_schemes")
        .select("team_name, defensive_scheme")
        .order("team_name", { ascending: true }),
    ]);

  if (offError || defError) {
    const err = offError ?? defError;
    console.error("Supabase error (film/setup):", err);
    return NextResponse.json(
      { error: "Failed to load teams", details: err },
      { status: 500 },
    );
  }

  return NextResponse.json({
    offensiveTeams: offensiveTeams ?? [],
    defensiveTeams: defensiveTeams ?? [],
  });
}
