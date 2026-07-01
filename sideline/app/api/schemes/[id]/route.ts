import {
  fetchAttachedCallSheets,
  replaceSchemeCallSheets,
  validateCallSheetInputs,
  validateOwnedCallSheets,
} from "@/lib/schemeApiHelpers";
import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import { createClient } from "@/lib/supabase/server";
import type { SchemeDetail } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

type SchemeRow = {
  id: string;
  name: string;
  description: string | null;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function toSchemeDetail(row: SchemeRow, callSheets: Awaited<ReturnType<typeof fetchAttachedCallSheets>>): SchemeDetail {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    note: row.note,
    created_at: row.created_at,
    updated_at: row.updated_at,
    call_sheets: callSheets,
  };
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const { data: scheme, error } = await supabase
    .from("schemes")
    .select("id, name, description, note, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("schemes GET by id:", error);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }
  if (!scheme) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const callSheets = await fetchAttachedCallSheets(supabase, user.id, id);
  return NextResponse.json({ data: toSchemeDetail(scheme as SchemeRow, callSheets) });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  let body: {
    name?: string;
    description?: string | null;
    note?: string | null;
    call_sheets?: { call_sheet_id?: string; side_of_ball?: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, string | null> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (body.description !== undefined) {
    patch.description = typeof body.description === "string" ? body.description.trim() || null : null;
  }
  if (body.note !== undefined) {
    patch.note = typeof body.note === "string" ? body.note.trim() || null : null;
  }

  const hasCallSheets = body.call_sheets !== undefined;
  let normalizedCallSheets: ReturnType<typeof validateCallSheetInputs>["normalized"];

  if (hasCallSheets) {
    const validated = validateCallSheetInputs(body.call_sheets as Parameters<typeof validateCallSheetInputs>[0]);
    if (validated.error || !validated.normalized) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    const owned = await validateOwnedCallSheets(supabase, user.id, validated.normalized);
    if (owned.error) {
      const status = owned.error === "Call sheet not found" ? 404 : 400;
      return NextResponse.json({ error: owned.error }, { status });
    }
    normalizedCallSheets = validated.normalized;
  }

  if (Object.keys(patch).length === 0 && !hasCallSheets) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  if (Object.keys(patch).length > 0) {
    patch.updated_at = new Date().toISOString();
    const { data, error } = await supabase
      .from("schemes")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, name, description, note, created_at, updated_at")
      .maybeSingle();

    if (error) {
      console.error("schemes PATCH:", error);
      return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
    }
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  } else {
    const { data, error } = await supabase
      .from("schemes")
      .select("id, name, description, note, created_at, updated_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("schemes PATCH lookup:", error);
      return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
    }
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (hasCallSheets && normalizedCallSheets) {
    const attach = await replaceSchemeCallSheets(supabase, user.id, id, normalizedCallSheets);
    if (attach.error) {
      const status = attach.error.includes("only one") ? 409 : 400;
      return NextResponse.json({ error: attach.error }, { status });
    }
    await supabase
      .from("schemes")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
  }

  const { data: scheme, error: fetchErr } = await supabase
    .from("schemes")
    .select("id, name, description, note, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr || !scheme) {
    console.error("schemes PATCH refetch:", fetchErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  const callSheets = await fetchAttachedCallSheets(supabase, user.id, id);
  return NextResponse.json({ data: toSchemeDetail(scheme as SchemeRow, callSheets) });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const { error } = await supabase.from("schemes").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    console.error("schemes DELETE:", error);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
