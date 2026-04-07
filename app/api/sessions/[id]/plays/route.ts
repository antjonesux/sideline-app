import { getSupabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: true, localOnly: true, trackedPlay: body });
  const { data, error } = await supabase.from("tracked_plays").insert(body).select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ trackedPlay: data ?? body });
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ plays: [] });
  const { data, error } = await supabase.from("tracked_plays").select("*").eq("game_session_id", params.id).order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plays: data ?? [] });
}
