import { getPlaySheetWithPlays, insertPlayRow } from "@/lib/serverPlaySheets";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function clampNote(s: unknown): string | null {
  if (s == null || typeof s !== "string") return null;
  const t = s.trim();
  if (!t) return null;
  return t.slice(0, 100);
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const sheet = await getPlaySheetWithPlays(params.id);
  if (!sheet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(sheet.plays);
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

  const row = {
    play_sheet_id: params.id,
    situation: String(r.situation ?? ""),
    situation_order:
      typeof r.situation_order === "number" ? r.situation_order : 0,
    play_order: typeof r.play_order === "number" ? r.play_order : 0,
    formation: String(r.formation ?? ""),
    play_name: String(r.play_name ?? ""),
    coaching_note: r.coaching_note == null ? null : String(r.coaching_note),
    counter_formation:
      r.counter_formation == null ? null : String(r.counter_formation),
    counter_play: r.counter_play == null ? null : String(r.counter_play),
    custom_note: clampNote(r.custom_note),
    is_featured: Boolean(r.is_featured),
    is_used: Boolean(r.is_used),
  };

  if (!row.situation || !row.formation || !row.play_name) {
    return NextResponse.json(
      { error: "situation, formation, and play_name are required" },
      { status: 400 },
    );
  }

  const created = await insertPlayRow(row);
  if (!created) {
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }
  return NextResponse.json(created);
}
