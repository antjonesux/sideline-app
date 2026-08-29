import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import {
  fetchPlaybooksWithFormation,
  PUBLIC_PLAYBOOK_API_CACHE_HEADERS,
} from "@/lib/publicPlaybooksServer";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ formationId: string }> };

/** Other CFB27 playbooks that include this formation — no auth. */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { formationId: rawId } = await params;
  let formationName = "";
  try {
    formationName = decodeURIComponent(rawId ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Formation not found" }, { status: 404 });
  }

  if (!formationName) {
    return NextResponse.json({ error: "Formation not found" }, { status: 404 });
  }

  const exclude = req.nextUrl.searchParams.get("exclude")?.trim() ?? null;

  try {
    const data = await fetchPlaybooksWithFormation(formationName, exclude);
    return NextResponse.json({ data }, { headers: PUBLIC_PLAYBOOK_API_CACHE_HEADERS });
  } catch {
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 500 });
  }
}
