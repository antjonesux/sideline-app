import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import {
  isValidPresetColor,
  isValidPresetIcon,
  mapSituationRow,
  MAX_SITUATIONS_PER_SHEET,
  normalizeSituationName,
  situationSelectColumns,
  type SituationRow,
} from "@/lib/situationApiHelpers";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

async function assertSheetOwnership(sheetId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("play_sheets")
    .select("id")
    .eq("id", sheetId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("situations POST assertSheetOwnership:", error);
    return { error: COULDNT_FINISH_THAT, status: 400 as const };
  }
  if (!data) return { error: "Sheet not found", status: 404 as const };
  return { supabase };
}

async function nameTaken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sheetId: string,
  userId: string,
  name: string,
  excludeId?: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("play_sheet_scenarios")
    .select("id, scenario")
    .eq("play_sheet_id", sheetId)
    .eq("user_id", userId);
  if (error) {
    console.error("situations nameTaken:", error);
    return true;
  }
  const lower = name.toLowerCase();
  return (data ?? []).some(
    (row) => row.id !== excludeId && String(row.scenario).toLowerCase() === lower,
  );
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sheetId } = await ctx.params;
  const ownership = await assertSheetOwnership(sheetId, user.id);
  if ("error" in ownership) {
    return NextResponse.json({ error: ownership.error }, { status: ownership.status });
  }

  let body: { name?: string; description?: string; icon?: string | null; color?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = normalizeSituationName(String(body.name ?? ""));
  const description = String(body.description ?? "").trim();
  const color = String(body.color ?? "").trim();
  const icon = body.icon == null || body.icon === "" ? null : String(body.icon).trim();

  if (!name || name.length > 30) {
    return NextResponse.json({ error: "Name is required (max 30 characters)" }, { status: 400 });
  }
  if (!description || description.length > 60) {
    return NextResponse.json({ error: "Description is required (max 60 characters)" }, { status: 400 });
  }
  if (!isValidPresetColor(color)) {
    return NextResponse.json({ error: "Invalid color" }, { status: 400 });
  }
  if (!isValidPresetIcon(icon)) {
    return NextResponse.json({ error: "Invalid icon" }, { status: 400 });
  }

  const { count, error: countErr } = await ownership.supabase
    .from("play_sheet_scenarios")
    .select("id", { count: "exact", head: true })
    .eq("play_sheet_id", sheetId)
    .eq("user_id", user.id);

  if (countErr) {
    console.error("situations POST count:", countErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }
  if ((count ?? 0) >= MAX_SITUATIONS_PER_SHEET) {
    return NextResponse.json({ error: "Maximum situations reached" }, { status: 400 });
  }

  if (await nameTaken(ownership.supabase, sheetId, user.id, name)) {
    return NextResponse.json({ error: "A situation with this name already exists" }, { status: 409 });
  }

  const { data: maxOrderRow } = await ownership.supabase
    .from("play_sheet_scenarios")
    .select("scenario_order")
    .eq("play_sheet_id", sheetId)
    .eq("user_id", user.id)
    .order("scenario_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxOrderRow?.scenario_order ?? 0) + 1;

  const { data: row, error: insErr } = await ownership.supabase
    .from("play_sheet_scenarios")
    .insert({
      user_id: user.id,
      play_sheet_id: sheetId,
      scenario: name,
      description,
      icon,
      color,
      is_locked: false,
      scenario_order: nextOrder,
    })
    .select(situationSelectColumns())
    .single();

  if (insErr || !row) {
    console.error("situations POST insert:", insErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  await ownership.supabase
    .from("play_sheets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sheetId)
    .eq("user_id", user.id);

  return NextResponse.json({ data: { situation: mapSituationRow(row as unknown as SituationRow) } });
}
