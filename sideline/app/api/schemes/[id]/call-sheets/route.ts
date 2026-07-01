import { parseCatalogSideOfBall } from "@/lib/constants";
import {
  assertSchemeOwnership,
  countSchemeCallSheets,
  fetchAttachedCallSheets,
  validateCallSheetInputs,
  validateOwnedCallSheets,
} from "@/lib/schemeApiHelpers";
import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: schemeId } = await ctx.params;

  const owned = await assertSchemeOwnership(supabase, schemeId, user.id);
  if (owned.error) {
    const status = owned.error === "Not found" ? 404 : 400;
    return NextResponse.json({ error: owned.error }, { status });
  }

  let body: { call_sheet_id?: string; side_of_ball?: string; replace?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const replace = body.replace === true;

  const validated = validateCallSheetInputs([{
    call_sheet_id: body.call_sheet_id ?? "",
    side_of_ball: (body.side_of_ball ?? "") as "offense" | "defense",
  }]);
  if (validated.error || !validated.normalized?.[0]) {
    return NextResponse.json({ error: validated.error ?? "call_sheet_id and side_of_ball are required" }, { status: 400 });
  }

  const entry = validated.normalized[0];
  const sheetCheck = await validateOwnedCallSheets(supabase, user.id, [entry]);
  if (sheetCheck.error) {
    const status = sheetCheck.error === "Call sheet not found" ? 404 : 400;
    return NextResponse.json({ error: sheetCheck.error }, { status });
  }

  const { data: existingSide, error: sideErr } = await supabase
    .from("scheme_call_sheets")
    .select("call_sheet_id")
    .eq("scheme_id", schemeId)
    .eq("user_id", user.id)
    .eq("side_of_ball", entry.side_of_ball)
    .maybeSingle();

  if (sideErr) {
    console.error("scheme_call_sheets side lookup:", sideErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  if (existingSide?.call_sheet_id === entry.call_sheet_id) {
    const callSheets = await fetchAttachedCallSheets(supabase, user.id, schemeId);
    return NextResponse.json({ data: { call_sheets: callSheets } });
  }

  if (existingSide && !replace) {
    return NextResponse.json(
      { error: "A scheme can have only one offensive and one defensive call sheet", code: "side_occupied" },
      { status: 409 },
    );
  }

  if (existingSide && replace) {
    const { error: updateErr } = await supabase
      .from("scheme_call_sheets")
      .update({ call_sheet_id: entry.call_sheet_id })
      .eq("scheme_id", schemeId)
      .eq("user_id", user.id)
      .eq("side_of_ball", entry.side_of_ball);

    if (updateErr) {
      console.error("scheme_call_sheets replace:", updateErr);
      if (updateErr.code === "23505") {
        return NextResponse.json(
          { error: "Each call sheet can only be attached once" },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
    }

    await supabase
      .from("schemes")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", schemeId)
      .eq("user_id", user.id);

    const callSheets = await fetchAttachedCallSheets(supabase, user.id, schemeId);
    return NextResponse.json({ data: { call_sheets: callSheets } });
  }

  const { error: insErr } = await supabase.from("scheme_call_sheets").insert({
    scheme_id: schemeId,
    call_sheet_id: entry.call_sheet_id,
    side_of_ball: entry.side_of_ball,
    user_id: user.id,
  });

  if (insErr) {
    console.error("scheme_call_sheets attach:", insErr);
    if (insErr.code === "23505") {
      return NextResponse.json(
        { error: "A scheme can have only one offensive and one defensive call sheet" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  await supabase
    .from("schemes")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", schemeId)
    .eq("user_id", user.id);

  const callSheets = await fetchAttachedCallSheets(supabase, user.id, schemeId);
  return NextResponse.json({ data: { call_sheets: callSheets } });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: schemeId } = await ctx.params;

  const owned = await assertSchemeOwnership(supabase, schemeId, user.id);
  if (owned.error) {
    const status = owned.error === "Not found" ? 404 : 400;
    return NextResponse.json({ error: owned.error }, { status });
  }

  const side = parseCatalogSideOfBall(req.nextUrl.searchParams.get("side_of_ball"));
  if (!side) {
    return NextResponse.json({ error: "side_of_ball is required" }, { status: 400 });
  }

  const total = await countSchemeCallSheets(supabase, user.id, schemeId);
  if (total <= 1) {
    return NextResponse.json({ error: "At least one call sheet is required" }, { status: 400 });
  }

  const { data: removed, error: delErr } = await supabase
    .from("scheme_call_sheets")
    .delete()
    .eq("scheme_id", schemeId)
    .eq("user_id", user.id)
    .eq("side_of_ball", side)
    .select("call_sheet_id")
    .maybeSingle();

  if (delErr) {
    console.error("scheme_call_sheets detach:", delErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }
  if (!removed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await supabase
    .from("schemes")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", schemeId)
    .eq("user_id", user.id);

  const callSheets = await fetchAttachedCallSheets(supabase, user.id, schemeId);
  return NextResponse.json({ data: { call_sheets: callSheets } });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: schemeId } = await ctx.params;

  const owned = await assertSchemeOwnership(supabase, schemeId, user.id);
  if (owned.error) {
    const status = owned.error === "Not found" ? 404 : 400;
    return NextResponse.json({ error: owned.error }, { status });
  }

  let body: { call_sheets?: { call_sheet_id?: string; side_of_ball?: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validated = validateCallSheetInputs(body.call_sheets as Parameters<typeof validateCallSheetInputs>[0]);
  if (validated.error || !validated.normalized) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const sheetCheck = await validateOwnedCallSheets(supabase, user.id, validated.normalized);
  if (sheetCheck.error) {
    const status = sheetCheck.error === "Call sheet not found" ? 404 : 400;
    return NextResponse.json({ error: sheetCheck.error }, { status });
  }

  const { error: deleteErr } = await supabase
    .from("scheme_call_sheets")
    .delete()
    .eq("scheme_id", schemeId)
    .eq("user_id", user.id);

  if (deleteErr) {
    console.error("scheme_call_sheets replace delete:", deleteErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  const insertRows = validated.normalized.map((entry) => ({
    scheme_id: schemeId,
    call_sheet_id: entry.call_sheet_id,
    side_of_ball: entry.side_of_ball,
    user_id: user.id,
  }));

  const { error: insertErr } = await supabase.from("scheme_call_sheets").insert(insertRows);
  if (insertErr) {
    console.error("scheme_call_sheets replace insert:", insertErr);
    if (insertErr.code === "23505") {
      return NextResponse.json(
        { error: "A scheme can have only one offensive and one defensive call sheet" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  await supabase
    .from("schemes")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", schemeId)
    .eq("user_id", user.id);

  const callSheets = await fetchAttachedCallSheets(supabase, user.id, schemeId);
  return NextResponse.json({ data: { call_sheets: callSheets } });
}
