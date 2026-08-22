import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import { GAME_SESSION_IMPORT_SOURCE_ONBOARDING } from "@/lib/onboardingImportSource";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: games, error } = await supabase
    .from("game_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("game_date", { ascending: false });
  if (error) return NextResponse.json([], { status: 200 });

  const enriched = await Promise.all(
    (games ?? []).map(async (game) => {
      const [{ count: drive_count }, { count: play_count }] = await Promise.all([
        supabase.from("drives").select("*", { count: "exact", head: true }).eq("game_session_id", game.id).eq("user_id", user.id),
        supabase.from("logged_plays").select("*", { count: "exact", head: true }).eq("game_session_id", game.id).eq("user_id", user.id),
      ]);
      return { ...game, drive_count: drive_count ?? 0, play_count: play_count ?? 0 };
    }),
  );

  return NextResponse.json(enriched);
}

type GameSessionInsert = {
  user_id: string;
  my_playbook: string;
  my_scheme: string;
  offensive_playbook: string;
  opponent_team: string;
  opponent_scheme: string;
  game_date: string;
  my_score: number;
  opponent_score: number;
  result: "W" | "L";
  import_source: "live" | "csv" | typeof GAME_SESSION_IMPORT_SOURCE_ONBOARDING;
  quarter_started_logging?: number;
  play_sheet_id?: string | null;
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const startedAtIso = new Date().toISOString();
  const gameDate = startedAtIso.slice(0, 10);

  const offensivePlaybook =
    typeof body.offensive_playbook === "string" && body.offensive_playbook.trim().length > 0
      ? body.offensive_playbook.trim()
      : typeof body.my_playbook === "string"
        ? body.my_playbook.trim()
        : "";

  const wantsOnboarding =
    body.import_source === GAME_SESSION_IMPORT_SOURCE_ONBOARDING ||
    body.guided_onboarding_session === true;

  const insertPayload: GameSessionInsert = {
    user_id: user.id,
    my_playbook: String(body.my_playbook ?? "").trim(),
    my_scheme: String(body.my_scheme ?? "").trim(),
    offensive_playbook: offensivePlaybook,
    opponent_team: String(body.opponent_team ?? "").trim(),
    opponent_scheme:
      typeof body.opponent_scheme === "string" ? body.opponent_scheme.trim() : "",
    game_date: typeof body.game_date === "string" && body.game_date.trim() ? body.game_date.trim() : gameDate,
    my_score: Number.isFinite(Number(body.my_score)) ? Number(body.my_score) : 0,
    opponent_score: Number.isFinite(Number(body.opponent_score)) ? Number(body.opponent_score) : 0,
    result: body.result === "L" ? "L" : "W",
    import_source: wantsOnboarding ? GAME_SESSION_IMPORT_SOURCE_ONBOARDING : "live",
  };

  const q = body.quarter_started_logging;
  if (q === 1 || q === 2 || q === 3 || q === 4) {
    insertPayload.quarter_started_logging = q;
  }

  const rawSheetId = typeof body.play_sheet_id === "string" ? body.play_sheet_id.trim() : "";
  if (rawSheetId) {
    const { data: sheet } = await supabase
      .from("play_sheets")
      .select("id, cfb26_playbook, playbook")
      .eq("id", rawSheetId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!sheet) {
      return NextResponse.json({ error: "Play sheet not found" }, { status: 400 });
    }
    const sheetPb = (sheet.cfb26_playbook ?? sheet.playbook ?? "").trim().toLowerCase();
    if (sheetPb !== offensivePlaybook.toLowerCase()) {
      return NextResponse.json({ error: "Play sheet does not match the selected playbook" }, { status: 400 });
    }
    insertPayload.play_sheet_id = sheet.id;
  }

  const { data, error } = await supabase.from("game_sessions").insert(insertPayload).select().single();

  if (error) {
    console.error("Game insert error:", error);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 500 });
  }

  return NextResponse.json(data);
}
