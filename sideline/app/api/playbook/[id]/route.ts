import { parseCatalogGameVersion } from "@/lib/constants";
import { reassignActiveCallSheetAfterDelete, wasActiveCallSheet } from "@/lib/callSheetPrefs";
import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import { sheetPlaybookName } from "@/lib/playbookUtils";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
  if (error) {
    console.error("play_sheets GET by id:", error);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }
  if (!sheet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ data: scenarios, error: scErr }, { data: allPlays, error: plErr }] = await Promise.all([
    supabase
      .from("play_sheet_scenarios")
      .select("id, scenario, scenario_order, description, icon, color, is_locked")
      .eq("play_sheet_id", id)
      .eq("user_id", user.id)
      .order("scenario_order", { ascending: true }),
    supabase
      .from("play_sheet_plays")
      .select("id, scenario_id, play_order, formation, play_name, script_note")
      .eq("user_id", user.id),
  ]);

  if (scErr) {
    console.error("play_sheet_scenarios GET:", scErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }
  if (plErr) {
    console.error("play_sheet_plays GET:", plErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

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
      description: s.description ?? "",
      icon: s.icon,
      color: s.color ?? "blue",
      is_locked: Boolean(s.is_locked),
      plays,
    };
  });

  return NextResponse.json({
    ...sheet,
    playbook_display: sheetPlaybookName(sheet as { playbook: string }),
    scenarios: normalized,
  });
}

async function patchPlaySheet(req: NextRequest, id: string) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { name?: string; playbook?: string; game_version?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, string> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.game_version === "string" && body.game_version.trim()) {
    patch.game_version = parseCatalogGameVersion(body.game_version);
  }
  if (typeof body.playbook === "string" && body.playbook.trim()) {
    const pb = body.playbook.trim();
    patch.playbook = pb;
    if (!patch.game_version) {
      const { data: catalogRow } = await supabase
        .from("playbooks")
        .select("game_version")
        .eq("playbook", pb)
        .not("playbook", "is", null)
        .limit(1)
        .maybeSingle();
      if (catalogRow?.game_version) {
        patch.game_version = parseCatalogGameVersion(catalogRow.game_version as string);
      }
    }
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
  if (error) {
    console.error("play_sheets PATCH:", error);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }
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

  const deletedWasActive = await wasActiveCallSheet(supabase, user.id, id);

  const { error } = await supabase.from("play_sheets").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    console.error("play_sheets DELETE:", error);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  if (deletedWasActive) {
    await reassignActiveCallSheetAfterDelete(supabase, user.id);
  }

  return NextResponse.json({ ok: true });
}
