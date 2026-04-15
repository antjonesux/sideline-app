import { sheetCfb26Playbook } from "@/lib/playbookUtils";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

type PlayRow = {
  id: string;
  play_order: number;
  formation: string;
  play_name: string;
  script_note: string | null;
};

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  const { data: sheet, error } = await supabase.from("play_sheets").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!sheet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: scenarios, error: scErr } = await supabase
    .from("play_sheet_scenarios")
    .select("id, scenario, scenario_order, play_sheet_plays(*)")
    .eq("play_sheet_id", id)
    .order("scenario_order", { ascending: true });

  if (scErr) return NextResponse.json({ error: scErr.message }, { status: 400 });

  const normalized = (scenarios ?? []).map((s) => {
    const plays = (((s as { play_sheet_plays?: PlayRow[] }).play_sheet_plays ?? []) as PlayRow[]).sort(
      (a, b) => a.play_order - b.play_order,
    );
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

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
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
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from("play_sheets").update(patch).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { error } = await supabase.from("play_sheets").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
