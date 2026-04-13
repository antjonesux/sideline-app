import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const playbook = req.nextUrl.searchParams.get("playbook");
  if (!playbook) return NextResponse.json({ formations: [] });

  const { data } = await supabase
    .from("cfb26_plays")
    .select("formation, play_name")
    .eq("playbook", playbook)
    .order("formation", { ascending: true })
    .order("play_name", { ascending: true });

  const formationMap = new Map<string, string[]>();
  for (const row of data ?? []) {
    const plays = formationMap.get(row.formation) ?? [];
    plays.push(row.play_name);
    formationMap.set(row.formation, plays);
  }

  const formations = Array.from(formationMap.entries()).map(([formation, plays]) => ({
    formation,
    plays,
  }));

  return NextResponse.json({ formations });
}
