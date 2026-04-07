import { getSupabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: true, localOnly: true, session: body });
  const { data, error } = await supabase.from("game_sessions").insert(body).select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data ?? body });
}

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ sessions: [] });
  const { data, error } = await supabase.from("game_sessions").select("*").order("started_at", { ascending: false }).limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data ?? [] });
}
