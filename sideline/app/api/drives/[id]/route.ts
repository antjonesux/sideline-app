import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

function toIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v).replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function toInt(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  const n = parseInt(String(v ?? "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function toBool(v: unknown): boolean {
  return v === true || v === "true" || v === 1 || v === "1";
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const startingYardLine = toIntOrNull(body.starting_yard_line);
  const startingSide = body.starting_side === "OWN" || body.starting_side === "OPP" ? body.starting_side : null;
  const startingAbsolute = toIntOrNull(body.starting_absolute_yard);

  const updateRow = {
    score_mine: toInt(body.score_mine, 0),
    score_opponent: toInt(body.score_opponent, 0),
    quarter: body.quarter === null || body.quarter === undefined ? null : toInt(body.quarter, 1),
    starting_down: body.starting_down === null || body.starting_down === undefined ? null : toInt(body.starting_down, 1),
    starting_distance:
      body.starting_distance === null || body.starting_distance === undefined || body.starting_distance === ""
        ? null
        : Math.max(1, toInt(body.starting_distance, 10)),
    is_inches: toBool(body.is_inches),
    starting_side: startingSide,
    starting_yard_line:
      startingYardLine !== null && startingYardLine >= 1 && startingYardLine <= 50 ? startingYardLine : null,
    starting_absolute_yard:
      startingAbsolute !== null && startingAbsolute >= 1 && startingAbsolute <= 99 ? startingAbsolute : null,
    note: typeof body.note === "string" ? body.note : null,
  };

  const { data, error } = await supabase
    .from("drives")
    .update(updateRow)
    .eq("id", id)
    .eq("user_id", user.id)
    .select(
      "id, game_session_id, drive_number, quarter, starting_down, starting_distance, is_inches, starting_absolute_yard, time_remaining, starting_yard_line, starting_side, score_mine, score_opponent, note, created_at",
    )
    .single();

  if (error) {
    console.error("Drive update error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ data });
}

export async function DELETE(_: NextRequest, ctx: Ctx) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const { error } = await supabase.from("drives").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: { ok: true } });
}
