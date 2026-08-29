import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import { parseCatalogSideOfBall } from "@/lib/constants";
import {
  fetchPublicPlayDetail,
  PUBLIC_PLAYBOOK_API_CACHE_HEADERS,
} from "@/lib/publicPlaybooksServer";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ playbookId: string; formationId: string; playId: string }>;
};

/** Public CFB27 play detail — no auth. */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { playbookId: rawPlaybook, formationId: rawFormation, playId: rawPlay } = await params;
  let playbookName = "";
  let formationName = "";
  let playName = "";
  try {
    playbookName = decodeURIComponent(rawPlaybook ?? "").trim();
    formationName = decodeURIComponent(rawFormation ?? "").trim();
    playName = decodeURIComponent(rawPlay ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Play not found" }, { status: 404 });
  }

  if (!playbookName || !formationName || !playName) {
    return NextResponse.json({ error: "Play not found" }, { status: 404 });
  }

  const preferredSide = parseCatalogSideOfBall(req.nextUrl.searchParams.get("side"));

  try {
    const data = await fetchPublicPlayDetail(playbookName, formationName, playName, preferredSide);
    if (!data) {
      return NextResponse.json({ error: "Play not found" }, { status: 404 });
    }
    return NextResponse.json({ data }, { headers: PUBLIC_PLAYBOOK_API_CACHE_HEADERS });
  } catch {
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 500 });
  }
}
