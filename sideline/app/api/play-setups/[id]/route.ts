import { COULDNT_DELETE, COULDNT_FINISH_THAT, COULDNT_FIND_THAT } from "@/lib/coachCopy";
import {
  PLAY_SETUP_SELECT_COLUMNS,
  removeSetupStorageObject,
  toPlaySetup,
  validateSetupImagePath,
  validateSetupNotes,
  validateSetupTitle,
  type PlaySetupRow,
} from "@/lib/playSetupApi";
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

  const { id } = await ctx.params;
  if (!id.trim()) return NextResponse.json({ error: COULDNT_FIND_THAT }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { data: existing, error: fetchErr } = await supabase
    .from("play_setups")
    .select(PLAY_SETUP_SELECT_COLUMNS)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr) {
    console.error("play-setups PATCH fetch:", fetchErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }
  if (!existing) return NextResponse.json({ error: COULDNT_FIND_THAT }, { status: 404 });

  const existingRow = existing as PlaySetupRow;
  const patch: {
    title?: string;
    notes?: string;
    image_path?: string | null;
    updated_at: string;
  } = { updated_at: new Date().toISOString() };

  if (body.title !== undefined) {
    const titleCheck = validateSetupTitle(body.title);
    if ("error" in titleCheck) {
      return NextResponse.json({ error: titleCheck.error }, { status: 400 });
    }
    patch.title = titleCheck.title;
  }

  if (body.notes !== undefined) {
    const notesCheck = validateSetupNotes(body.notes);
    if ("error" in notesCheck) {
      return NextResponse.json({ error: notesCheck.error }, { status: 400 });
    }
    patch.notes = notesCheck.notes;
  }

  let previousImagePath: string | null = null;
  if (body.image_path !== undefined) {
    const imageCheck = validateSetupImagePath(user.id, id, body.image_path);
    if ("error" in imageCheck) {
      return NextResponse.json({ error: imageCheck.error }, { status: 400 });
    }
    patch.image_path = imageCheck.image_path;
    if (existingRow.image_path && existingRow.image_path !== imageCheck.image_path) {
      previousImagePath = existingRow.image_path;
    }
  }

  if (patch.title === undefined && patch.notes === undefined && patch.image_path === undefined) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data: row, error: updateErr } = await supabase
    .from("play_setups")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select(PLAY_SETUP_SELECT_COLUMNS)
    .single();

  if (updateErr || !row) {
    console.error("play-setups PATCH update:", updateErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  if (previousImagePath) {
    // Best-effort cleanup after successful row update; do not fail the request.
    await removeSetupStorageObject(supabase, previousImagePath);
  }

  const data = await toPlaySetup(supabase, row as PlaySetupRow);
  return NextResponse.json({ data });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!id.trim()) return NextResponse.json({ error: COULDNT_FIND_THAT }, { status: 404 });

  const { data: existing, error: fetchErr } = await supabase
    .from("play_setups")
    .select("id, image_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr) {
    console.error("play-setups DELETE fetch:", fetchErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }
  if (!existing) return NextResponse.json({ error: COULDNT_FIND_THAT }, { status: 404 });

  const imagePath = (existing as { image_path: string | null }).image_path;
  if (imagePath) {
    const removed = await removeSetupStorageObject(supabase, imagePath);
    if (removed.error) {
      return NextResponse.json({ error: COULDNT_DELETE }, { status: 400 });
    }
  }

  const { error: deleteErr } = await supabase
    .from("play_setups")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteErr) {
    console.error("play-setups DELETE:", deleteErr);
    return NextResponse.json({ error: COULDNT_DELETE }, { status: 400 });
  }

  return NextResponse.json({ data: { ok: true } });
}
