import { createGameSession } from "@/lib/serverGameSessions";
import { getPlaySheetWithPlays } from "@/lib/serverPlaySheets";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const play_sheet_id =
    typeof b.play_sheet_id === "string" ? b.play_sheet_id : "";
  if (!play_sheet_id) {
    return NextResponse.json(
      { error: "play_sheet_id is required" },
      { status: 400 },
    );
  }

  const sheet = await getPlaySheetWithPlays(play_sheet_id);
  if (!sheet) {
    return NextResponse.json({ error: "Play sheet not found" }, { status: 404 });
  }

  const preRaw = b.pregame as Record<string, unknown> | undefined;
  const pregame =
    preRaw && typeof preRaw === "object"
      ? {
          primary_coverage:
            typeof preRaw.primary_coverage === "string"
              ? preRaw.primary_coverage
              : null,
          blitz_frequency:
            typeof preRaw.blitz_frequency === "string"
              ? preRaw.blitz_frequency
              : null,
          run_stop_tendency:
            typeof preRaw.run_stop_tendency === "string"
              ? preRaw.run_stop_tendency
              : null,
          key_defender:
            typeof preRaw.key_defender === "string"
              ? preRaw.key_defender.slice(0, 40)
              : null,
          game_plan_focus:
            typeof preRaw.game_plan_focus === "string"
              ? preRaw.game_plan_focus.slice(0, 80)
              : null,
        }
      : undefined;

  const created = await createGameSession({
    play_sheet_id,
    offensive_scheme_id: sheet.offensive_scheme_id,
    defensive_scheme: sheet.defensive_scheme,
    opponent_team: sheet.opponent_team,
    pregame,
  });

  if (!created) {
    return NextResponse.json(
      { error: "Could not create session", localOnly: true },
      { status: 503 },
    );
  }

  return NextResponse.json(created);
}
