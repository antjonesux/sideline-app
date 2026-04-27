import { CFB_CATALOG_GAME_VERSION } from "@/lib/constants";
import { playbookIlikeExactPattern } from "@/lib/playbookIlikeExact";
import { supabase } from "@/lib/supabase";
import { normalizePlayName } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const playbook = req.nextUrl.searchParams.get("playbook");
  if (!playbook) return NextResponse.json({ formations: [] });

  const { data } = await supabase
    .from("cfb26_plays")
    .select("formation, play_name")
    .eq("game_version", CFB_CATALOG_GAME_VERSION)
    .ilike("playbook", playbookIlikeExactPattern(playbook))
    .order("formation", { ascending: true })
    .order("play_name", { ascending: true });

  const formationMap = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    const fn = row.formation ?? "";
    const canon = normalizePlayName(String(row.play_name ?? ""));
    if (!formationMap.has(fn)) formationMap.set(fn, new Set());
    formationMap.get(fn)!.add(canon);
  }

  const formations = Array.from(formationMap.entries()).map(([formation, set]) => ({
    formation,
    plays: [...set].sort((a, b) => a.localeCompare(b)),
  }));

  return NextResponse.json({ formations });
}
