import {
  parseFinalScore,
  parseYardLineField,
  validateAllRows,
  type CsvRowInput,
  type ParsedCsvRow,
  type ValidatedImportPlay,
} from "@/lib/importCsv";
import { deriveFieldZone, deriveScenario } from "@/lib/derivePlayContext";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

type GamePayload = {
  offensive_team: string;
  offensive_scheme: string;
  opponent_team: string;
  opponent_defensive_scheme: string;
  final_score: string;
  result: "W" | "L";
};

function playToRowInput(p: ValidatedImportPlay): CsvRowInput {
  return {
    drive_number: String(p.drive_number),
    play_number: String(p.play_number),
    quarter: p.quarter >= 5 ? "OT" : String(p.quarter),
    down: String(p.down),
    distance: String(p.distance),
    yard_line: p.yard_line,
    formation: p.formation,
    play_name: p.play_name,
    result: p.result,
    yards: String(p.yards),
    score_context: p.score_context,
    note: p.note ?? "",
  };
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { game?: GamePayload; plays?: ValidatedImportPlay[] } | null;
  const game = body?.game;
  const plays = body?.plays;
  if (!game || !Array.isArray(plays) || plays.length === 0) {
    return NextResponse.json({ error: "Expected game and non-empty plays[]" }, { status: 400 });
  }

  const parsed: ParsedCsvRow[] = plays.map((p, i) => ({
    ...playToRowInput(p),
    _line: i + 2,
  }));

  const { valid_rows, errors } = validateAllRows(parsed);
  if (errors.length > 0 || valid_rows.length !== plays.length) {
    return NextResponse.json({ error: "Server validation failed", errors }, { status: 400 });
  }

  const scores = parseFinalScore(game.final_score);
  const my_score = scores?.my_score ?? 0;
  const opponent_score = scores?.opponent_score ?? 0;
  const game_date = new Date().toISOString().slice(0, 10);

  const { data: session, error: sessionErr } = await supabase
    .from("game_sessions")
    .insert({
      my_playbook: game.offensive_team,
      my_scheme: game.offensive_scheme,
      opponent_team: game.opponent_team,
      opponent_scheme: game.opponent_defensive_scheme,
      game_date,
      my_score,
      opponent_score,
      result: game.result,
      quarter_started_logging: 1,
      is_partial_log: false,
      import_source: "csv",
    })
    .select("id")
    .single();

  if (sessionErr || !session?.id) {
    console.error("import execute session:", sessionErr);
    return NextResponse.json({ error: sessionErr?.message ?? "Could not create session" }, { status: 500 });
  }

  const sessionId = session.id as string;
  const sorted = [...plays].sort((a, b) => a.play_number - b.play_number);
  const driveNums = [...new Set(sorted.map((p) => p.drive_number))].sort((a, b) => a - b);
  const driveIdByNum = new Map<number, string>();

  for (const driveNum of driveNums) {
    const first = sorted.filter((p) => p.drive_number === driveNum).sort((a, b) => a.play_number - b.play_number)[0];
    const quarter = first.quarter >= 5 ? 5 : first.quarter;
    const { data: driveRow, error: driveErr } = await supabase
      .from("drives")
      .insert({
        game_session_id: sessionId,
        drive_number: driveNum,
        quarter,
        score_mine: 0,
        score_opponent: 0,
      })
      .select("id")
      .single();

    if (driveErr || !driveRow?.id) {
      console.error("import execute drive:", driveErr);
      await supabase.from("game_sessions").delete().eq("id", sessionId);
      return NextResponse.json({ error: driveErr?.message ?? "Could not create drive" }, { status: 500 });
    }
    driveIdByNum.set(driveNum, driveRow.id as string);
  }

  for (const driveNum of driveNums) {
    const drivePlays = sorted.filter((p) => p.drive_number === driveNum).sort((a, b) => a.play_number - b.play_number);
    const driveId = driveIdByNum.get(driveNum)!;
    let idx = 0;
    for (const p of drivePlays) {
      idx += 1;
      const pos = parseYardLineField(p.yard_line);
      if (!pos) {
        await supabase.from("game_sessions").delete().eq("id", sessionId);
        return NextResponse.json({ error: "Invalid yard line in play" }, { status: 400 });
      }

      const field_zone = deriveFieldZone(pos.yard_line, pos.side);
      const scenario = deriveScenario(p.down, p.distance, field_zone);

      const { error: playErr } = await supabase.from("logged_plays").insert({
        drive_id: driveId,
        game_session_id: sessionId,
        play_number: idx,
        down: p.down,
        distance: p.distance,
        yard_line: pos.yard_line,
        side: pos.side,
        hash: "MIDDLE",
        field_zone,
        scenario,
        formation: p.formation,
        play_name: p.play_name,
        result_tag: p.result_db,
        yards_gained: p.yards,
        note: p.note,
        opponent_scheme: game.opponent_defensive_scheme,
        drive_number: p.drive_number,
      });

      if (playErr) {
        console.error("import execute play:", playErr);
        await supabase.from("game_sessions").delete().eq("id", sessionId);
        return NextResponse.json({ error: playErr.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({
    session_id: sessionId,
    plays_imported: plays.length,
  });
}
