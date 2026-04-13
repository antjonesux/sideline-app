import { supabase } from "@/lib/supabase";
import { deriveFieldZone, deriveScenario } from "@/lib/derivePlayContext";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const payload = await req.json();
  const fieldZone = deriveFieldZone(Number(payload.yard_line), payload.side as "OWN" | "OPP");
  const scenario = deriveScenario(Number(payload.down), Number(payload.distance), fieldZone);

  const { data, error } = await supabase
    .from("logged_plays")
    .update({
      ...payload,
      yards_gained: Number(payload.yards_gained),
      down: Number(payload.down),
      distance: Number(payload.distance),
      yard_line: Number(payload.yard_line),
      field_zone: fieldZone,
      scenario,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(_: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { error } = await supabase.from("logged_plays").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
