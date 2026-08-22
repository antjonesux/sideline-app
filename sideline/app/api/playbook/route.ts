import { defaultSheetSituationsForSide, parseCatalogGameVersion, parseCatalogSideOfBall } from "@/lib/constants";
import { maybeSetActiveOnCreate, readActiveCallSheetId } from "@/lib/callSheetPrefs";
import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import { sheetPlaybookName } from "@/lib/playbookUtils";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type SheetRow = {
  id: string;
  name: string;
  playbook: string;
  game_version: string;
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

  const active_call_sheet_id = await readActiveCallSheetId(supabase, user.id);

  const { data: sheets, error } = await supabase
    .from("play_sheets")
    .select("id, name, playbook, game_version, scheme, updated_at, created_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("playbook GET sheets:", error);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  const list = (sheets ?? []) as SheetRow[];
  if (list.length === 0) {
    return NextResponse.json({ playbooks: [], active_call_sheet_id });
  }

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
      playbook: sheetPlaybookName(sheet),
      game_version: parseCatalogGameVersion(sheet.game_version),
      scheme: sheet.scheme?.trim() || "Multiple",
      scenario_filled: filled,
      scenario_total: sc.length,
      play_count: totalPlays,
      updated_at: sheet.updated_at ?? sheet.created_at,
    };
  });

  return NextResponse.json({ playbooks, active_call_sheet_id });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { name?: string; playbook?: string; game_version?: string; side_of_ball?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const playbook = String(body.playbook ?? "").trim();
  if (!name || !playbook) {
    return NextResponse.json({ error: "name and playbook are required" }, { status: 400 });
  }

  let sideOfBall = parseCatalogSideOfBall(body.side_of_ball);
  let gameVersion = parseCatalogGameVersion(body.game_version);

  const { data: catalogRows } = await supabase
    .from("playbooks")
    .select("side_of_ball, game_version")
    .eq("playbook", playbook)
    .not("playbook", "is", null)
    .limit(1);

  if (catalogRows?.[0]) {
    if (!sideOfBall) {
      sideOfBall = parseCatalogSideOfBall(catalogRows[0].side_of_ball as string | undefined) ?? "offense";
    }
    if (!body.game_version?.trim()) {
      gameVersion = parseCatalogGameVersion(catalogRows[0].game_version as string);
    }
  }
  if (!sideOfBall) sideOfBall = "offense";

  const { data: schemeRow } = await supabase
    .from("team_offensive_playbooks")
    .select("scheme_style")
    .eq("playbook_name", playbook)
    .limit(1)
    .maybeSingle();

  const scheme = (schemeRow?.scheme_style as string | undefined)?.trim() || "Multiple";

  const { data: sheet, error: insErr } = await supabase
    .from("play_sheets")
    .insert({
      user_id: user.id,
      name,
      playbook,
      game_version: gameVersion,
      scheme,
      is_active: false,
    })
    .select("id, name, playbook, game_version, scheme, updated_at, created_at")
    .single();

  if (insErr || !sheet) {
    console.error("play_sheets insert:", insErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  const defaultSituations = defaultSheetSituationsForSide(sideOfBall);
  const scenarioRows = defaultSituations.map((situation, index) => ({
    user_id: user.id,
    play_sheet_id: sheet.id,
    scenario: situation.scenario,
    description: situation.description,
    icon: situation.icon,
    color: situation.color,
    is_locked: situation.isLocked,
    scenario_order: index + 1,
  }));

  const { error: scInsErr } = await supabase.from("play_sheet_scenarios").insert(scenarioRows);
  if (scInsErr) {
    console.error("play_sheet_scenarios insert:", scInsErr);
    await supabase.from("play_sheets").delete().eq("id", sheet.id);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  await maybeSetActiveOnCreate(supabase, user.id, sheet.id);

  return NextResponse.json({ id: sheet.id });
}
