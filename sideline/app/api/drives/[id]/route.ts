import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const payload = await req.json();
  const { data, error } = await supabase.from("drives").update(payload).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(_: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { error } = await supabase.from("drives").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
