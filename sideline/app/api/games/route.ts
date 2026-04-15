import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { persistSession: false },
});

export async function GET() {
  const { data: games, error } = await supabase.from("game_sessions").select("*").order("game_date", { ascending: false });
  if (error) return NextResponse.json([], { status: 200 });

  const enriched = await Promise.all(
    (games ?? []).map(async (game) => {
      const [{ count: drive_count }, { count: play_count }] = await Promise.all([
        supabase.from("drives").select("*", { count: "exact", head: true }).eq("game_session_id", game.id),
        supabase.from("logged_plays").select("*", { count: "exact", head: true }).eq("game_session_id", game.id),
      ]);
      return { ...game, drive_count: drive_count ?? 0, play_count: play_count ?? 0 };
    }),
  );

  return NextResponse.json(enriched);
}

type GameSessionInsert = {
  my_playbook: string;
  my_scheme: string;
  offensive_playbook: string;
  opponent_team: string;
  opponent_scheme: string;
  game_date: string;
  my_score: number;
  opponent_score: number;
  result: "W" | "L";
  import_source: "live";
  quarter_started_logging?: number;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Record<string, unknown>;
  const startedAtIso = new Date().toISOString();
  const gameDate = startedAtIso.slice(0, 10);

  const offensivePlaybook =
    typeof body.offensive_playbook === "string" && body.offensive_playbook.trim().length > 0
      ? body.offensive_playbook.trim()
      : typeof body.my_playbook === "string"
        ? body.my_playbook.trim()
        : "";

  const insertPayload: GameSessionInsert = {
    my_playbook: String(body.my_playbook ?? "").trim(),
    my_scheme: String(body.my_scheme ?? "").trim(),
    offensive_playbook: offensivePlaybook,
    opponent_team: String(body.opponent_team ?? "").trim(),
    opponent_scheme: String(body.opponent_scheme ?? "").trim(),
    game_date: typeof body.game_date === "string" && body.game_date.trim() ? body.game_date.trim() : gameDate,
    my_score: Number.isFinite(Number(body.my_score)) ? Number(body.my_score) : 0,
    opponent_score: Number.isFinite(Number(body.opponent_score)) ? Number(body.opponent_score) : 0,
    result: body.result === "L" ? "L" : "W",
    import_source: "live",
  };

  const q = body.quarter_started_logging;
  if (q === 1 || q === 2 || q === 3 || q === 4) {
    insertPayload.quarter_started_logging = q;
  }

  const { data, error } = await supabase.from("game_sessions").insert(insertPayload).select().single();

  if (error) {
    console.error("Game insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
