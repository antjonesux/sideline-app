import { supabase } from "@/lib/supabase";
import { deriveFieldZone, deriveScenario } from "@/lib/derivePlayContext";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { data, error } = await supabase.from("logged_plays").select("*").eq("drive_id", id).order("play_number", { ascending: true });
  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const payload = await req.json();
  const { count } = await supabase.from("logged_plays").select("*", { count: "exact", head: true }).eq("drive_id", id);

  const fieldZone = deriveFieldZone(Number(payload.yard_line), payload.side as "OWN" | "OPP");
  const scenario = deriveScenario(Number(payload.down), Number(payload.distance), fieldZone);

  const { data, error } = await supabase
    .from("logged_plays")
    .insert({ ...payload, drive_id: id, play_number: (count ?? 0) + 1, field_zone: fieldZone, scenario, yards_gained: Number(payload.yards_gained), down: Number(payload.down), distance: Number(payload.distance), yard_line: Number(payload.yard_line) })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
