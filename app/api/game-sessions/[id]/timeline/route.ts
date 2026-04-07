import {
  insertTimelineEvent,
  listTimelineEvents,
} from "@/lib/serverGameSessions";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const events = await listTimelineEvents(params.id);
  return NextResponse.json(events);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const r = body as Record<string, unknown>;

  const event_type =
    typeof r.event_type === "string" ? r.event_type : "note";
  if (!["play_used", "coverage_tag", "note"].includes(event_type)) {
    return NextResponse.json({ error: "Invalid event_type" }, { status: 400 });
  }

  const row = {
    game_session_id: params.id,
    quarter: typeof r.quarter === "number" ? r.quarter : null,
    is_ot: Boolean(r.is_ot),
    field_zone: typeof r.field_zone === "string" ? r.field_zone : null,
    down: typeof r.down === "number" ? r.down : null,
    distance_bucket:
      typeof r.distance_bucket === "string" ? r.distance_bucket : null,
    score_context:
      typeof r.score_context === "string" ? r.score_context : null,
    coverage_tags: Array.isArray(r.coverage_tags)
      ? (r.coverage_tags as unknown[]).map(String)
      : null,
    play_called_formation:
      typeof r.play_called_formation === "string"
        ? r.play_called_formation
        : null,
    play_called_name:
      typeof r.play_called_name === "string" ? r.play_called_name : null,
    marked_used: Boolean(r.marked_used),
    quick_note:
      typeof r.quick_note === "string" ? r.quick_note.slice(0, 60) : null,
    event_type,
  };

  const created = await insertTimelineEvent(row);
  if (!created) {
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }
  return NextResponse.json(created);
}
