import { deletePlayRow, updatePlayRow } from "@/lib/serverPlaySheets";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function clampNote(s: unknown): string | null | undefined {
  if (s === undefined) return undefined;
  if (s == null || typeof s !== "string") return null;
  const t = s.trim();
  if (!t) return null;
  return t.slice(0, 100);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string; playId: string } },
) {
  void params.id;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const r = body as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if (typeof r.formation === "string") patch.formation = r.formation;
  if (typeof r.play_name === "string") patch.play_name = r.play_name;
  if (r.coaching_note !== undefined) {
    patch.coaching_note =
      r.coaching_note == null ? null : String(r.coaching_note);
  }
  if (r.counter_formation !== undefined) {
    patch.counter_formation =
      r.counter_formation == null ? null : String(r.counter_formation);
  }
  if (r.counter_play !== undefined) {
    patch.counter_play =
      r.counter_play == null ? null : String(r.counter_play);
  }
  const cn = clampNote(r.custom_note);
  if (cn !== undefined) patch.custom_note = cn;
  if (typeof r.is_featured === "boolean") patch.is_featured = r.is_featured;
  if (typeof r.is_used === "boolean") patch.is_used = r.is_used;
  if (typeof r.situation_order === "number")
    patch.situation_order = r.situation_order;
  if (typeof r.play_order === "number") patch.play_order = r.play_order;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const updated = await updatePlayRow(params.playId, patch);
  if (!updated) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; playId: string } },
) {
  void params.id;
  const ok = await deletePlayRow(params.playId);
  if (!ok) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
