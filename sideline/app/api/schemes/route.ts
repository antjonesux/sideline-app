import {
  fetchAttachedCallSheets,
  replaceSchemeCallSheets,
  validateCallSheetInputs,
  validateOwnedCallSheets,
} from "@/lib/schemeApiHelpers";
import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import { createClient } from "@/lib/supabase/server";
import type { SchemeDetail, SchemeSummary } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

type SchemeRow = {
  id: string;
  name: string;
  description: string | null;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type JoinRow = {
  scheme_id: string;
  call_sheet_id: string;
  side_of_ball: "offense" | "defense";
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

function toSchemeSummary(
  row: SchemeRow,
  joins: JoinRow[],
  sheetNames: Map<string, string>,
): SchemeSummary {
  const offense = joins.find((j) => j.side_of_ball === "offense");
  const defense = joins.find((j) => j.side_of_ball === "defense");
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    note: row.note,
    offense_call_sheet_id: offense?.call_sheet_id ?? null,
    defense_call_sheet_id: defense?.call_sheet_id ?? null,
    offense_call_sheet_name: offense ? sheetNames.get(offense.call_sheet_id) ?? null : null,
    defense_call_sheet_name: defense ? sheetNames.get(defense.call_sheet_id) ?? null : null,
    updated_at: row.updated_at ?? row.created_at,
  };
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: schemes, error } = await supabase
    .from("schemes")
    .select("id, name, description, note, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("schemes GET:", error);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  const rows = (schemes ?? []) as SchemeRow[];
  if (rows.length === 0) {
    return NextResponse.json({ data: [] satisfies SchemeSummary[] });
  }

  const ids = rows.map((row) => row.id);
  const { data: joins, error: joinErr } = await supabase
    .from("scheme_call_sheets")
    .select("scheme_id, call_sheet_id, side_of_ball")
    .eq("user_id", user.id)
    .in("scheme_id", ids);

  if (joinErr) {
    console.error("scheme_call_sheets GET list:", joinErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  const joinsByScheme = new Map<string, JoinRow[]>();
  for (const join of (joins ?? []) as JoinRow[]) {
    const arr = joinsByScheme.get(join.scheme_id) ?? [];
    arr.push(join);
    joinsByScheme.set(join.scheme_id, arr);
  }

  const sheetIds = [...new Set((joins ?? []).map((j) => (j as JoinRow).call_sheet_id))];
  const sheetNames = new Map<string, string>();
  if (sheetIds.length > 0) {
    const { data: sheets, error: sheetErr } = await supabase
      .from("play_sheets")
      .select("id, name")
      .eq("user_id", user.id)
      .in("id", sheetIds);

    if (sheetErr) {
      console.error("schemes GET sheet names:", sheetErr);
      return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
    }

    for (const sheet of sheets ?? []) {
      sheetNames.set(sheet.id as string, sheet.name as string);
    }
  }

  const data = rows.map((row) => toSchemeSummary(row, joinsByScheme.get(row.id) ?? [], sheetNames));
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    name?: string;
    description?: string;
    note?: string;
    call_sheets?: { call_sheet_id?: string; side_of_ball?: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const validated = validateCallSheetInputs(body.call_sheets as Parameters<typeof validateCallSheetInputs>[0]);
  if (validated.error || !validated.normalized) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const owned = await validateOwnedCallSheets(supabase, user.id, validated.normalized);
  if (owned.error) {
    const status = owned.error === "Call sheet not found" ? 404 : 400;
    return NextResponse.json({ error: owned.error }, { status });
  }

  const description = typeof body.description === "string" ? body.description.trim() || null : null;
  const note = typeof body.note === "string" ? body.note.trim() || null : null;

  const { data: scheme, error: insErr } = await supabase
    .from("schemes")
    .insert({
      user_id: user.id,
      name,
      description,
      note,
    })
    .select("id, name, description, note, created_at, updated_at")
    .single();

  if (insErr || !scheme) {
    console.error("schemes insert:", insErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  const attach = await replaceSchemeCallSheets(supabase, user.id, scheme.id, validated.normalized);
  if (attach.error) {
    await supabase.from("schemes").delete().eq("id", scheme.id).eq("user_id", user.id);
    const status = attach.error.includes("only one") ? 409 : 400;
    return NextResponse.json({ error: attach.error }, { status });
  }

  const callSheets = await fetchAttachedCallSheets(supabase, user.id, scheme.id);
  return NextResponse.json({ data: toSchemeDetail(scheme as SchemeRow, callSheets) });
}
