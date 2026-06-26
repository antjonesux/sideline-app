import { upsertActiveCallSheetId } from "@/lib/callSheetPrefs";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { call_sheet_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const callSheetId = String(body.call_sheet_id ?? "").trim();
  if (!callSheetId) {
    return NextResponse.json({ error: "call_sheet_id is required" }, { status: 400 });
  }

  const { error } = await upsertActiveCallSheetId(supabase, user.id, callSheetId);
  if (error === "Not found") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  return NextResponse.json({ active_call_sheet_id: callSheetId });
}
