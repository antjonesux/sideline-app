import {
  deletePlaySheet,
  getPlaySheetWithPlays,
  updatePlaySheetMeta,
} from "@/lib/serverPlaySheets";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const sheet = await getPlaySheetWithPlays(params.id);
  if (!sheet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(sheet);
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
  const b = body as Record<string, unknown>;
  const patch: { name?: string; opponent_team?: string | null } = {};
  if (typeof b.name === "string") patch.name = b.name.trim();
  if (b.opponent_team === null) patch.opponent_team = null;
  else if (typeof b.opponent_team === "string")
    patch.opponent_team = b.opponent_team.trim();

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const ok = await updatePlaySheetMeta(params.id, patch);
  if (!ok) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  const sheet = await getPlaySheetWithPlays(params.id);
  return NextResponse.json(sheet);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const ok = await deletePlaySheet(params.id);
  if (!ok) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
