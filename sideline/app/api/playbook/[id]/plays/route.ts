import { aggregateLoggedPlays, buildSuggestions, comboKey } from "@/lib/loggedPlayStats";
import { isOpeningScript, scenarioMaxSlots } from "@/lib/playbookUtils";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

type PlayRow = {
  id: string;
  scenario_id: string;
  play_order: number;
  formation: string;
  play_name: string;
  script_note: string | null;
};

async function assertScenarioOnSheet(sheetId: string, scenarioId: string) {
  const { data, error } = await supabase
    .from("play_sheet_scenarios")
    .select("id, scenario, play_sheet_id")
    .eq("id", scenarioId)
    .eq("play_sheet_id", sheetId)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Scenario not found" };
  return { scenario: data };
}

async function assertPlayOnSheet(sheetId: string, playId: string) {
  const { data: play, error } = await supabase.from("play_sheet_plays").select("*").eq("id", playId).maybeSingle();
  if (error || !play) return { error: "Play not found" };

  const { data: sc, error: scErr } = await supabase
    .from("play_sheet_scenarios")
    .select("play_sheet_id, scenario")
    .eq("id", play.scenario_id)
    .maybeSingle();

  if (scErr || !sc || sc.play_sheet_id !== sheetId) return { error: "Play not found" };
  return { play: play as PlayRow, scenarioName: sc.scenario };
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id: sheetId } = await ctx.params;
  const scenarioName = req.nextUrl.searchParams.get("scenario")?.trim() ?? "";
  if (!scenarioName) {
    return NextResponse.json({ error: "scenario query parameter is required" }, { status: 400 });
  }

  const { data: scenarioRow, error: scErr } = await supabase
    .from("play_sheet_scenarios")
    .select("id, scenario")
    .eq("play_sheet_id", sheetId)
    .eq("scenario", scenarioName)
    .maybeSingle();

  if (scErr) return NextResponse.json({ error: scErr.message }, { status: 400 });
  if (!scenarioRow) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });

  const { data: plays, error: pErr } = await supabase
    .from("play_sheet_plays")
    .select("id, scenario_id, play_order, formation, play_name, script_note")
    .eq("scenario_id", scenarioRow.id)
    .order("play_order", { ascending: true });

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });

  const { data: logged, error: lErr } = await supabase
    .from("logged_plays")
    .select("formation, play_name, result_tag, yards_gained, is_success")
    .eq("scenario", scenarioName)
    .limit(25000);

  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 400 });

  const nonPuntLogged = (logged ?? []).filter((row) => {
    const playName = String(row.play_name ?? "").trim().toLowerCase();
    const resultTag = String((row as { result_tag?: string }).result_tag ?? "").trim().toLowerCase();
    return playName !== "punt" && resultTag !== "punt";
  });

  const { byCombo, byFormation, comboDisplay } = aggregateLoggedPlays(nonPuntLogged);

  const sheetKeys = new Set<string>();
  for (const p of plays ?? []) {
    sheetKeys.add(comboKey(p.formation, p.play_name));
  }

  const suggestions = buildSuggestions(byCombo, sheetKeys, comboDisplay, 3);

  const scenarioStats: Record<string, { uses: number; avg_yards: number; success_rate: number }> = {};
  for (const [k, v] of byCombo) scenarioStats[k] = v;

  const formationStats: Record<string, { uses: number; success_rate: number }> = {};
  for (const [k, v] of byFormation) formationStats[k] = v;

  return NextResponse.json({
    scenarioId: scenarioRow.id,
    scenario: scenarioName,
    plays: plays ?? [],
    scenarioStats,
    formationStats,
    suggestions,
  });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id: sheetId } = await ctx.params;
  let body: { scenarioId?: string; formation?: string; play_name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const scenarioId = String(body.scenarioId ?? "").trim();
  const formation = String(body.formation ?? "").trim();
  const play_name = String(body.play_name ?? "").trim();
  if (!scenarioId || !formation || !play_name) {
    return NextResponse.json({ error: "scenarioId, formation, and play_name are required" }, { status: 400 });
  }

  const sc = await assertScenarioOnSheet(sheetId, scenarioId);
  if ("error" in sc) return NextResponse.json({ error: sc.error }, { status: 404 });

  const max = scenarioMaxSlots(sc.scenario.scenario);
  const { count, error: cErr } = await supabase
    .from("play_sheet_plays")
    .select("id", { count: "exact", head: true })
    .eq("scenario_id", scenarioId);

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 });
  if ((count ?? 0) >= max) {
    return NextResponse.json({ error: "Scenario is at max capacity" }, { status: 400 });
  }

  const { data: dup } = await supabase
    .from("play_sheet_plays")
    .select("id")
    .eq("scenario_id", scenarioId)
    .eq("formation", formation)
    .eq("play_name", play_name)
    .maybeSingle();

  if (dup) {
    return NextResponse.json({ error: "This play is already on the sheet for this scenario" }, { status: 400 });
  }

  const { data: maxOrderRow } = await supabase
    .from("play_sheet_plays")
    .select("play_order")
    .eq("scenario_id", scenarioId)
    .order("play_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxOrderRow?.play_order ?? 0) + 1;

  const { data: row, error: insErr } = await supabase
    .from("play_sheet_plays")
    .insert({ scenario_id: scenarioId, play_order: nextOrder, formation, play_name })
    .select("id, scenario_id, play_order, formation, play_name, script_note")
    .single();

  if (insErr || !row) return NextResponse.json({ error: insErr?.message ?? "Insert failed" }, { status: 400 });

  await supabase.from("play_sheets").update({ updated_at: new Date().toISOString() }).eq("id", sheetId);

  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id: sheetId } = await ctx.params;
  const playId = req.nextUrl.searchParams.get("playId")?.trim() ?? "";
  if (!playId) return NextResponse.json({ error: "playId query parameter is required" }, { status: 400 });

  const chk = await assertPlayOnSheet(sheetId, playId);
  if ("error" in chk) return NextResponse.json({ error: chk.error }, { status: 404 });

  const { error } = await supabase.from("play_sheet_plays").delete().eq("id", playId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("play_sheets").update({ updated_at: new Date().toISOString() }).eq("id", sheetId);

  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id: sheetId } = await ctx.params;
  let body: {
    action?: string;
    scenarioId?: string;
    orderedPlayIds?: string[];
    playId?: string;
    script_note?: string | null;
    formation?: string;
    play_name?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action ?? "").trim();

  if (action === "reorder") {
    const scenarioId = String(body.scenarioId ?? "").trim();
    const orderedPlayIds = Array.isArray(body.orderedPlayIds) ? body.orderedPlayIds.map(String) : [];
    if (!scenarioId || orderedPlayIds.length === 0) {
      return NextResponse.json({ error: "scenarioId and orderedPlayIds are required" }, { status: 400 });
    }

    const sc = await assertScenarioOnSheet(sheetId, scenarioId);
    if ("error" in sc) return NextResponse.json({ error: sc.error }, { status: 404 });
    if (!isOpeningScript(sc.scenario.scenario)) {
      return NextResponse.json({ error: "Reorder is only allowed for Opening Script" }, { status: 400 });
    }

    const { data: existing, error: exErr } = await supabase
      .from("play_sheet_plays")
      .select("id")
      .eq("scenario_id", scenarioId);

    if (exErr) return NextResponse.json({ error: exErr.message }, { status: 400 });

    const valid = new Set((existing ?? []).map((r) => r.id));
    if (orderedPlayIds.length !== valid.size || !orderedPlayIds.every((id) => valid.has(id))) {
      return NextResponse.json({ error: "orderedPlayIds must include every play in the scenario exactly once" }, { status: 400 });
    }

    for (let i = 0; i < orderedPlayIds.length; i++) {
      const pid = orderedPlayIds[i];
      const { error: uErr } = await supabase.from("play_sheet_plays").update({ play_order: i + 1 }).eq("id", pid);
      if (uErr) return NextResponse.json({ error: uErr.message }, { status: 400 });
    }

    await supabase.from("play_sheets").update({ updated_at: new Date().toISOString() }).eq("id", sheetId);
    return NextResponse.json({ ok: true });
  }

  if (action === "script_note") {
    const playId = String(body.playId ?? "").trim();
    const note = body.script_note == null ? null : String(body.script_note).slice(0, 40);

    const chk = await assertPlayOnSheet(sheetId, playId);
    if ("error" in chk) return NextResponse.json({ error: chk.error }, { status: 404 });
    if (!isOpeningScript(chk.scenarioName)) {
      return NextResponse.json({ error: "Notes are only for Opening Script" }, { status: 400 });
    }

    const { error } = await supabase.from("play_sheet_plays").update({ script_note: note }).eq("id", playId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await supabase.from("play_sheets").update({ updated_at: new Date().toISOString() }).eq("id", sheetId);
    return NextResponse.json({ ok: true });
  }

  if (action === "swap") {
    const playId = String(body.playId ?? "").trim();
    const formation = String(body.formation ?? "").trim();
    const play_name = String(body.play_name ?? "").trim();
    if (!playId || !formation || !play_name) {
      return NextResponse.json({ error: "playId, formation, and play_name are required" }, { status: 400 });
    }

    const chk = await assertPlayOnSheet(sheetId, playId);
    if ("error" in chk) return NextResponse.json({ error: chk.error }, { status: 404 });

    const scenarioId = chk.play.scenario_id;

    const { data: conflict } = await supabase
      .from("play_sheet_plays")
      .select("id")
      .eq("scenario_id", scenarioId)
      .eq("formation", formation)
      .eq("play_name", play_name)
      .neq("id", playId)
      .maybeSingle();

    if (conflict) {
      return NextResponse.json({ error: "That play is already on the sheet for this scenario" }, { status: 400 });
    }

    const { error } = await supabase.from("play_sheet_plays").update({ formation, play_name }).eq("id", playId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await supabase.from("play_sheets").update({ updated_at: new Date().toISOString() }).eq("id", sheetId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
