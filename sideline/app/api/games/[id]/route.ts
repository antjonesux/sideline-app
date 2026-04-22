import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { data, error } = await supabase.from("game_sessions").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const payload = await req.json();

  if ("play_sheet_id" in payload) {
    const rawSheetId = typeof payload.play_sheet_id === "string" ? payload.play_sheet_id.trim() : "";
    if (rawSheetId) {
      const { data: sheet } = await supabase
        .from("play_sheets")
        .select("id, cfb26_playbook, playbook")
        .eq("id", rawSheetId)
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
          .maybeSingle();
        gamePb = ((game?.offensive_playbook ?? game?.my_playbook) ?? "").trim().toLowerCase();
      }
      const sheetPb = (sheet.cfb26_playbook ?? sheet.playbook ?? "").trim().toLowerCase();
      if (gamePb && sheetPb !== gamePb) {
        return NextResponse.json({ error: "Play sheet does not match the game playbook" }, { status: 400 });
      }
      payload.play_sheet_id = sheet.id;
    } else {
      payload.play_sheet_id = null;
    }
  }

  const { data, error } = await supabase.from("game_sessions").update(payload).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  return PUT(req, ctx);
}

export async function DELETE(_: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  // Defensive manual cascade to support environments where FK cascade is missing or drifted.
  const { error: playsError } = await supabase.from("logged_plays").delete().eq("game_session_id", id);
  if (playsError) return NextResponse.json({ error: playsError.message }, { status: 400 });

  const { error: drivesError } = await supabase.from("drives").delete().eq("game_session_id", id);
  if (drivesError) return NextResponse.json({ error: drivesError.message }, { status: 400 });

  const { error: gameError } = await supabase.from("game_sessions").delete().eq("id", id);
  if (gameError) return NextResponse.json({ error: gameError.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
