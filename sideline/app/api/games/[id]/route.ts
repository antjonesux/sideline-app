import { COULDNT_FINISH_THAT, COULDNT_FIND_THAT } from "@/lib/coachCopy";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const { data, error } = await supabase.from("game_sessions").select("*").eq("id", id).eq("user_id", user.id).single();
  if (error) {
    console.error("game_sessions GET:", error);
    return NextResponse.json({ error: COULDNT_FIND_THAT }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const payload = await req.json();

  delete payload.user_id;
  delete payload.id;

  if ("play_sheet_id" in payload) {
    const rawSheetId = typeof payload.play_sheet_id === "string" ? payload.play_sheet_id.trim() : "";
    if (rawSheetId) {
      const { data: sheet } = await supabase
        .from("play_sheets")
        .select("id, playbook")
        .eq("id", rawSheetId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!sheet) {
        return NextResponse.json({ error: "Play sheet not found" }, { status: 400 });
      }
      const incomingPb = typeof payload.offensive_playbook === "string" ? payload.offensive_playbook.trim() : "";
      let gamePb = incomingPb.toLowerCase();
      if (!gamePb) {
        const { data: game } = await supabase
          .from("game_sessions")
          .select("offensive_playbook, my_playbook")
          .eq("id", id)
          .eq("user_id", user.id)
          .maybeSingle();
        gamePb = ((game?.offensive_playbook ?? game?.my_playbook) ?? "").trim().toLowerCase();
      }
      const sheetPb = (sheet.playbook ?? "").trim().toLowerCase();
      if (gamePb && sheetPb !== gamePb) {
        return NextResponse.json({ error: "Play sheet does not match the game playbook" }, { status: 400 });
      }
      payload.play_sheet_id = sheet.id;
    } else {
      payload.play_sheet_id = null;
    }
  }

  const { data, error } = await supabase.from("game_sessions").update(payload).eq("id", id).eq("user_id", user.id).select("*").single();
  if (error) {
    console.error("game_sessions PUT:", error);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  return PUT(req, ctx);
}

export async function DELETE(_: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const { error: playsError } = await supabase.from("logged_plays").delete().eq("game_session_id", id).eq("user_id", user.id);
  if (playsError) {
    console.error("delete logged_plays:", playsError);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  const { error: drivesError } = await supabase.from("drives").delete().eq("game_session_id", id).eq("user_id", user.id);
  if (drivesError) {
    console.error("delete drives:", drivesError);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  const { error: gameError } = await supabase.from("game_sessions").delete().eq("id", id).eq("user_id", user.id);
  if (gameError) {
    console.error("delete game_sessions:", gameError);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
