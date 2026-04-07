import { getSupabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ session: null });
  const { data, error } = await supabase.from("game_sessions").select("*").eq("id", params.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const patch = await req.json();
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: true, localOnly: true });
  const { data, error } = await supabase.from("game_sessions").update(patch).eq("id", params.id).select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}
