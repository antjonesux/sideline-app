import {
  createPlaySheetWithPlays,
  duplicatePlaySheet,
  listPlaySheets,
} from "@/lib/serverPlaySheets";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function clampNote(s: unknown): string | null {
  if (s == null || typeof s !== "string") return null;
  const t = s.trim();
  if (!t) return null;
  return t.slice(0, 100);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const offensive_scheme_id = searchParams.get("offensive_scheme_id");
  const data = await listPlaySheets({
    offensive_scheme_id: offensive_scheme_id || undefined,
  });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  if (typeof b.duplicateFrom === "string" && typeof b.name === "string") {
    const dup = await duplicatePlaySheet(
      b.duplicateFrom,
      b.name.trim() || "Copy",
    );
    if (!dup) {
      return NextResponse.json(
        { error: "Could not duplicate sheet" },
        { status: 400 },
      );
    }
    return NextResponse.json(dup);
  }

  const name = typeof b.name === "string" ? b.name.trim() : "";
  const offensive_scheme_id =
    typeof b.offensive_scheme_id === "string" ? b.offensive_scheme_id : "";
  const defensive_scheme =
    typeof b.defensive_scheme === "string" ? b.defensive_scheme : "";
  const opponent_team =
    typeof b.opponent_team === "string" ? b.opponent_team.trim() : null;

  if (!name || !offensive_scheme_id || !defensive_scheme) {
    return NextResponse.json(
      { error: "name, offensive_scheme_id, and defensive_scheme are required" },
      { status: 400 },
    );
  }

  const playsRaw = b.plays;
  if (!Array.isArray(playsRaw) || playsRaw.length === 0) {
    return NextResponse.json(
      { error: "plays must be a non-empty array" },
      { status: 400 },
    );
  }

  const plays = playsRaw.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      situation: String(r.situation ?? ""),
      situation_order:
        typeof r.situation_order === "number" ? r.situation_order : 0,
      play_order: typeof r.play_order === "number" ? r.play_order : 0,
      formation: String(r.formation ?? ""),
      play_name: String(r.play_name ?? ""),
      coaching_note:
        r.coaching_note == null ? null : String(r.coaching_note),
      counter_formation:
        r.counter_formation == null ? null : String(r.counter_formation),
      counter_play: r.counter_play == null ? null : String(r.counter_play),
      custom_note: clampNote(r.custom_note),
      is_featured: Boolean(r.is_featured),
      is_used: Boolean(r.is_used),
      play_type:
        r.play_type == null || typeof r.play_type !== "string"
          ? null
          : r.play_type.trim() || null,
    };
  });

  const created = await createPlaySheetWithPlays({
    name,
    offensive_scheme_id,
    defensive_scheme,
    opponent_team: opponent_team || null,
    plays,
  });

  if (!created) {
    return NextResponse.json(
      { error: "Could not create play sheet" },
      { status: 500 },
    );
  }

  return NextResponse.json(created);
}
