import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import { aggregateLoggedPlays, buildSuggestions, comboKey } from "@/lib/loggedPlayStats";
import { resolveCfbDisplayPlayType } from "@/lib/playbook";
import { fetchCfbPlayTypeMap, playTypeLookupKey } from "@/lib/playTypeResolution";
import { normalizePlayName } from "@/lib/utils";
import { isOpeningScript, loggedPlayScenarioLabels, loggedPlayScenarioLabelsForSuggestions, scenarioMaxSlots } from "@/lib/playbookUtils";

import { normalizePlayNameForComparison } from "@/lib/utils/normalizePlayName";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
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

type PlayRowWithCfbType = PlayRow & { play_type: string | null };

async function assertSheetOwnership(sb: SupabaseClient, sheetId: string, userId: string) {
  const { data, error } = await sb
    .from("play_sheets")
    .select("id")
    .eq("id", sheetId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("assertSheetOwnership", error);
    return { error: COULDNT_FINISH_THAT };
  }
  if (!data) return { error: "Sheet not found" };
  return { sheet: data };
}

async function assertScenarioOnSheet(sb: SupabaseClient, sheetId: string, scenarioId: string, userId: string) {
  const { data, error } = await sb
    .from("play_sheet_scenarios")
    .select("id, scenario, play_sheet_id")
    .eq("id", scenarioId)
    .eq("play_sheet_id", sheetId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("assertScenarioOnSheet", error);
    return { error: COULDNT_FINISH_THAT };
  }
  if (!data) return { error: "Scenario not found" };
  return { scenario: data };
}

async function assertPlayOnSheet(sb: SupabaseClient, sheetId: string, playId: string, userId: string) {
  const { data: play, error } = await sb
    .from("play_sheet_plays")
    .select("*")
    .eq("id", playId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !play) return { error: "Play not found" };

  const { data: sc, error: scErr } = await sb
    .from("play_sheet_scenarios")
    .select("play_sheet_id, scenario")
    .eq("id", play.scenario_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (scErr || !sc || sc.play_sheet_id !== sheetId) return { error: "Play not found" };
  return { play: play as PlayRow, scenarioName: sc.scenario };
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sheetId } = await ctx.params;

  const ownership = await assertSheetOwnership(supabase, sheetId, user.id);
  if ("error" in ownership) return NextResponse.json({ error: ownership.error }, { status: 404 });

  const scenarioName = req.nextUrl.searchParams.get("scenario")?.trim() ?? "";
  if (!scenarioName) {
    return NextResponse.json({ error: "scenario query parameter is required" }, { status: 400 });
  }
  const slim = req.nextUrl.searchParams.get("slim") === "1";

  const { data: scenarioRow, error: scErr } = await supabase
    .from("play_sheet_scenarios")
    .select("id, scenario")
    .eq("play_sheet_id", sheetId)
    .eq("user_id", user.id)
    .eq("scenario", scenarioName)
    .maybeSingle();

  if (scErr) {
    console.error("playbook plays GET scenario row:", scErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }
  if (!scenarioRow) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });

  const { data: plays, error: pErr } = await supabase
    .from("play_sheet_plays")
    .select("id, scenario_id, play_order, formation, play_name, script_note")
    .eq("scenario_id", scenarioRow.id)
    .eq("user_id", user.id)
    .order("play_order", { ascending: true });

  if (pErr) {
    console.error("playbook plays GET plays:", pErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  const { data: sheetMeta, error: sheetMetaErr } = await supabase
    .from("play_sheets")
    .select("name, cfb26_playbook, playbook")
    .eq("id", sheetId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (sheetMetaErr) {
    console.error("playbook plays GET sheet meta:", sheetMetaErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  const cfbBook = String(sheetMeta?.cfb26_playbook ?? sheetMeta?.playbook ?? "").trim();
  const typeByKey = cfbBook ? await fetchCfbPlayTypeMap(supabase, [cfbBook]) : new Map<string, string>();

  const playsOut: PlayRowWithCfbType[] = (plays ?? []).map((p) => {
    const play_name = normalizePlayName(String(p.play_name ?? ""));
    const formation = String(p.formation ?? "").trim() || "Other";
    const key = cfbBook ? playTypeLookupKey(cfbBook, formation, play_name) : "";
    const play_type = key && typeByKey.has(key) ? (typeByKey.get(key) ?? null) : null;
    return {
      id: p.id,
      scenario_id: p.scenario_id,
      play_order: p.play_order,
      formation,
      play_name,
      script_note: p.script_note,
      play_type,
    };
  });

  if (slim) {
    return NextResponse.json({
      scenarioId: scenarioRow.id,
      scenario: scenarioName,
      sheetName: sheetMeta?.name ?? null,
      plays: playsOut,
    });
  }

  const exactLabels = loggedPlayScenarioLabels(scenarioName);
  const suggestionLabels = loggedPlayScenarioLabelsForSuggestions(scenarioName);
  const isPooled = suggestionLabels.length > exactLabels.length;

  const { data: sessions, error: sessErr } = await supabase
    .from("game_sessions")
    .select("id")
    .eq("play_sheet_id", sheetId)
    .eq("user_id", user.id)
    .limit(500);
  if (sessErr) {
    console.error("playbook plays GET sessions:", sessErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }
  const playbookSessionIds = (sessions ?? []).map((s) => s.id);

  if (playbookSessionIds.length === 0) {
    return NextResponse.json({
      scenarioId: scenarioRow.id,
      scenario: scenarioName,
      plays: playsOut,
      scenarioStats: {},
      formationStats: {},
      suggestions: [],
    });
  }

  const { data: logged, error: lErr } = await supabase
    .from("logged_plays")
    .select("formation, play_name, result_tag, yards_gained, down, distance, scenario")
    .eq("user_id", user.id)
    .in("scenario", suggestionLabels)
    .in("game_session_id", playbookSessionIds)
    .limit(25000);

  if (lErr) {
    console.error("playbook plays GET logged_plays:", lErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  const nonPuntLogged = (logged ?? [])
    .map((row) => ({
      ...row,
      play_name: normalizePlayName(String((row as { play_name?: string }).play_name ?? "")),
    }))
    .filter((row) => {
      const playName = String(row.play_name ?? "").trim().toLowerCase();
      const resultTag = String((row as { result_tag?: string }).result_tag ?? "").trim().toLowerCase();
      return playName !== "punt" && resultTag !== "punt";
    });

  const exactLabelSet = new Set(exactLabels.map((l) => l.toLowerCase()));
  const exactRows = nonPuntLogged.filter((r) =>
    exactLabelSet.has(String((r as { scenario?: string }).scenario ?? "").toLowerCase()),
  );

  const { byCombo, byFormation, comboDisplay } = aggregateLoggedPlays(exactRows);
  const allAgg = aggregateLoggedPlays(nonPuntLogged);

  const sheetKeys = new Set<string>();
  for (const p of playsOut) {
    sheetKeys.add(comboKey(p.formation, p.play_name));
  }

  const suggestionsRaw = buildSuggestions(allAgg.byCombo, sheetKeys, allAgg.comboDisplay, 3, isPooled ? byCombo : undefined);
  const suggestions = suggestionsRaw.map((s) => {
    const play_name = normalizePlayName(s.play_name);
    const formation = String(s.formation ?? "").trim() || "Other";
    const key = cfbBook ? playTypeLookupKey(cfbBook, formation, play_name) : "";
    const raw = key && typeByKey.has(key) ? (typeByKey.get(key) ?? null) : null;
    return { ...s, play_type: resolveCfbDisplayPlayType(play_name, raw) };
  });

  const scenarioStats: Record<string, { uses: number; avg_yards: number; success_rate: number }> = {};
  for (const [k, v] of byCombo) scenarioStats[k] = v;

  const formationStats: Record<string, { uses: number; success_rate: number }> = {};
  for (const [k, v] of byFormation) formationStats[k] = v;

  return NextResponse.json({
    scenarioId: scenarioRow.id,
    scenario: scenarioName,
    plays: playsOut,
    scenarioStats,
    formationStats,
    suggestions,
  });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sheetId } = await ctx.params;

  const ownership = await assertSheetOwnership(supabase, sheetId, user.id);
  if ("error" in ownership) return NextResponse.json({ error: ownership.error }, { status: 404 });

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

  const sc = await assertScenarioOnSheet(supabase, sheetId, scenarioId, user.id);
  if ("error" in sc) return NextResponse.json({ error: sc.error }, { status: 404 });

  const max = scenarioMaxSlots(sc.scenario.scenario);
  const { count, error: cErr } = await supabase
    .from("play_sheet_plays")
    .select("id", { count: "exact", head: true })
    .eq("scenario_id", scenarioId)
    .eq("user_id", user.id);

  if (cErr) {
    console.error("playbook plays POST count:", cErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }
  if ((count ?? 0) >= max) {
    return NextResponse.json({ error: "Scenario is at max capacity" }, { status: 400 });
  }

  const { data: existingPlays, error: existingErr } = await supabase
    .from("play_sheet_plays")
    .select("id, play_name")
    .eq("scenario_id", scenarioId)
    .eq("user_id", user.id)
    .eq("formation", formation);

  if (existingErr) {
    console.error("playbook plays POST existing:", existingErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  const incomingNormalized = normalizePlayNameForComparison(play_name);
  const duplicate = (existingPlays ?? []).find(
    (row) => normalizePlayNameForComparison(String(row.play_name ?? "")) === incomingNormalized,
  );
  if (duplicate) {
    return NextResponse.json(
      { error: `This play already exists in your plan (matched: ${duplicate.play_name})` },
      { status: 409 },
    );
  }

  const { data: maxOrderRow } = await supabase
    .from("play_sheet_plays")
    .select("play_order")
    .eq("scenario_id", scenarioId)
    .eq("user_id", user.id)
    .order("play_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxOrderRow?.play_order ?? 0) + 1;

  const { data: row, error: insErr } = await supabase
    .from("play_sheet_plays")
    .insert({ user_id: user.id, scenario_id: scenarioId, play_order: nextOrder, formation, play_name })
    .select("id, scenario_id, play_order, formation, play_name, script_note")
    .single();

  if (insErr || !row) {
    console.error("playbook plays POST insert:", insErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  await supabase.from("play_sheets").update({ updated_at: new Date().toISOString() }).eq("id", sheetId).eq("user_id", user.id);

  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sheetId } = await ctx.params;

  const ownership = await assertSheetOwnership(supabase, sheetId, user.id);
  if ("error" in ownership) return NextResponse.json({ error: ownership.error }, { status: 404 });

  const playId = req.nextUrl.searchParams.get("playId")?.trim() ?? "";
  if (!playId) return NextResponse.json({ error: "playId query parameter is required" }, { status: 400 });

  const chk = await assertPlayOnSheet(supabase, sheetId, playId, user.id);
  if ("error" in chk) return NextResponse.json({ error: chk.error }, { status: 404 });

  const { error } = await supabase.from("play_sheet_plays").delete().eq("id", playId).eq("user_id", user.id);
  if (error) {
    console.error("playbook plays DELETE:", error);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  await supabase.from("play_sheets").update({ updated_at: new Date().toISOString() }).eq("id", sheetId).eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sheetId } = await ctx.params;

  const ownership = await assertSheetOwnership(supabase, sheetId, user.id);
  if ("error" in ownership) return NextResponse.json({ error: ownership.error }, { status: 404 });

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

    const sc = await assertScenarioOnSheet(supabase, sheetId, scenarioId, user.id);
    if ("error" in sc) return NextResponse.json({ error: sc.error }, { status: 404 });
    const { data: existing, error: exErr } = await supabase
      .from("play_sheet_plays")
      .select("id")
      .eq("scenario_id", scenarioId)
      .eq("user_id", user.id);

    if (exErr) {
      console.error("playbook plays PUT reorder existing:", exErr);
      return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
    }

    const valid = new Set((existing ?? []).map((r) => r.id));
    if (orderedPlayIds.length !== valid.size || !orderedPlayIds.every((id) => valid.has(id))) {
      return NextResponse.json({ error: "orderedPlayIds must include every play in the scenario exactly once" }, { status: 400 });
    }

    for (let i = 0; i < orderedPlayIds.length; i++) {
      const pid = orderedPlayIds[i];
      const { error: uErr } = await supabase.from("play_sheet_plays").update({ play_order: i + 1 }).eq("id", pid).eq("user_id", user.id);
      if (uErr) {
        console.error("playbook plays PUT reorder update:", uErr);
        return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
      }
    }

    await supabase.from("play_sheets").update({ updated_at: new Date().toISOString() }).eq("id", sheetId).eq("user_id", user.id);
    return NextResponse.json({ ok: true });
  }

  if (action === "script_note") {
    const playId = String(body.playId ?? "").trim();
    const note = body.script_note == null ? null : String(body.script_note).slice(0, 40);

    const chk = await assertPlayOnSheet(supabase, sheetId, playId, user.id);
    if ("error" in chk) return NextResponse.json({ error: chk.error }, { status: 404 });
    if (!isOpeningScript(chk.scenarioName)) {
      return NextResponse.json({ error: "Notes are only for Opening Script" }, { status: 400 });
    }

    const { error } = await supabase.from("play_sheet_plays").update({ script_note: note }).eq("id", playId).eq("user_id", user.id);
    if (error) {
      console.error("playbook plays PUT script_note:", error);
      return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
    }

    await supabase.from("play_sheets").update({ updated_at: new Date().toISOString() }).eq("id", sheetId).eq("user_id", user.id);
    return NextResponse.json({ ok: true });
  }

  if (action === "swap") {
    const playId = String(body.playId ?? "").trim();
    const formation = String(body.formation ?? "").trim();
    const play_name = String(body.play_name ?? "").trim();
    if (!playId || !formation || !play_name) {
      return NextResponse.json({ error: "playId, formation, and play_name are required" }, { status: 400 });
    }

    const chk = await assertPlayOnSheet(supabase, sheetId, playId, user.id);
    if ("error" in chk) return NextResponse.json({ error: chk.error }, { status: 404 });

    const scenarioId = chk.play.scenario_id;

    const { data: scenarioPlays, error: scenarioErr } = await supabase
      .from("play_sheet_plays")
      .select("id, play_name")
      .eq("scenario_id", scenarioId)
      .eq("user_id", user.id)
      .eq("formation", formation)
      .neq("id", playId);

    if (scenarioErr) {
      console.error("playbook plays PUT swap scenario plays:", scenarioErr);
      return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
    }
    const incomingNormalized = normalizePlayNameForComparison(play_name);
    const conflict = (scenarioPlays ?? []).find(
      (row) => normalizePlayNameForComparison(String(row.play_name ?? "")) === incomingNormalized,
    );
    if (conflict) {
      return NextResponse.json(
        { error: `This play already exists in your plan (matched: ${conflict.play_name})` },
        { status: 409 },
      );
    }

    const { error } = await supabase.from("play_sheet_plays").update({ formation, play_name }).eq("id", playId).eq("user_id", user.id);
    if (error) {
      console.error("playbook plays PUT swap update:", error);
      return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
    }

    await supabase.from("play_sheets").update({ updated_at: new Date().toISOString() }).eq("id", sheetId).eq("user_id", user.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
