import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import { isGoToPlaysSituation, type SituationRow } from "@/lib/situationApiHelpers";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sheetId } = await ctx.params;

  const { data: sheet, error: sheetErr } = await supabase
    .from("play_sheets")
    .select("id")
    .eq("id", sheetId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (sheetErr) {
    console.error("situations reorder sheet:", sheetErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }
  if (!sheet) return NextResponse.json({ error: "Sheet not found" }, { status: 404 });

  let body: { situationIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const situationIds = Array.isArray(body.situationIds) ? body.situationIds.map(String) : [];
  if (situationIds.length === 0) {
    return NextResponse.json({ error: "situationIds is required" }, { status: 400 });
  }

  const { data: existing, error: exErr } = await supabase
    .from("play_sheet_scenarios")
    .select("id, scenario, is_locked")
    .eq("play_sheet_id", sheetId)
    .eq("user_id", user.id);

  if (exErr) {
    console.error("situations reorder existing:", exErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  const rows = (existing ?? []) as Pick<SituationRow, "id" | "scenario" | "is_locked">[];
  const valid = new Set(rows.map((r) => r.id));
  if (situationIds.length !== valid.size || !situationIds.every((id) => valid.has(id))) {
    return NextResponse.json(
      { error: "situationIds must include every situation on the sheet exactly once" },
      { status: 400 },
    );
  }

  const firstId = situationIds[0];
  const firstRow = rows.find((r) => r.id === firstId);
  if (!firstRow || !isGoToPlaysSituation(firstRow)) {
    return NextResponse.json({ error: "Go-to Plays must remain first" }, { status: 400 });
  }

  for (let i = 0; i < situationIds.length; i++) {
    const { error: uErr } = await supabase
      .from("play_sheet_scenarios")
      .update({ scenario_order: i + 1 })
      .eq("id", situationIds[i])
      .eq("user_id", user.id);
    if (uErr) {
      console.error("situations reorder update:", uErr);
      return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
    }
  }

  await supabase
    .from("play_sheets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sheetId)
    .eq("user_id", user.id);

  return NextResponse.json({ data: { reordered: true } });
}
