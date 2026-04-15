import { SCENARIOS } from "@/lib/constants";
import { sheetCfb26Playbook } from "@/lib/playbookUtils";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

type SheetRow = {
  id: string;
  name: string;
  playbook: string;
  cfb26_playbook: string | null;
  scheme: string;
  updated_at: string | null;
  created_at: string | null;
};

type ScenarioEmbed = {
  id: string;
  play_sheet_id: string;
  scenario: string;
  scenario_order: number;
  play_sheet_plays: { id: string }[] | null;
};

export async function GET() {
  const { data: sheets, error } = await supabase
    .from("play_sheets")
    .select("id, name, playbook, cfb26_playbook, scheme, updated_at, created_at")
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const list = (sheets ?? []) as SheetRow[];
  if (list.length === 0) return NextResponse.json({ playbooks: [] });

  const ids = list.map((s) => s.id);
  const { data: scenarios, error: scErr } = await supabase
    .from("play_sheet_scenarios")
    .select("id, play_sheet_id, scenario, scenario_order, play_sheet_plays(id)")
    .in("play_sheet_id", ids);

  if (scErr) return NextResponse.json({ error: scErr.message }, { status: 400 });

  const bySheet = new Map<string, ScenarioEmbed[]>();
  for (const row of (scenarios ?? []) as ScenarioEmbed[]) {
    const arr = bySheet.get(row.play_sheet_id) ?? [];
    arr.push(row);
    bySheet.set(row.play_sheet_id, arr);
  }

  const playbooks = list.map((sheet) => {
    const sc = (bySheet.get(sheet.id) ?? []).sort((a, b) => a.scenario_order - b.scenario_order);
    let filled = 0;
    let totalPlays = 0;
    for (const s of sc) {
      const n = s.play_sheet_plays?.length ?? 0;
      totalPlays += n;
      if (n > 0) filled += 1;
    }
    return {
      id: sheet.id,
      name: sheet.name,
      cfb26_playbook: sheetCfb26Playbook(sheet),
      scenario_filled: filled,
      scenario_total: SCENARIOS.length,
      play_count: totalPlays,
      updated_at: sheet.updated_at ?? sheet.created_at,
    };
  });

  return NextResponse.json({ playbooks });
}

export async function POST(req: NextRequest) {
  let body: { name?: string; cfb26_playbook?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const cfb26_playbook = String(body.cfb26_playbook ?? "").trim();
  if (!name || !cfb26_playbook) {
    return NextResponse.json({ error: "name and cfb26_playbook are required" }, { status: 400 });
  }

  const { data: schemeRow } = await supabase
    .from("team_offensive_playbooks")
    .select("scheme_style")
    .eq("playbook_name", cfb26_playbook)
    .limit(1)
    .maybeSingle();

  const scheme = (schemeRow?.scheme_style as string | undefined)?.trim() || "Multiple";

  const { data: sheet, error: insErr } = await supabase
    .from("play_sheets")
    .insert({
      name,
      playbook: cfb26_playbook,
      cfb26_playbook,
      scheme,
      is_active: false,
    })
    .select("id, name, playbook, cfb26_playbook, scheme, updated_at, created_at")
    .single();

  if (insErr || !sheet) {
    return NextResponse.json({ error: insErr?.message ?? "Could not create playbook" }, { status: 400 });
  }

  const scenarioRows = SCENARIOS.map((scenario, index) => ({
    play_sheet_id: sheet.id,
    scenario,
    scenario_order: index + 1,
  }));

  const { error: scInsErr } = await supabase.from("play_sheet_scenarios").insert(scenarioRows);
  if (scInsErr) {
    await supabase.from("play_sheets").delete().eq("id", sheet.id);
    return NextResponse.json({ error: scInsErr.message }, { status: 400 });
  }

  return NextResponse.json({ id: sheet.id });
}
