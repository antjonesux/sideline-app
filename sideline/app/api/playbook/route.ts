import { SCENARIOS } from "@/lib/constants";
import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import { sheetCfb26Playbook } from "@/lib/playbookUtils";
import { createClient } from "@/lib/supabase/server";
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

type ScenarioRow = {
  id: string;
  play_sheet_id: string;
  scenario: string;
  scenario_order: number;
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: sheets, error } = await supabase
    .from("play_sheets")
    .select("id, name, playbook, cfb26_playbook, scheme, updated_at, created_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("playbook GET sheets:", error);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  const list = (sheets ?? []) as SheetRow[];
  if (list.length === 0) return NextResponse.json({ playbooks: [] });

  const ids = list.map((s) => s.id);
  const [{ data: scenarios, error: scErr }, { data: plays, error: plErr }] = await Promise.all([
    supabase
      .from("play_sheet_scenarios")
      .select("id, play_sheet_id, scenario, scenario_order")
      .eq("user_id", user.id)
      .in("play_sheet_id", ids),
    supabase
      .from("play_sheet_plays")
      .select("id, scenario_id")
      .eq("user_id", user.id),
  ]);

  if (scErr) {
    console.error("playbook GET scenarios:", scErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }
  if (plErr) {
    console.error("playbook GET plays:", plErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  const playCountByScenario = new Map<string, number>();
  for (const p of (plays ?? []) as { id: string; scenario_id: string }[]) {
    playCountByScenario.set(p.scenario_id, (playCountByScenario.get(p.scenario_id) ?? 0) + 1);
  }

  const bySheet = new Map<string, ScenarioRow[]>();
  for (const row of (scenarios ?? []) as ScenarioRow[]) {
    const arr = bySheet.get(row.play_sheet_id) ?? [];
    arr.push(row);
    bySheet.set(row.play_sheet_id, arr);
  }

  const playbooks = list.map((sheet) => {
    const sc = (bySheet.get(sheet.id) ?? []).sort((a, b) => a.scenario_order - b.scenario_order);
    let filled = 0;
    let totalPlays = 0;
    for (const s of sc) {
      const n = playCountByScenario.get(s.id) ?? 0;
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
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      user_id: user.id,
      name,
      playbook: cfb26_playbook,
      cfb26_playbook,
      scheme,
      is_active: false,
    })
    .select("id, name, playbook, cfb26_playbook, scheme, updated_at, created_at")
    .single();

  if (insErr || !sheet) {
    console.error("play_sheets insert:", insErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  const scenarioRows = SCENARIOS.map((scenario, index) => ({
    user_id: user.id,
    play_sheet_id: sheet.id,
    scenario,
    scenario_order: index + 1,
  }));

  const { error: scInsErr } = await supabase.from("play_sheet_scenarios").insert(scenarioRows);
  if (scInsErr) {
    console.error("play_sheet_scenarios insert:", scInsErr);
    await supabase.from("play_sheets").delete().eq("id", sheet.id);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  return NextResponse.json({ id: sheet.id });
}
