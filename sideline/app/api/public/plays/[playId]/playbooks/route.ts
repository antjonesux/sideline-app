import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import {
  fetchPlaybooksWithPlay,
  PUBLIC_PLAYBOOK_API_CACHE_HEADERS,
} from "@/lib/publicPlaybooksServer";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ playId: string }> };

/** Other CFB27 playbooks that include this play — no auth. */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { playId: rawId } = await params;
  let playName = "";
  try {
    playName = decodeURIComponent(rawId ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Play not found" }, { status: 404 });
  }

  if (!playName) {
    return NextResponse.json({ error: "Play not found" }, { status: 404 });
  }

  const exclude = req.nextUrl.searchParams.get("exclude")?.trim() ?? null;

  try {
    const data = await fetchPlaybooksWithPlay(playName, exclude);
    return NextResponse.json({ data }, { headers: PUBLIC_PLAYBOOK_API_CACHE_HEADERS });
  } catch {
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 500 });
  }
}
