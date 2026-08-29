import { COULDNT_FINISH_THAT } from "@/lib/coachCopy";
import { parseCatalogSideOfBall } from "@/lib/constants";
import {
  fetchPublicFormationPlays,
  PUBLIC_PLAYBOOK_API_CACHE_HEADERS,
} from "@/lib/publicPlaybooksServer";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ playbookId: string; formationId: string }> };

/** Public CFB27 plays in a formation — no auth. */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { playbookId: rawPlaybook, formationId: rawFormation } = await params;
  let playbookName = "";
  let formationName = "";
  try {
    playbookName = decodeURIComponent(rawPlaybook ?? "").trim();
    formationName = decodeURIComponent(rawFormation ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Formation not found" }, { status: 404 });
  }

  if (!playbookName || !formationName) {
    return NextResponse.json({ error: "Formation not found" }, { status: 404 });
  }

  const preferredSide = parseCatalogSideOfBall(req.nextUrl.searchParams.get("side"));

  try {
    const data = await fetchPublicFormationPlays(playbookName, formationName, preferredSide);
    if (!data) {
      return NextResponse.json({ error: "Formation not found" }, { status: 404 });
    }
    return NextResponse.json({ data }, { headers: PUBLIC_PLAYBOOK_API_CACHE_HEADERS });
  } catch {
    return NextResponse.json({ error: COULDNT_FINISH_THAT }, { status: 500 });
  }
}
