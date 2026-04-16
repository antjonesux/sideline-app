import { supabase } from "@/lib/supabase";
import { sortFormationTypes } from "@/lib/playbooks/formation-types";
import { NextRequest, NextResponse } from "next/server";

function sanitizeIlikeTerm(raw: string): string {
  return raw.replace(/%/g, "").replace(/,/g, "");
}

export async function GET(req: NextRequest) {
  const playbook = req.nextUrl.searchParams.get("playbook");
  const formation = req.nextUrl.searchParams.get("formation");
  const searchRaw = req.nextUrl.searchParams.get("search")?.trim() ?? "";
  if (!playbook) {
    return NextResponse.json({ error: "playbook query parameter is required" }, { status: 400 });
  }

  if (formation) {
    const { data, error } = await supabase
      .from("cfb26_plays")
      .select("play_name, is_new_in_26")
      .eq("playbook", playbook)
      .eq("formation", formation)
      .order("play_name", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ plays: data ?? [] });
  }

  if (searchRaw.length >= 2) {
    const term = sanitizeIlikeTerm(searchRaw);
    const pattern = `%${term}%`.replace(/"/g, '""');
    const { data, error } = await supabase
      .from("cfb26_plays")
      .select("formation, play_name, formation_type, is_new_in_26")
      .eq("playbook", playbook)
      .or(`play_name.ilike."${pattern}",formation.ilike."${pattern}"`)
      .order("formation", { ascending: true })
      .order("play_name", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = data ?? [];
    const groupedMap = new Map<string, typeof rows>();
    for (const play of rows) {
      const f = play.formation?.trim() || "Other";
      if (!groupedMap.has(f)) groupedMap.set(f, []);
      groupedMap.get(f)!.push(play);
    }

    const grouped = Array.from(groupedMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([formationName, plays]) => ({ formation: formationName, plays }));

    return NextResponse.json({ grouped });
  }

  const { data, error } = await supabase
    .from("cfb26_plays")
    .select("formation, formation_type")
    .eq("playbook", playbook);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const byType = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    const t = row.formation_type?.trim() || "Other";
    const f = row.formation?.trim();
    if (!f) continue;
    if (!byType.has(t)) byType.set(t, new Set());
    byType.get(t)!.add(f);
  }

  const groups = Array.from(byType.entries())
    .sort(([ta], [tb]) => sortFormationTypes(ta, tb))
    .map(([formation_type, set]) => ({
      formation_type,
      formations: Array.from(set).sort((a, b) => a.localeCompare(b)),
    }));

  return NextResponse.json({ groups });
}
