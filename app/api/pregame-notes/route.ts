import {
  getPregameForSession,
  upsertPregameForSession,
} from "@/lib/serverGameSessions";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("game_session_id");
  if (!sessionId) {
    return NextResponse.json(
      { error: "game_session_id required" },
      { status: 400 },
    );
  }
  const row = await getPregameForSession(sessionId);
  return NextResponse.json(row ?? {});
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const r = body as Record<string, unknown>;
  const sessionId =
    typeof r.game_session_id === "string" ? r.game_session_id : "";
  if (!sessionId) {
    return NextResponse.json(
      { error: "game_session_id required" },
      { status: 400 },
    );
  }

  const updated = await upsertPregameForSession(sessionId, {
    primary_coverage:
      typeof r.primary_coverage === "string" ? r.primary_coverage : null,
    blitz_frequency:
      typeof r.blitz_frequency === "string" ? r.blitz_frequency : null,
    run_stop_tendency:
      typeof r.run_stop_tendency === "string" ? r.run_stop_tendency : null,
    key_defender:
      typeof r.key_defender === "string"
        ? r.key_defender.slice(0, 40)
        : null,
    game_plan_focus:
      typeof r.game_plan_focus === "string"
        ? r.game_plan_focus.slice(0, 80)
        : null,
  });

  if (!updated) {
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
  return NextResponse.json(updated);
}
