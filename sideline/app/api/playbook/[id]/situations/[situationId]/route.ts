import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import {
  isGoToPlaysSituation,
  isValidPresetColor,
  isValidPresetIcon,
  mapSituationRow,
  normalizeSituationName,
  situationSelectColumns,
  type SituationRow,
} from "@/lib/situationApiHelpers";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string; situationId: string }> };

async function loadSituation(sheetId: string, situationId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("play_sheet_scenarios")
    .select(situationSelectColumns())
    .eq("id", situationId)
    .eq("play_sheet_id", sheetId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("situation PATCH load:", error);
    return { error: COULDNT_FINISH_THAT, status: 400 as const };
  }
  if (!data) return { error: "Situation not found", status: 404 as const };
  return { supabase, situation: data as unknown as SituationRow };
}

async function nameTaken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sheetId: string,
  userId: string,
  name: string,
  excludeId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("play_sheet_scenarios")
    .select("id, scenario")
    .eq("play_sheet_id", sheetId)
    .eq("user_id", userId);
  if (error) return true;
  const lower = name.toLowerCase();
  return (data ?? []).some(
    (row) => row.id !== excludeId && String(row.scenario).toLowerCase() === lower,
  );
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sheetId, situationId } = await ctx.params;
  const loaded = await loadSituation(sheetId, situationId, user.id);
  if ("error" in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.status });
  }

  if (isGoToPlaysSituation(loaded.situation)) {
    return NextResponse.json({ error: "This situation cannot be edited" }, { status: 403 });
  }

  let body: { name?: string; description?: string; icon?: string | null; color?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, string | null | boolean> = {};

  if (body.name !== undefined) {
    const name = normalizeSituationName(String(body.name));
    if (!name || name.length > 30) {
      return NextResponse.json({ error: "Name is required (max 30 characters)" }, { status: 400 });
    }
    if (await nameTaken(loaded.supabase, sheetId, user.id, name, situationId)) {
      return NextResponse.json({ error: "A situation with this name already exists" }, { status: 409 });
    }
    patch.scenario = name;
  }

  if (body.description !== undefined) {
    const description = String(body.description).trim();
    if (!description || description.length > 60) {
      return NextResponse.json({ error: "Description is required (max 60 characters)" }, { status: 400 });
    }
    patch.description = description;
  }

  if (body.color !== undefined) {
    const color = String(body.color).trim();
    if (!isValidPresetColor(color)) {
      return NextResponse.json({ error: "Invalid color" }, { status: 400 });
    }
    patch.color = color;
  }

  if (body.icon !== undefined) {
    const icon = body.icon == null || body.icon === "" ? null : String(body.icon).trim();
    if (!isValidPresetIcon(icon)) {
      return NextResponse.json({ error: "Invalid icon" }, { status: 400 });
    }
    patch.icon = icon;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const { data: row, error: updErr } = await loaded.supabase
    .from("play_sheet_scenarios")
    .update(patch)
    .eq("id", situationId)
    .eq("user_id", user.id)
    .select(situationSelectColumns())
    .single();

  if (updErr || !row) {
    console.error("situation PATCH update:", updErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  await loaded.supabase
    .from("play_sheets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sheetId)
    .eq("user_id", user.id);

  return NextResponse.json({ data: { situation: mapSituationRow(row as unknown as SituationRow) } });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sheetId, situationId } = await ctx.params;
  const loaded = await loadSituation(sheetId, situationId, user.id);
  if ("error" in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.status });
  }

  if (isGoToPlaysSituation(loaded.situation)) {
    return NextResponse.json({ error: "This situation cannot be edited" }, { status: 403 });
  }

  const { error: delErr } = await loaded.supabase
    .from("play_sheet_scenarios")
    .delete()
    .eq("id", situationId)
    .eq("user_id", user.id);

  if (delErr) {
    console.error("situation DELETE:", delErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  await loaded.supabase
    .from("play_sheets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sheetId)
    .eq("user_id", user.id);

  return NextResponse.json({ data: { deleted: true } });
}
