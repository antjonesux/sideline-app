import type { EnginePlay, LiveGameState } from "@/lib/mvp4Types";
import { getRecommendation } from "@/lib/recommendationEngine";
import { getPlaySheetWithPlays } from "@/lib/serverPlaySheets";
import {
  listCoverageAffinities,
  listFieldPositionRules,
} from "@/lib/serverGameSessions";
import { STATIC_COVERAGE_AFFINITIES, STATIC_FIELD_POSITION_RULES } from "@/lib/staticMvp4Rules";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function parseFieldZone(v: string | null): LiveGameState["fieldZone"] {
  const z = (v ?? "").toUpperCase();
  if (
    z === "BACKED_UP" ||
    z === "OWN_TERRITORY" ||
    z === "MIDFIELD" ||
    z === "SCORING" ||
    z === "RED_ZONE" ||
    z === "GOAL_LINE"
  ) {
    return z;
  }
  return "MIDFIELD";
}

function parseDown(v: string | null): LiveGameState["down"] {
  const n = Number(v);
  if (n === 1 || n === 2 || n === 3 || n === 4) return n;
  return 1;
}

function parseDistance(v: string | null): LiveGameState["distanceBucket"] {
  const d = (v ?? "").toUpperCase();
  if (d === "SHORT" || d === "MED" || d === "LONG") return d;
  return "MED";
}

function parseScore(v: string | null): LiveGameState["scoreContext"] {
  const s = (v ?? "").toUpperCase();
  if (s === "UP_BIG" || s === "UP" || s === "CLOSE" || s === "DOWN" || s === "DOWN_BIG") {
    return s;
  }
  return "CLOSE";
}

function parseQuarter(v: string | null): LiveGameState["quarter"] {
  if ((v ?? "").toUpperCase() === "OT") return "OT";
  const n = Number(v);
  if (n === 1 || n === 2 || n === 3 || n === 4) return n;
  return 1;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const play_sheet_id = searchParams.get("play_sheet_id");
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

  const gs: LiveGameState = {
    fieldZone: parseFieldZone(searchParams.get("field_zone")),
    down: parseDown(searchParams.get("down")),
    distanceBucket: parseDistance(searchParams.get("distance_bucket")),
    scoreContext: parseScore(searchParams.get("score_context")),
    quarter: parseQuarter(searchParams.get("quarter")),
    coverageTags: searchParams
      .get("coverage_tags")
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [],
    twoMinuteDrill: searchParams.get("two_minute") === "1",
  };

  const usedIds = new Set(
    searchParams
      .get("used_play_ids")
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [],
  );

  const plays: EnginePlay[] = sheet.plays.map((p) => ({
    id: p.id,
    situation: p.situation,
    formation: p.formation,
    play_name: p.play_name,
    coaching_note: p.coaching_note,
    counter_play: p.counter_play,
    is_featured: p.is_featured,
    is_used: p.is_used || usedIds.has(p.id),
    play_type: p.play_type ?? null,
  }));

  const [fieldRows, covRows] = await Promise.all([
    listFieldPositionRules(),
    listCoverageAffinities(),
  ]);

  const rec = getRecommendation(
    gs,
    plays,
    fieldRows.length ? fieldRows : STATIC_FIELD_POSITION_RULES,
    covRows.length ? covRows : STATIC_COVERAGE_AFFINITIES,
  );

  return NextResponse.json(rec);
}
