import { COULDNT_FINISH_THAT, COULDNT_FIND_THAT } from "@/lib/coachCopy";
import {
  parseYardLineField,
  validateAllRows,
  type CsvRowInput,
  type ParsedCsvRow,
  type ValidatedImportPlay,
} from "@/lib/importCsv";
import { deriveFieldZone, deriveScenario } from "@/lib/derivePlayContext";
import { loadCfbPlayTypeMapForPlaybooks, playbookForGame, storedPlayTypeFromMap, type GameRow } from "@/lib/playTypeResolution";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePlayName } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";

type GamePayload = {
  my_team: string;
  opponent_team: string;
  offensive_playbook: string;
  result: "W" | "L";
  my_score: number;
  opponent_score: number;
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
    play_name: normalizePlayName(p.play_name),
    result: p.result,
    yards: String(p.yards),
    score_context: p.score_context,
    note: p.note ?? "",
    zone: p.zone ?? "",
  };
}

function remapPlaysToNewDriveNumbers(plays: ValidatedImportPlay[], maxExistingDrive: number): ValidatedImportPlay[] {
  const sorted = [...plays].sort((a, b) => a.play_number - b.play_number);
  const distinctDriveNums = [...new Set(sorted.map((p) => p.drive_number))].sort((a, b) => a - b);
  const map = new Map<number, number>();
  distinctDriveNums.forEach((d, i) => map.set(d, maxExistingDrive + i + 1));
  return sorted.map((p) => ({ ...p, drive_number: map.get(p.drive_number)! }));
}

async function insertDrivesAndPlaysForSession(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  opponentScheme: string,
  plays: ValidatedImportPlay[],
  opts: { rollbackSessionOnFailure: boolean },
): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const { data: sessionRow } = await supabase
    .from("game_sessions")
    .select("offensive_playbook, my_playbook")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  const offensivePb = sessionRow ? playbookForGame(sessionRow as GameRow) : "";
  const typeMap = await loadCfbPlayTypeMapForPlaybooks(supabase, offensivePb ? [offensivePb] : []);

  const sorted = [...plays].sort((a, b) => a.play_number - b.play_number);
  const driveNums = [...new Set(sorted.map((p) => p.drive_number))].sort((a, b) => a - b);
  const driveIdByNum = new Map<number, string>();
  const createdDriveIds: string[] = [];

  for (const driveNum of driveNums) {
    const first = sorted.filter((p) => p.drive_number === driveNum).sort((a, b) => a.play_number - b.play_number)[0];
    const quarter = first.quarter >= 5 ? 5 : first.quarter;
    const { data: driveRow, error: driveErr } = await supabase
      .from("drives")
      .insert({
        user_id: userId,
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
      if (opts.rollbackSessionOnFailure) {
        await supabase.from("game_sessions").delete().eq("id", sessionId);
      } else if (createdDriveIds.length) {
        await supabase.from("drives").delete().in("id", createdDriveIds);
      }
      return { ok: false, message: COULDNT_FINISH_THAT, status: 500 };
    }
    const id = driveRow.id as string;
    createdDriveIds.push(id);
    driveIdByNum.set(driveNum, id);
  }

  for (const driveNum of driveNums) {
    const drivePlays = sorted.filter((p) => p.drive_number === driveNum).sort((a, b) => a.play_number - b.play_number);
    const driveId = driveIdByNum.get(driveNum)!;
    let idx = 0;
    for (const p of drivePlays) {
      idx += 1;
      const pos = parseYardLineField(p.yard_line);
      if (!pos) {
        if (opts.rollbackSessionOnFailure) {
          await supabase.from("game_sessions").delete().eq("id", sessionId);
        } else if (createdDriveIds.length) {
          await supabase.from("drives").delete().in("id", createdDriveIds);
        }
        return { ok: false, message: "Invalid yard line in play", status: 400 };
      }

      const field_zone = deriveFieldZone(pos.yard_line, pos.side);
      const scenario = p.distance_goal_to_go_alias ? "Goal Line" : deriveScenario(p.down, p.distance, field_zone);

      const play_name = normalizePlayName(p.play_name);
      const play_type = storedPlayTypeFromMap(offensivePb, p.formation, play_name, typeMap, null);
      const { error: playErr } = await supabase.from("logged_plays").insert({
        user_id: userId,
        drive_id: driveId,
        game_session_id: sessionId,
        play_number: idx,
        down: p.down,
        distance: p.distance,
        yard_line: pos.yard_line,
        side: pos.side,
        hash: p.hash ?? "MIDDLE",
        field_zone,
        scenario,
        formation: p.formation,
        play_name,
        result_tag: p.result_db,
        yards_gained: p.yards,
        note: p.note,
        opponent_scheme: opponentScheme,
        drive_number: p.drive_number,
        play_type,
      });

      if (playErr) {
        console.error("import execute play:", playErr);
        if (opts.rollbackSessionOnFailure) {
          await supabase.from("game_sessions").delete().eq("id", sessionId);
        } else if (createdDriveIds.length) {
          await supabase.from("drives").delete().in("id", createdDriveIds);
        }
        return { ok: false, message: COULDNT_FINISH_THAT, status: 500 };
      }
    }
  }

  return { ok: true };
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { game?: GamePayload; plays?: ValidatedImportPlay[]; game_session_id?: string }
    | null;

  const playsIn = body?.plays;
  if (!Array.isArray(playsIn) || playsIn.length === 0) {
    return NextResponse.json({ error: "Expected non-empty plays[]" }, { status: 400 });
  }

  const existingSessionId = typeof body?.game_session_id === "string" ? body.game_session_id.trim() : "";

  if (existingSessionId) {
    const { data: session, error: sessErr } = await supabase.from("game_sessions").select("*").eq("id", existingSessionId).eq("user_id", user.id).single();
    if (sessErr || !session) {
      if (sessErr) console.error("import execute session lookup:", sessErr);
      return NextResponse.json({ error: COULDNT_FIND_THAT }, { status: 404 });
    }

    const parsed: ParsedCsvRow[] = playsIn.map((p, i) => ({
      ...playToRowInput(p),
      _line: i + 2,
    }));
    const { valid_rows, errors } = validateAllRows(parsed);
    if (errors.length > 0 || valid_rows.length !== playsIn.length) {
      return NextResponse.json({ error: "Server validation failed", errors }, { status: 400 });
    }

    const { data: maxDriveRow } = await supabase
      .from("drives")
      .select("drive_number")
      .eq("game_session_id", existingSessionId)
      .eq("user_id", user.id)
      .order("drive_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const maxDrive = typeof maxDriveRow?.drive_number === "number" ? maxDriveRow.drive_number : 0;
    const remapped = remapPlaysToNewDriveNumbers(valid_rows, maxDrive);
    const opponentScheme = String(session.opponent_scheme ?? "UNKNOWN").trim() || "UNKNOWN";

    const inserted = await insertDrivesAndPlaysForSession(supabase, user.id, existingSessionId, opponentScheme, remapped, {
      rollbackSessionOnFailure: false,
    });
    if (!inserted.ok) {
      return NextResponse.json({ error: inserted.message }, { status: inserted.status });
    }

    return NextResponse.json({
      session_id: existingSessionId,
      plays_imported: playsIn.length,
    });
  }

  const game = body?.game;
  if (!game) {
    return NextResponse.json({ error: "Expected game and non-empty plays[], or game_session_id with plays[]" }, { status: 400 });
  }
  const plays = playsIn;
  if (!game.offensive_playbook?.trim()) {
    return NextResponse.json({ error: "offensive_playbook is required" }, { status: 400 });
  }
  if (!game.my_team?.trim() || !game.opponent_team?.trim()) {
    return NextResponse.json({ error: "my_team and opponent_team are required" }, { status: 400 });
  }

  const parsed: ParsedCsvRow[] = plays.map((p, i) => ({
    ...playToRowInput(p),
    _line: i + 2,
  }));

  const { valid_rows, errors } = validateAllRows(parsed);
  if (errors.length > 0 || valid_rows.length !== plays.length) {
    return NextResponse.json({ error: "Server validation failed", errors }, { status: 400 });
  }

  const my_score = Number.isFinite(game.my_score) ? game.my_score : 0;
  const opponent_score = Number.isFinite(game.opponent_score) ? game.opponent_score : 0;
  const game_date = new Date().toISOString().slice(0, 10);

  const [mySchemeRes, oppSchemeRes] = await Promise.all([
    supabase.from("team_offensive_playbooks").select("scheme_style").eq("team_name", game.my_team.trim()).single(),
    supabase.from("team_defensive_schemes").select("defensive_scheme").eq("team_name", game.opponent_team.trim()).single(),
  ]);

  const myScheme = mySchemeRes.data?.scheme_style?.trim() || "UNKNOWN";
  const opponentScheme = oppSchemeRes.data?.defensive_scheme?.trim() || "UNKNOWN";

  const { data: session, error: sessionErr } = await supabase
    .from("game_sessions")
    .insert({
      user_id: user.id,
      my_playbook: game.my_team,
      my_scheme: myScheme,
      offensive_playbook: game.offensive_playbook.trim(),
      opponent_team: game.opponent_team,
      opponent_scheme: opponentScheme,
      game_date,
      my_score,
      opponent_score,
      result: game.result,
      quarter_started_logging: 1,
      is_partial_log: false,
      import_source: "csv",
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (sessionErr || !session?.id) {
    console.error("import execute session:", sessionErr);
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 500 });
  }

  const sessionId = session.id as string;
  const inserted = await insertDrivesAndPlaysForSession(supabase, user.id, sessionId, opponentScheme, valid_rows, { rollbackSessionOnFailure: true });
  if (!inserted.ok) {
    return NextResponse.json({ error: inserted.message }, { status: inserted.status });
  }

  return NextResponse.json({
    session_id: sessionId,
    plays_imported: plays.length,
  });
}
