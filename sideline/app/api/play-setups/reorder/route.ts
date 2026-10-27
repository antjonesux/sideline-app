import { COULDNT_FINISH_THAT, PLAY_SETUP_REORDER_MISMATCH } from "@/lib/coachCopy";
import { parsePlayIdentityFields, playKeyForIdentity } from "@/lib/playSetupApi";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parsePlayIdentityFields(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const orderedIds = Array.isArray(body.ordered_ids)
    ? body.ordered_ids.map((id) => String(id).trim()).filter(Boolean)
    : [];
  if (orderedIds.length === 0) {
    return NextResponse.json({ error: "ordered_ids is required" }, { status: 400 });
  }

  const playKey = playKeyForIdentity(parsed.identity);

  const { data: existing, error: exErr } = await supabase
    .from("play_setups")
    .select("id")
    .eq("user_id", user.id)
    .eq("play_key", playKey);

  if (exErr) {
    console.error("play-setups reorder existing:", exErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  const valid = new Set((existing ?? []).map((r) => r.id as string));
  if (orderedIds.length !== valid.size || !orderedIds.every((id) => valid.has(id))) {
    return NextResponse.json({ error: PLAY_SETUP_REORDER_MISMATCH }, { status: 400 });
  }

  const now = new Date().toISOString();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error: uErr } = await supabase
      .from("play_setups")
      .update({ sort_order: i, updated_at: now })
      .eq("id", orderedIds[i])
      .eq("user_id", user.id)
      .eq("play_key", playKey);
    if (uErr) {
      console.error("play-setups reorder update:", uErr);
      return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
    }
  }

  return NextResponse.json({ data: { ok: true } });
}
