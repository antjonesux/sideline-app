import { COULDNT_FINISH_THAT, PLAY_SETUP_CAP } from "@/lib/coachCopy";
import { assertPlayInCatalogForSetup } from "@/lib/playbooks/assertPlayInCatalogPlaybook";
import {
  PLAY_SETUP_SELECT_COLUMNS,
  parsePlayIdentityFields,
  parsePlayIdentityFromSearchParams,
  playKeyForIdentity,
  toPlaySetup,
  validateSetupNotes,
  validateSetupTitle,
  type PlaySetupRow,
} from "@/lib/playSetupApi";
import { PLAY_SETUP_MAX_PER_PLAY } from "@/lib/playSetupKey";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = parsePlayIdentityFromSearchParams(req.nextUrl.searchParams);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const playKey = playKeyForIdentity(parsed.identity);

  const { data: rows, error } = await supabase
    .from("play_setups")
    .select(PLAY_SETUP_SELECT_COLUMNS)
    .eq("user_id", user.id)
    .eq("play_key", playKey)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("play-setups GET:", error);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  const data = await Promise.all(
    ((rows ?? []) as PlaySetupRow[]).map((row) => toPlaySetup(supabase, row)),
  );
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
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

  const titleCheck = validateSetupTitle(body.title);
  if ("error" in titleCheck) {
    return NextResponse.json({ error: titleCheck.error }, { status: 400 });
  }

  const notesCheck = validateSetupNotes(body.notes);
  if ("error" in notesCheck) {
    return NextResponse.json({ error: notesCheck.error }, { status: 400 });
  }

  const catalog = await assertPlayInCatalogForSetup(supabase, parsed.identity);
  if ("error" in catalog) {
    return NextResponse.json({ error: catalog.error }, { status: 400 });
  }

  const playKey = playKeyForIdentity(parsed.identity);

  const { count, error: countErr } = await supabase
    .from("play_setups")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("play_key", playKey);

  if (countErr) {
    console.error("play-setups POST count:", countErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }
  if ((count ?? 0) >= PLAY_SETUP_MAX_PER_PLAY) {
    return NextResponse.json({ error: PLAY_SETUP_CAP }, { status: 400 });
  }

  const { data: maxOrderRow, error: maxErr } = await supabase
    .from("play_setups")
    .select("sort_order")
    .eq("user_id", user.id)
    .eq("play_key", playKey)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxErr) {
    console.error("play-setups POST max order:", maxErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  const nextOrder = (maxOrderRow?.sort_order ?? -1) + 1;
  const now = new Date().toISOString();

  const { data: row, error: insertErr } = await supabase
    .from("play_setups")
    .insert({
      user_id: user.id,
      game_version: parsed.identity.game_version,
      side_of_ball: parsed.identity.side_of_ball,
      playbook: parsed.identity.playbook,
      formation: parsed.identity.formation,
      play_name: parsed.identity.play_name,
      play_key: playKey,
      title: titleCheck.title,
      notes: notesCheck.notes,
      sort_order: nextOrder,
      created_at: now,
      updated_at: now,
    })
    .select(PLAY_SETUP_SELECT_COLUMNS)
    .single();

  if (insertErr || !row) {
    console.error("play-setups POST insert:", insertErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  const data = await toPlaySetup(supabase, row as PlaySetupRow);
  return NextResponse.json({ data }, { status: 201 });
}
