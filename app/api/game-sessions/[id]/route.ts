import {
  aggregateSessionStats,
  getGameSession,
  updateGameSession,
} from "@/lib/serverGameSessions";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getGameSession(params.id);
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const stats = await aggregateSessionStats(params.id);
  return NextResponse.json({ session, stats });
}

export async function PUT(
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
  const patch: Parameters<typeof updateGameSession>[1] = {};

  if (r.ended === true) patch.ended_at = new Date().toISOString();
  if (typeof r.result === "string" && (r.result === "W" || r.result === "L"))
    patch.result = r.result;
  if (typeof r.score === "string") patch.score = r.score.slice(0, 32);
  if (typeof r.what_worked === "string")
    patch.what_worked = r.what_worked.slice(0, 150);
  if (typeof r.what_to_adjust === "string")
    patch.what_to_adjust = r.what_to_adjust.slice(0, 150);
  if (typeof r.rating === "number" && r.rating >= 1 && r.rating <= 5)
    patch.rating = r.rating;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const updated = await updateGameSession(params.id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json(updated);
}
