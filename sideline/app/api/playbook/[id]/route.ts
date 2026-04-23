import { sheetCfb26Playbook } from "@/lib/playbookUtils";
import { createClient } from "@/lib/supabase/server";
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

export async function GET(_req: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const { data: sheet, error } = await supabase.from("play_sheets").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!sheet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ data: scenarios, error: scErr }, { data: allPlays, error: plErr }] = await Promise.all([
    supabase
      .from("play_sheet_scenarios")
      .select("id, scenario, scenario_order")
      .eq("play_sheet_id", id)
      .eq("user_id", user.id)
      .order("scenario_order", { ascending: true }),
    supabase
      .from("play_sheet_plays")
      .select("id, scenario_id, play_order, formation, play_name, script_note")
      .eq("user_id", user.id),
  ]);

  if (scErr) return NextResponse.json({ error: scErr.message }, { status: 400 });
  if (plErr) return NextResponse.json({ error: plErr.message }, { status: 400 });

  const scenarioIds = new Set((scenarios ?? []).map((s) => s.id));
  const playsByScenario = new Map<string, PlayRow[]>();
  for (const p of (allPlays ?? []) as PlayRow[]) {
    if (!scenarioIds.has(p.scenario_id)) continue;
    const arr = playsByScenario.get(p.scenario_id) ?? [];
    arr.push(p);
    playsByScenario.set(p.scenario_id, arr);
  }

  const normalized = (scenarios ?? []).map((s) => {
    const plays = (playsByScenario.get(s.id) ?? []).sort((a, b) => a.play_order - b.play_order);
    return {
      id: s.id,
      scenario: s.scenario,
      scenario_order: s.scenario_order,
      plays,
    };
  });

  return NextResponse.json({
    ...sheet,
    cfb26_display: sheetCfb26Playbook(sheet as { cfb26_playbook?: string | null; playbook: string }),
    scenarios: normalized,
  });
}

async function patchPlaySheet(req: NextRequest, id: string) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { name?: string; cfb26_playbook?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, string> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.cfb26_playbook === "string" && body.cfb26_playbook.trim()) {
    const pb = body.cfb26_playbook.trim();
    patch.cfb26_playbook = pb;
    patch.playbook = pb;
    const { data: schemeRow } = await supabase
      .from("team_offensive_playbooks")
      .select("scheme_style")
      .eq("playbook_name", pb)
      .limit(1)
      .maybeSingle();
    patch.scheme = (schemeRow?.scheme_style as string | undefined)?.trim() || "Multiple";
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from("play_sheets").update(patch).eq("id", id).eq("user_id", user.id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(data);
}

/** @deprecated Prefer PATCH — kept for older clients */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return patchPlaySheet(req, id);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return patchPlaySheet(req, id);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const { error } = await supabase.from("play_sheets").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
